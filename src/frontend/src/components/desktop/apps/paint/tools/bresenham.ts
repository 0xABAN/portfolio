/**
 * Bresenham iterator — from jspaint image-manipulation.js
 * https://github.com/1j01/jspaint/blob/master/src/image-manipulation.js
 */

type PointCb = (x: number, y: number) => void;

/** Dense brushes also stamp the orthogonal mid-step, including duplicate pixels. */
export function bresenhamLine(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	callback: PointCb,
	dense = false,
): void {
	x1 = ~~x1;
	x2 = ~~x2;
	y1 = ~~y1;
	y2 = ~~y2;

	const dx = Math.abs(x2 - x1);
	const dy = Math.abs(y2 - y1);
	const sx = x1 < x2 ? 1 : -1;
	const sy = y1 < y2 ? 1 : -1;
	let err = dx - dy;

	for (;;) {
		callback(x1, y1);
		if (x1 === x2 && y1 === y2) break;
		const e2 = err * 2;
		if (e2 > -dy) {
			err -= dy;
			x1 += sx;
		}
		if (dense) callback(x1, y1);
		if (e2 < dx) {
			err += dx;
			y1 += sy;
		}
	}
}
