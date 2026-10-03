import { MAX_SEGMENTS, SEGMENT_FLOATS } from "./cracks";
import { CELL, LIST_WIDTH, REACH, TILE_CELLS } from "./shaders";

/** CSS px within which a cell centre can pick a segment: the candidate pass's limit. */
const LIMIT = REACH + CELL;
/** CSS px of slack, so float rounding never drops a segment the GPU would pick. */
const SLACK = 1;
const TILE = CELL * TILE_CELLS;

export type Tiles = {
	across: number;
	down: number;
	/** Per tile, row by row: its first entry in `entries`, then its entry count. */
	runs: Uint32Array;
	/** Segment ids, tile after tile, padded to whole rows of LIST_WIDTH. */
	entries: Uint16Array;
	/** Entries in use. */
	length: number;
};

/**
 * How far from a segment a cell centre can be and still pick it, CSS px; 0 if
 * it never can. A candidate must come within LIMIT of the segment's shard or
 * line edge, and a square-ended shard is also cut off up to LIMIT past its end.
 */
export function pickRange(segments: Float32Array, id: number) {
	const at = id * SEGMENT_FLOATS;
	const shard = Math.max(segments[at + 4], segments[at + 5]);
	const line = segments[at + 6];
	const square = segments[at + 7] > 0.5;
	const shardRange = shard > 0 ? (square ? Math.hypot(LIMIT + shard, LIMIT) : LIMIT + shard) : 0;
	const lineRange = line > 0 ? LIMIT + line : 0;
	const range = Math.max(shardRange, lineRange);
	return range > 0 ? range + SLACK : 0;
}

/**
 * Returns a function that groups segments by square tiles of TILE_CELLS ×
 * TILE_CELLS candidate cells, so the candidate pass checks the few segments
 * that can matter to a tile rather than every segment on screen.
 *
 * A tile lists every segment that a cell centre in it could pick, in
 * ascending order, so the pass finds exactly the candidates it would find by
 * checking all of them. The returned buffers are reused by the next call.
 */
export function createTileBinner() {
	let runs = new Uint32Array(0);
	let entries = new Uint16Array(LIST_WIDTH);
	/** Per segment: first column, first row, last column, last row of the tiles it covers. */
	const covered = new Int32Array(MAX_SEGMENTS * 4);

	function forEachTile(id: number, across: number, visit: (tile: number) => void) {
		const span = id * 4;
		for (let row = covered[span + 1]; row <= covered[span + 3]; row++) {
			for (let column = covered[span]; column <= covered[span + 2]; column++) visit(row * across + column);
		}
	}

	/** Groups `count` segments for a candidate grid of `columns` × `rows` cells. */
	return function binSegments(segments: Float32Array, count: number, columns: number, rows: number): Tiles {
		const across = Math.ceil(columns / TILE_CELLS);
		const down = Math.ceil(rows / TILE_CELLS);
		if (runs.length === across * down * 2) runs.fill(0);
		else runs = new Uint32Array(across * down * 2);

		// Find the tiles each segment covers: those its bounding box, grown by its
		// pick range, overlaps on screen. Count each tile's entries on the way.
		for (let id = 0; id < count; id++) {
			const at = id * SEGMENT_FLOATS;
			const range = pickRange(segments, id);
			const span = id * 4;
			covered[span] = Math.max(0, Math.floor((Math.min(segments[at], segments[at + 2]) - range) / TILE));
			covered[span + 1] = Math.max(0, Math.floor((Math.min(segments[at + 1], segments[at + 3]) - range) / TILE));
			covered[span + 2] = Math.min(across - 1, Math.floor((Math.max(segments[at], segments[at + 2]) + range) / TILE));
			covered[span + 3] = Math.min(down - 1, Math.floor((Math.max(segments[at + 1], segments[at + 3]) + range) / TILE));
			// A segment no cell can pick covers no tiles.
			if (range === 0) covered[span + 2] = -1;
			forEachTile(id, across, (tile) => runs[tile * 2 + 1]++);
		}

		// Give each tile its first entry, then fill the entries in ascending
		// segment order, counting each tile up again as it fills.
		let length = 0;
		for (let tile = 0; tile < across * down; tile++) {
			runs[tile * 2] = length;
			length += runs[tile * 2 + 1];
			runs[tile * 2 + 1] = 0;
		}
		if (entries.length < length) entries = new Uint16Array(Math.ceil((length * 1.5) / LIST_WIDTH) * LIST_WIDTH);
		for (let id = 0; id < count; id++) {
			forEachTile(id, across, (tile) => {
				entries[runs[tile * 2] + runs[tile * 2 + 1]++] = id;
			});
		}
		return { across, down, runs, entries, length };
	};
}
