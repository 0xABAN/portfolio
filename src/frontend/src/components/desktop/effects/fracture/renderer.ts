import { MAX_SEGMENTS } from "./cracks";
import { CANDIDATE_FRAGMENT, CELL, FULLSCREEN_VERTEX, SCREEN_FRAGMENT } from "./shaders";

/** The shaders work in CSS px, so a smaller backing store only softens edges. */
const MAX_DENSITY = 1.5;
const MAX_PIXELS = 3_000_000;

export type FractureRenderer = ReturnType<typeof createFractureRenderer>;

/**
 * Two full-screen passes: a small one finds the cracks that matter around each
 * 8px cell, then the canvas measures every pixel against only those cracks.
 */
export function createFractureRenderer(canvas: HTMLCanvasElement) {
	const context = canvas.getContext("webgl2", {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
		powerPreference: "low-power",
	});
	if (!context) throw new Error("WebGL2 is unavailable");
	// A non-null binding that the helpers below can rely on.
	const gl: WebGL2RenderingContext = context;
	// Clear any flag left by a lost context, so the first-frame check only sees our own errors.
	gl.getError();

	const programs: WebGLProgram[] = [];
	const segmentTexture = gl.createTexture();
	const candidateTexture = gl.createTexture();
	const framebuffer = gl.createFramebuffer();
	let width = 1;
	let height = 1;
	let scale = 1;
	let columns = 1;
	let rows = 1;
	let disposed = false;
	let checkedFirstFrame = false;

	function dispose() {
		if (disposed) return;
		disposed = true;
		for (const program of programs) gl.deleteProgram(program);
		gl.deleteTexture(segmentTexture);
		gl.deleteTexture(candidateTexture);
		gl.deleteFramebuffer(framebuffer);
	}

	function link(fragment: string) {
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

	function locate<Name extends string>(program: WebGLProgram, names: readonly Name[]) {
		return Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)])) as Record<Name, WebGLUniformLocation | null>;
	}

	function configure(texture: WebGLTexture, filter: GLenum) {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}

	try {
		if (!segmentTexture || !candidateTexture || !framebuffer) throw new Error("Could not allocate the fracture textures");

		const candidateProgram = link(CANDIDATE_FRAGMENT);
		const screenProgram = link(SCREEN_FRAGMENT);
		const candidateUniforms = locate(candidateProgram, ["uGrid", "uSegments", "uCount"]);
		const screenUniforms = locate(screenProgram, ["uGrid", "uSegments", "uCandidates", "uResolution", "uScale", "uTime", "uCenter", "uSway", "uGlitch"]);

		// Both textures are read texel by texel; candidates are 16-bit segment ids.
		configure(segmentTexture, gl.NEAREST);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 2, MAX_SEGMENTS, 0, gl.RGBA, gl.FLOAT, null);
		configure(candidateTexture, gl.NEAREST);

		return {
			resize(cssWidth: number, cssHeight: number, dpr: number) {
				width = Math.max(1, cssWidth);
				height = Math.max(1, cssHeight);
				scale = Math.min(dpr, MAX_DENSITY, Math.sqrt(MAX_PIXELS / (width * height)));
				canvas.width = Math.max(1, Math.round(width * scale));
				canvas.height = Math.max(1, Math.round(height * scale));
				columns = Math.ceil(width / CELL);
				rows = Math.ceil(height / CELL);

				gl.bindTexture(gl.TEXTURE_2D, candidateTexture);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16UI, columns, rows, 0, gl.RG_INTEGER, gl.UNSIGNED_SHORT, null);
				gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, candidateTexture, 0);
				const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				if (status !== gl.FRAMEBUFFER_COMPLETE && !gl.isContextLost()) {
					throw new Error(`Fracture candidate target is incomplete: 0x${status.toString(16)}`);
				}
			},

			/**
			 * `glitch` comes from writeGlitch; `segments` holds `count` segments laid
			 * out as described by SEGMENT_FLOATS.
			 */
			draw(time: number, sway: number, glitch: Float32Array, segments: Float32Array, count: number) {
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, segmentTexture);
				if (count > 0) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 2, count, gl.RGBA, gl.FLOAT, segments, 0);

				gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
				gl.viewport(0, 0, columns, rows);
				gl.useProgram(candidateProgram);
				gl.uniform2f(candidateUniforms.uGrid, columns, rows);
				gl.uniform1i(candidateUniforms.uSegments, 0);
				gl.uniform1i(candidateUniforms.uCount, count);
				gl.drawArrays(gl.TRIANGLES, 0, 3);

				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				gl.viewport(0, 0, canvas.width, canvas.height);
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, candidateTexture);
				gl.useProgram(screenProgram);
				gl.uniform2f(screenUniforms.uGrid, columns, rows);
				gl.uniform1i(screenUniforms.uSegments, 0);
				gl.uniform1i(screenUniforms.uCandidates, 1);
				gl.uniform2f(screenUniforms.uResolution, canvas.width, canvas.height);
				gl.uniform1f(screenUniforms.uScale, scale);
				gl.uniform1f(screenUniforms.uTime, time);
				gl.uniform2f(screenUniforms.uCenter, width / 2, height / 2);
				gl.uniform1f(screenUniforms.uSway, sway);
				gl.uniform3fv(screenUniforms.uGlitch, glitch);
				gl.drawArrays(gl.TRIANGLES, 0, 3);

				// Surface driver failures once instead of polling getError every frame.
				if (!checkedFirstFrame) {
					checkedFirstFrame = true;
					const error = gl.getError();
					if (error !== gl.NO_ERROR) throw new Error(`Fracture draw failed: 0x${error.toString(16)}`);
				}
			},

			dispose,
		};
	} catch (error) {
		dispose();
		throw error;
	}
}
