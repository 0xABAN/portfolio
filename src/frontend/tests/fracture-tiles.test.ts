import assert from "node:assert/strict";
import { test } from "node:test";
import { createFracture, MAX_SEGMENTS, SEGMENT_FLOATS, WIDEST_SHARD, writeSegments } from "@/components/desktop/effects/fracture/cracks";
import { CELL, PICK_LIMIT, TILE_CELLS } from "@/components/desktop/effects/fracture/shaders";
import { createTileBinner } from "@/components/desktop/effects/fracture/tiles";

const NONE = -1;

/**
 * The candidate pass for one cell centre, over `count` segment ids from `ids`
 * in order: the ids with the nearest edge and with the smallest reach.
 */
function candidates(segments: Float32Array, ids: ArrayLike<number>, count: number, px: number, py: number) {
	const margin = PICK_LIMIT + WIDEST_SHARD;
	let nearest = PICK_LIMIT;
	let smallest = PICK_LIMIT;
	let edgeId = NONE;
	let reachId = NONE;
	for (let k = 0; k < count; k++) {
		const id = ids[k];
		const at = id * SEGMENT_FLOATS;
		const ax = segments[at], ay = segments[at + 1], bx = segments[at + 2], by = segments[at + 3];
		if (px < Math.min(ax, bx) - margin || py < Math.min(ay, by) - margin || px > Math.max(ax, bx) + margin || py > Math.max(ay, by) + margin) continue;

		// measure() and reach() from shaders.ts.
		const alongX = bx - ax, alongY = by - ay;
		const offsetX = px - ax, offsetY = py - ay;
		const length2 = Math.max(alongX * alongX + alongY * alongY, 1e-6);
		const t = (offsetX * alongX + offsetY * alongY) / length2;
		const h = Math.min(1, Math.max(0, t));
		const centre = Math.hypot(offsetX - alongX * h, offsetY - alongY * h);
		const width = segments[at + 4] + (segments[at + 5] - segments[at + 4]) * h;
		const lineWidth = segments[at + 6];
		let shard = 1e4;
		let line = 1e4;
		if (width > 0) {
			const across = Math.abs(alongX * offsetY - alongY * offsetX) / Math.sqrt(length2);
			shard = segments[at + 7] > 0.5 ? Math.max(across - width, (Math.abs(t - 0.5) - 0.5) * Math.sqrt(length2)) : centre - width;
		}
		if (lineWidth > 0) line = centre - lineWidth;
		const edge = Math.min(shard, line);
		const reach = Math.max(edge, 0) / Math.min(1, Math.max(0.15, Math.max(width / 8, lineWidth / 3)));

		if (edge < nearest) {
			nearest = edge;
			edgeId = id;
		}
		if (reach < smallest) {
			smallest = reach;
			reachId = id;
		}
	}
	return [edgeId, reachId];
}

test("tiles give every candidate cell the same picks as checking all segments", () => {
	const fracture = createFracture();
	const segments = new Float32Array(MAX_SEGMENTS * SEGMENT_FLOATS);
	const binSegments = createTileBinner();
	const frames = [
		{ time: 0.4, width: 1440, height: 868, pointer: [0, 0, 0] },
		{ time: 9.3, width: 1440, height: 868, pointer: [1100, 200, 1] },
		{ time: 31, width: 390, height: 812, pointer: [0, 0, 0] },
	];

	for (const { time, width, height, pointer } of frames) {
		const count = writeSegments(fracture, segments, { time, still: false, width, height, pointer: new Float32Array(pointer) });
		const columns = Math.ceil(width / CELL);
		const rows = Math.ceil(height / CELL);
		const tiles = binSegments(segments, count, columns, rows);
		assert.ok(tiles.length < count * tiles.across * tiles.down / 4, `tiles barely narrow the search: ${tiles.length} entries`);

		const all = Array.from({ length: count }, (_, id) => id);
		let picked = 0;
		for (let row = 0; row < rows; row++) {
			for (let column = 0; column < columns; column++) {
				const tile = Math.floor(row / TILE_CELLS) * tiles.across + Math.floor(column / TILE_CELLS);
				const listed = tiles.entries.subarray(tiles.runs[tile * 2]);
				const [px, py] = [(column + 0.5) * CELL, (row + 0.5) * CELL];
				const expected = candidates(segments, all, count, px, py);
				const actual = candidates(segments, listed, tiles.runs[tile * 2 + 1], px, py);
				if (actual[0] !== expected[0] || actual[1] !== expected[1]) {
					assert.fail(`cell ${column},${row} at ${time}s picked ${actual} instead of ${expected}`);
				}
				if (expected[0] !== NONE) picked++;
			}
		}
		assert.ok(picked > 100, "the frame has too few candidate cells to compare");
	}
});

test("tile lists are ascending and within their buffers", () => {
	const fracture = createFracture();
	const segments = new Float32Array(MAX_SEGMENTS * SEGMENT_FLOATS);
	const binSegments = createTileBinner();
	const count = writeSegments(fracture, segments, { time: 12, still: false, width: 1920, height: 1048, pointer: new Float32Array(3) });
	const tiles = binSegments(segments, count, 240, 131);

	let end = 0;
	for (let tile = 0; tile < tiles.across * tiles.down; tile++) {
		const [first, length] = [tiles.runs[tile * 2], tiles.runs[tile * 2 + 1]];
		assert.equal(first, end, "runs must be contiguous");
		end += length;
		for (let k = first + 1; k < first + length; k++) assert.ok(tiles.entries[k] > tiles.entries[k - 1]);
	}
	assert.equal(end, tiles.length);
	assert.ok(tiles.entries.length >= tiles.length);
});
