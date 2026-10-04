import { createFracture, MAX_SEGMENTS, SEGMENT_FLOATS, writeSegments } from "./cracks";
import type { FractureRenderer } from "./renderer";

/** Frames drawn back to back per round; polling once per display frame blurs each by under 1 ms. */
const FRAMES = 20;
const ROUNDS = 3;

/**
 * Whether this device draws the wallpaper within `budgetMs` per frame at the
 * viewport's size, from submitting the draws until the GPU has finished them.
 *
 * It draws the settled fracture, which is about as much as any frame draws,
 * in rounds. A GPU that has been idle can start at low clocks, so a slow round
 * is retried, up to ROUNDS in all, unless it took more than twice the budget,
 * which low clocks do not explain. Stopping as soon as the answer is clear
 * keeps the GPU free for the page. Leaves the renderer sized to the viewport.
 */
export async function fitsFrameBudget(renderer: FractureRenderer, budgetMs: number) {
	const width = innerWidth;
	const height = innerHeight;
	const segments = new Float32Array(MAX_SEGMENTS * SEGMENT_FLOATS);
	const count = writeSegments(createFracture(), segments, { time: 0, still: true, width, height, pointer: new Float32Array(3) });
	// No burst, so the display damage is drawn once, by the first frame, as it is between bursts.
	const glitch = new Float32Array(2);

	renderer.resize(width, height, devicePixelRatio);
	renderer.draw(0, 0, glitch, segments, count);
	await renderer.finish();

	for (let round = 0; round < ROUNDS; round++) {
		const start = performance.now();
		for (let frame = 0; frame < FRAMES; frame++) renderer.draw(frame, 0, glitch, segments, count);
		await renderer.finish();
		const cost = (performance.now() - start) / FRAMES;
		if (cost <= budgetMs) return true;
		if (cost > 2 * budgetMs) return false;
	}
	return false;
}
