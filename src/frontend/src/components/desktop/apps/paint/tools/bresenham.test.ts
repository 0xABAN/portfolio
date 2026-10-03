import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { bresenhamLine } from "./bresenham";

// Captured from the two original iterators before consolidation. Covers 625
// lines per mode: all octants, reversed/zero-length lines and fractional inputs.
const ORIGINAL = [
	"43e32db14b672b21b241cdcfbf8cd59f60381b00c70ecd39f5587cef37f3c21e",
	"dbee838980f1573ca7c70f5d739d827b55f7e0862c755f312e5944cc5bc6bf37",
];

for (const dense of [false, true]) {
	test(`rasterization preserves exact callback order (dense=${dense})`, () => {
		const hash = createHash("sha256");
		const coordinates = [-3, -1.7, 0, 1.2, 3];
		for (const x1 of coordinates) {
			for (const y1 of coordinates) {
				for (const x2 of coordinates) {
					for (const y2 of coordinates) {
						const points: number[][] = [];
						bresenhamLine(x1, y1, x2, y2, (x, y) => points.push([x, y]), dense);
						hash.update(JSON.stringify(points));
					}
				}
			}
		}
		assert.equal(hash.digest("hex"), ORIGINAL[Number(dense)]);
	});
}
