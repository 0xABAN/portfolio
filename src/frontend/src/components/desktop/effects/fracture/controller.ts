import { createFracture, MAX_SEGMENTS, SEGMENT_FLOATS, swayAngle, writeGlitch, writeSegments, type FrameInput } from "./cracks";
import { fitsFrameBudget } from "./frameCost";
import { createFractureRenderer, type FractureRenderer } from "./renderer";

/** Ambient motion is slow enough for 30 fps. */
const AMBIENT_FRAME_MS = 1000 / 30;
/**
 * The impact and the cursor draw at up to 60 fps. Following a 120 Hz display
 * would double the GPU cost of the wallpaper for no visible gain.
 */
const BUSY_FRAME_MS = 1000 / 60;
/** Absorbs timer jitter, so a 60 Hz display reliably draws every frame when busy and every other frame otherwise. */
const FRAME_SLACK_MS = 4;
/** Seconds after the impact that draw at full rate. */
const BURST_SECONDS = 2;
/** Longest clock step after a stalled frame, in seconds. */
const MAX_STEP = 0.1;
/** Seconds for the eased cursor to close most of the gap to the real one. */
const POINTER_EASE = 0.12;
/**
 * Most ms a frame may take for the wallpaper to animate, measured at the
 * viewport's size. Busy motion draws at 60 fps, so this keeps the wallpaper
 * to about half of each 16.7 ms frame. Slower devices get one settled frame.
 */
const FRAME_BUDGET_MS = 8;

export type FractureController = {
	destroy(): void;
};

/**
 * How the wallpaper is on screen: not at all (yet, or after a failure),
 * animated, or as one settled frame because this device draws it too slowly.
 * Reduced motion also stills it, but does not change this.
 */
export type FractureRendering = "none" | "animated" | "still";

/** A renderer, and whether this device draws it fast enough to animate. */
type Wallpaper = { renderer: FractureRenderer; animated: boolean };

/**
 * Builds a renderer for `canvas` and decides whether it animates here: never
 * without a GPU, otherwise if its frames fit FRAME_BUDGET_MS.
 */
async function buildWallpaper(canvas: HTMLCanvasElement): Promise<Wallpaper> {
	const renderer = await createFractureRenderer(canvas);
	try {
		const animated = !renderer.software && await fitsFrameBudget(renderer, FRAME_BUDGET_MS);
		return { renderer, animated };
	} catch (error) {
		renderer.dispose();
		throw error;
	}
}

/** A canvas whose wallpaper is being built before it mounts. */
type Prepared = { canvas: HTMLCanvasElement; wallpaper: Promise<Wallpaper> };

let prepared: Prepared | null = null;

function prepare(): Prepared {
	const canvas = document.createElement("canvas");
	canvas.className = "fracture-canvas";
	const wallpaper = buildWallpaper(canvas);
	// The runFracture that adopts this reports failures; until then, keep them from counting as unhandled.
	wallpaper.catch(() => {});
	return { canvas, wallpaper };
}

/**
 * Starts compiling the wallpaper's shaders and timing its frames ahead of
 * time, so its first frame waits for neither. Call it while something else is
 * on screen, such as the boot screen; the next runFracture adopts the result.
 */
export function prepareFracture() {
	prepared ??= prepare();
}

/**
 * Owns the canvas: the frame loop, reduced motion, visibility, resizing,
 * context loss and the cursor. The canvas is appended to `root`, and the
 * screen breaks as soon as its renderer is ready. Failures leave the plain
 * desktop colour behind and are reported, never replaced by another renderer.
 */
export function runFracture(root: HTMLElement, onRendering: (rendering: FractureRendering) => void): FractureController {
	const { canvas, wallpaper: preparing } = prepared ?? prepare();
	prepared = null;
	root.append(canvas);

	const desktop = root.closest<HTMLElement>(".desktop") ?? root;
	const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
	const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
	const fracture = createFracture();
	const segments = new Float32Array(MAX_SEGMENTS * SEGMENT_FLOATS);
	/** Eased cursor x, y and presence (0..1), in CSS px of the wallpaper. */
	const pointer = new Float32Array(3);
	const target = { x: 0, y: 0, present: false };
	const input: FrameInput = { time: 0, still: false, width: 1, height: 1, pointer };
	/** Burst (0 or 1) and burst seed, from writeGlitch. */
	const glitch = new Float32Array(2);

	let bounds = root.getBoundingClientRect();
	let renderer: FractureRenderer | null = null;
	/** Whether this device draws the wallpaper fast enough to animate it. */
	let animated = false;
	let sizeKey = "";
	let density: MediaQueryList | null = null;
	/** Animated seconds since the impact; it only advances while animating, so a hidden tab sees the impact later. */
	let clock = 0;
	let frame = 0;
	let lastTick = 0;
	let lastDraw = 0;
	let destroyed = false;
	/** Bumped whenever a renderer still being built should be discarded. */
	let generation = 0;

	/** One settled frame instead of motion: for reduced motion, and on devices too slow to animate. */
	const holdsStill = () => reducedMotion.matches || !animated;
	const isAnimating = () => !holdsStill() && !document.hidden;

	/** Brings the per-frame inputs up to date with the clock and the environment. */
	function updateInput() {
		input.time = clock;
		input.still = holdsStill();
		input.width = bounds.width;
		input.height = bounds.height;
		writeGlitch(input, glitch);
	}

	function render() {
		if (!renderer) return;
		updateInput();
		renderer.draw(clock, swayAngle(input), glitch, segments, writeSegments(fracture, segments, input));
	}

	/** Eases towards the cursor; returns whether it is still visibly moving. */
	function stepPointer(delta: number) {
		const blend = 1 - Math.exp(-delta / POINTER_EASE);
		const goal = target.present ? 1 : 0;
		if (target.present) {
			// Appear at the cursor rather than sliding in from a stale position.
			if (pointer[2] < 0.01) pointer.set([target.x, target.y], 0);
			pointer[0] += (target.x - pointer[0]) * blend;
			pointer[1] += (target.y - pointer[1]) * blend;
		}
		pointer[2] += (goal - pointer[2]) * blend;
		if (Math.abs(goal - pointer[2]) < 0.001) pointer[2] = goal;
		return pointer[2] !== goal || (target.present && Math.hypot(target.x - pointer[0], target.y - pointer[1]) > 0.25);
	}

	function tick(now: number) {
		frame = requestAnimationFrame(tick);
		const delta = lastTick ? Math.min(MAX_STEP, (now - lastTick) / 1000) : 0;
		lastTick = now;
		clock += delta;

		updateInput();
		const busy = stepPointer(delta) || glitch[0] > 0 || clock < BURST_SECONDS;
		const interval = busy ? BUSY_FRAME_MS : AMBIENT_FRAME_MS;
		if (now - lastDraw < interval - FRAME_SLACK_MS) return;
		// Step the schedule by whole intervals rather than jumping to now, so the
		// slack cannot add up to a higher rate on faster displays. After a stall,
		// start over from now.
		lastDraw = Math.max(lastDraw + interval, now - FRAME_SLACK_MS);
		render();
	}

	function stop() {
		cancelAnimationFrame(frame);
		frame = 0;
		lastTick = 0;
	}

	/** Re-evaluates what to show after any change of state or environment. */
	function sync() {
		stop();
		if (destroyed || !renderer) return;

		if (isAnimating()) {
			frame = requestAnimationFrame(tick);
		} else {
			target.present = false;
			pointer[2] = 0;
			if (!document.hidden) render();
		}
	}

	function resize() {
		if (!renderer) return;
		bounds = root.getBoundingClientRect();
		const key = `${bounds.width}x${bounds.height}@${devicePixelRatio}`;
		if (key === sizeKey) return;
		sizeKey = key;
		renderer.resize(bounds.width, bounds.height, devicePixelRatio);
		// Resizing clears the canvas; repaint before the browser presents it.
		render();
	}

	function fail(error: unknown) {
		stop();
		renderer?.dispose();
		renderer = null;
		onRendering("none");
		console.error("Fracture wallpaper stopped:", error);
	}

	function attempt(action: () => void) {
		try {
			action();
		} catch (error) {
			fail(error);
		}
	}

	/** Shows the fracture once `building` resolves, unless it has been superseded by then. */
	function start(building: Promise<Wallpaper>) {
		const current = ++generation;
		building.then(
			(built) => {
				if (destroyed || current !== generation) {
					built.renderer.dispose();
					return;
				}
				renderer = built.renderer;
				animated = built.animated;
				attempt(() => {
					sizeKey = "";
					resize();
					onRendering(animated ? "animated" : "still");
					sync();
				});
			},
			(error) => {
				if (!destroyed && current === generation) fail(error);
			},
		);
	}

	function onContextRestored() {
		start(buildWallpaper(canvas));
	}

	function onContextLost(event: Event) {
		// Without preventDefault the browser never offers to restore the context.
		event.preventDefault();
		generation++;
		stop();
		renderer?.dispose();
		renderer = null;
		onRendering("none");
	}

	function onPointerMove(event: PointerEvent) {
		target.present = event.pointerType === "mouse" && finePointer.matches;
		target.x = event.clientX - bounds.left;
		target.y = event.clientY - bounds.top;
	}

	function onPointerLeave() {
		target.present = false;
	}

	// Browsers report pixel-density changes (zoom, moving displays) only through media queries.
	function watchDensity() {
		density?.removeEventListener("change", onDensityChange);
		density = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
		density.addEventListener("change", onDensityChange);
	}

	function onDensityChange() {
		watchDensity();
		attempt(resize);
	}

	const observer = new ResizeObserver(() => attempt(resize));
	observer.observe(root);
	watchDensity();
	desktop.addEventListener("pointermove", onPointerMove, { passive: true });
	desktop.addEventListener("pointerleave", onPointerLeave);
	window.addEventListener("blur", onPointerLeave);
	canvas.addEventListener("webglcontextlost", onContextLost);
	canvas.addEventListener("webglcontextrestored", onContextRestored);
	document.addEventListener("visibilitychange", sync);
	reducedMotion.addEventListener("change", sync);
	start(preparing);

	return {
		destroy() {
			if (destroyed) return;
			destroyed = true;
			stop();
			observer.disconnect();
			density?.removeEventListener("change", onDensityChange);
			desktop.removeEventListener("pointermove", onPointerMove);
			desktop.removeEventListener("pointerleave", onPointerLeave);
			window.removeEventListener("blur", onPointerLeave);
			canvas.removeEventListener("webglcontextlost", onContextLost);
			canvas.removeEventListener("webglcontextrestored", onContextRestored);
			document.removeEventListener("visibilitychange", sync);
			reducedMotion.removeEventListener("change", sync);
			renderer?.dispose();
			renderer = null;
			canvas.remove();
		},
	};
}
