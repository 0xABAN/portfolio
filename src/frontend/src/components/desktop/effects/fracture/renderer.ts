import { MAX_SEGMENTS } from "./cracks";
import { CANDIDATE_FRAGMENT, CELL, DAMAGE_FRAGMENT, FULLSCREEN_VERTEX, LIST_WIDTH, SCREEN_FRAGMENT, TILE_CELLS } from "./shaders";
import { createTileBinner } from "./tiles";

/** The shaders work in CSS px, so a smaller backing store only softens edges. */
const MAX_DENSITY = 1.5;
const MAX_PIXELS = 3_000_000;
/** Each texture keeps its own texture unit, so the samplers are connected once. */
const UNIT = { segments: 0, candidates: 1, tiles: 2, list: 3, damage: 4 };

export type FractureRenderer = Awaited<ReturnType<typeof createFractureRenderer>>;

/**
 * Each frame takes two full-screen passes: a small one finds the cracks that
 * matter around each 8px cell, checking only the segments the CPU has listed
 * for its tile, then the canvas measures every pixel against only those
 * cracks. Display damage, which holds still between glitch bursts, is drawn
 * into a texture of its own only when the burst or the size changes.
 *
 * Resolves once the shaders are linked and the GPU has drawn a 1px frame with
 * them, so the first real frame does not wait for compilation. Asking for a
 * result early would stall the main thread until the GPU caught up, so it
 * polls once per animation frame instead: KHR_parallel_shader_compile for the
 * programs, a fence for the frame. Browsers without that extension block on
 * the link check.
 *
 * `software` is true when the browser can only run WebGL without a GPU.
 */
export async function createFractureRenderer(canvas: HTMLCanvasElement) {
	const attributes: WebGLContextAttributes = {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
		powerPreference: "low-power",
	};
	// With this flag, browsers refuse a context that would render in software.
	const accelerated = canvas.getContext("webgl2", { ...attributes, failIfMajorPerformanceCaveat: true });
	const software = !accelerated;
	const context = accelerated ?? canvas.getContext("webgl2", attributes);
	if (!context) throw new Error("WebGL2 is unavailable");
	// A non-null binding that the helpers below can rely on.
	const gl: WebGL2RenderingContext = context;
	// Clear any flag left by a lost context, so the warm-up check only sees our own errors.
	gl.getError();

	const programs: WebGLProgram[] = [];
	const segmentTexture = gl.createTexture();
	const tileTexture = gl.createTexture();
	const listTexture = gl.createTexture();
	const candidateTexture = gl.createTexture();
	const candidateFramebuffer = gl.createFramebuffer();
	const damageTexture = gl.createTexture();
	const damageFramebuffer = gl.createFramebuffer();
	const binSegments = createTileBinner();
	/** Burst and seed the damage texture shows; NaN until it is drawn for the current size. */
	const damageGlitch = new Float32Array([NaN, NaN]);
	/** Rows the id list texture has room for. */
	let listRows = 0;
	let width = 1;
	let height = 1;
	let scale = 1;
	let columns = 1;
	let rows = 1;
	let disposed = false;

	function dispose() {
		if (disposed) return;
		disposed = true;
		for (const program of programs) gl.deleteProgram(program);
		gl.deleteTexture(segmentTexture);
		gl.deleteTexture(tileTexture);
		gl.deleteTexture(listTexture);
		gl.deleteTexture(candidateTexture);
		gl.deleteFramebuffer(candidateFramebuffer);
		gl.deleteTexture(damageTexture);
		gl.deleteFramebuffer(damageFramebuffer);
	}

	/** Starts compiling and linking; `check` reads the outcome once the GPU is done. */
	function build(fragment: string) {
		const program = gl.createProgram();
		if (!program) throw new Error("Could not allocate a fracture program");
		programs.push(program);

		const shaders = ([[gl.VERTEX_SHADER, FULLSCREEN_VERTEX], [gl.FRAGMENT_SHADER, fragment]] as const).map(([type, source]) => {
			const shader = gl.createShader(type);
			if (!shader) throw new Error("Could not allocate a fracture shader");
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			gl.attachShader(program, shader);
			return shader;
		});
		gl.linkProgram(program);
		return { program, shaders };
	}

	function check({ program, shaders }: ReturnType<typeof build>) {
		const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
		const log = shaders.map((shader) => gl.getShaderInfoLog(shader)).join("\n").trim() || gl.getProgramInfoLog(program);
		// The linked program keeps its compiled code; the shader objects are no longer needed.
		for (const shader of shaders) {
			gl.detachShader(program, shader);
			gl.deleteShader(shader);
		}
		if (!linked) throw new Error(`Fracture shader failed to link: ${log}`);
		return program;
	}

	/** Resolves once the GPU has run every command issued so far, polling once per animation frame. */
	async function finish() {
		const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
		if (!fence) throw new Error("Could not create a fracture fence");
		gl.flush();
		await until(() => gl.getSyncParameter(fence, gl.SYNC_STATUS) === gl.SIGNALED);
		gl.deleteSync(fence);
	}

	/** Resolves on the first animation frame where `done` holds. */
	function until(done: () => boolean) {
		return new Promise<void>((resolve, reject) => {
			const poll = () => {
				try {
					if (gl.isContextLost()) throw new Error("The WebGL context was lost while the fracture was being prepared");
					if (done()) resolve();
					else requestAnimationFrame(poll);
				} catch (error) {
					reject(error);
				}
			};
			poll();
		});
	}

	function locate<Name extends string>(program: WebGLProgram, names: readonly Name[]) {
		return Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)])) as Record<Name, WebGLUniformLocation | null>;
	}

	/** Binds `texture` to its unit and leaves that unit active, for uploads; nothing else is ever bound there. */
	function bind(texture: WebGLTexture, unit: number) {
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, texture);
	}

	/** Every texture is read texel by texel. */
	function configure(texture: WebGLTexture, unit: number) {
		bind(texture, unit);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}

	/** Points each sampler of `program` at its texture's unit. */
	function connect(program: WebGLProgram, samplers: Record<string, number>) {
		gl.useProgram(program);
		for (const [name, unit] of Object.entries(samplers)) gl.uniform1i(gl.getUniformLocation(program, name), unit);
	}

	/** Makes `texture` what `framebuffer` draws to; throws if the GPU cannot draw to it. */
	function attach(framebuffer: WebGLFramebuffer, texture: WebGLTexture, name: string) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
		const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		if (status !== gl.FRAMEBUFFER_COMPLETE && !gl.isContextLost()) {
			throw new Error(`Fracture ${name} target is incomplete: 0x${status.toString(16)}`);
		}
	}

	try {
		if (!segmentTexture || !tileTexture || !listTexture || !candidateTexture || !candidateFramebuffer || !damageTexture || !damageFramebuffer) {
			throw new Error("Could not allocate the fracture textures");
		}

		const candidateBuild = build(CANDIDATE_FRAGMENT);
		const damageBuild = build(DAMAGE_FRAGMENT);
		const screenBuild = build(SCREEN_FRAGMENT);
		const parallel = gl.getExtension("KHR_parallel_shader_compile");
		if (parallel) await until(() => programs.every((program) => gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)));
		const candidateProgram = check(candidateBuild);
		const damageProgram = check(damageBuild);
		const screenProgram = check(screenBuild);
		const candidateUniforms = locate(candidateProgram, ["uGrid"]);
		const damageUniforms = locate(damageProgram, ["uResolution", "uScale", "uCenter", "uGlitch"]);
		const screenUniforms = locate(screenProgram, ["uGrid", "uResolution", "uScale", "uTime", "uCenter", "uSway", "uGlitch"]);
		connect(candidateProgram, { uSegments: UNIT.segments, uTiles: UNIT.tiles, uList: UNIT.list });
		connect(screenProgram, { uSegments: UNIT.segments, uCandidates: UNIT.candidates, uDamage: UNIT.damage });

		configure(segmentTexture, UNIT.segments);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 2, MAX_SEGMENTS, 0, gl.RGBA, gl.FLOAT, null);
		configure(tileTexture, UNIT.tiles);
		configure(listTexture, UNIT.list);
		configure(candidateTexture, UNIT.candidates);
		configure(damageTexture, UNIT.damage);

		const renderer = {
			software,

			resize(cssWidth: number, cssHeight: number, dpr: number) {
				width = Math.max(1, cssWidth);
				height = Math.max(1, cssHeight);
				scale = Math.min(dpr, MAX_DENSITY, Math.sqrt(MAX_PIXELS / (width * height)));
				canvas.width = Math.max(1, Math.round(width * scale));
				canvas.height = Math.max(1, Math.round(height * scale));
				columns = Math.ceil(width / CELL);
				rows = Math.ceil(height / CELL);

				bind(tileTexture, UNIT.tiles);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32UI, Math.ceil(columns / TILE_CELLS), Math.ceil(rows / TILE_CELLS), 0, gl.RG_INTEGER, gl.UNSIGNED_INT, null);
				bind(candidateTexture, UNIT.candidates);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16UI, columns, rows, 0, gl.RG_INTEGER, gl.UNSIGNED_SHORT, null);
				attach(candidateFramebuffer, candidateTexture, "candidate");
				bind(damageTexture, UNIT.damage);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, canvas.width, canvas.height, 0, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, null);
				attach(damageFramebuffer, damageTexture, "damage");
				damageGlitch.fill(NaN);
			},

			/**
			 * `glitch` comes from writeGlitch; `segments` holds `count` segments laid
			 * out as described by SEGMENT_FLOATS.
			 */
			draw(time: number, sway: number, glitch: Float32Array, segments: Float32Array, count: number) {
				bind(segmentTexture, UNIT.segments);
				if (count > 0) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 2, count, gl.RGBA, gl.FLOAT, segments, 0);

				const tiles = binSegments(segments, count, columns, rows);
				bind(tileTexture, UNIT.tiles);
				gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, tiles.across, tiles.down, gl.RG_INTEGER, gl.UNSIGNED_INT, tiles.runs);
				bind(listTexture, UNIT.list);
				const rowsNeeded = tiles.entries.length / LIST_WIDTH;
				if (rowsNeeded !== listRows) {
					listRows = rowsNeeded;
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16UI, LIST_WIDTH, listRows, 0, gl.RED_INTEGER, gl.UNSIGNED_SHORT, tiles.entries);
				} else if (tiles.length > 0) {
					const rowsUsed = Math.ceil(tiles.length / LIST_WIDTH);
					gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LIST_WIDTH, rowsUsed, gl.RED_INTEGER, gl.UNSIGNED_SHORT, tiles.entries);
				}

				if (glitch[0] !== damageGlitch[0] || glitch[1] !== damageGlitch[1]) {
					gl.bindFramebuffer(gl.FRAMEBUFFER, damageFramebuffer);
					gl.viewport(0, 0, canvas.width, canvas.height);
					gl.useProgram(damageProgram);
					gl.uniform2f(damageUniforms.uResolution, canvas.width, canvas.height);
					gl.uniform1f(damageUniforms.uScale, scale);
					gl.uniform2f(damageUniforms.uCenter, width / 2, height / 2);
					gl.uniform2fv(damageUniforms.uGlitch, glitch);
					gl.drawArrays(gl.TRIANGLES, 0, 3);
					damageGlitch.set(glitch);
				}

				gl.bindFramebuffer(gl.FRAMEBUFFER, candidateFramebuffer);
				gl.viewport(0, 0, columns, rows);
				gl.useProgram(candidateProgram);
				gl.uniform2f(candidateUniforms.uGrid, columns, rows);
				gl.drawArrays(gl.TRIANGLES, 0, 3);

				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				gl.viewport(0, 0, canvas.width, canvas.height);
				gl.useProgram(screenProgram);
				gl.uniform2f(screenUniforms.uGrid, columns, rows);
				gl.uniform2f(screenUniforms.uResolution, canvas.width, canvas.height);
				gl.uniform1f(screenUniforms.uScale, scale);
				gl.uniform1f(screenUniforms.uTime, time);
				gl.uniform2f(screenUniforms.uCenter, width / 2, height / 2);
				gl.uniform1f(screenUniforms.uSway, sway);
				gl.uniform2fv(screenUniforms.uGlitch, glitch);
				gl.drawArrays(gl.TRIANGLES, 0, 3);
			},

			finish,
			dispose,
		};

		// The GPU builds its pipelines on the first draw that uses them, so make
		// that a 1px frame now and wait for it without stalling.
		renderer.resize(1, 1, 1);
		renderer.draw(0, 0, new Float32Array(2), new Float32Array(0), 0);
		await finish();

		// The warm-up frame used the same draw path, so its errors are the ones real frames would hit.
		const error = gl.getError();
		if (error !== gl.NO_ERROR) throw new Error(`Fracture draw failed: 0x${error.toString(16)}`);
		return renderer;
	} catch (error) {
		dispose();
		throw error;
	}
}
