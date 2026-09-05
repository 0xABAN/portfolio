import assert from "node:assert/strict";
import { test } from "node:test";
import { fractureOffset } from "./desktopParallax";

test("only nearby outlines are attracted, without ever reaching the pointer", () => {
	const pointer = { x: 100, y: 100 };
	const outline = [{ x: 500, y: 500 }, { x: 80, y: 100 }];
	const near = fractureOffset(pointer, outline, 1);
	assert.ok(Math.abs(near.x - 3.6) < 1e-10);
	assert.equal(near.y, 0);
	assert.ok(near.x < pointer.x - outline[1].x);
	assert.deepEqual(fractureOffset(pointer, [{ x: 500, y: 500 }], 1), { x: 0, y: 0 });
	assert.deepEqual(fractureOffset(pointer, [pointer], 1), { x: 0, y: 0 });
	assert.deepEqual(fractureOffset(pointer, [], 1), { x: 0, y: 0 });
	assert.deepEqual(fractureOffset(pointer, outline, 0), { x: 0, y: 0 });
});

test("attraction is bounded, fades with distance, and preserves screen-space reach", () => {
	const origin = [{ x: 0, y: 0 }];
	for (const scale of [0.5, 1, 2]) {
		for (const distance of [-1000, -200, -100, -20, 0, 20, 100, 200, 1000]) {
			const offset = fractureOffset({ x: distance / scale, y: distance / scale }, origin, scale);
			assert.ok(Math.hypot(offset.x, offset.y) * scale <= 12);
			if (Math.abs(distance) >= 200) assert.deepEqual(offset, { x: 0, y: 0 });
			if (distance !== 0 && Math.abs(distance) < 100) {
				assert.equal(Math.sign(offset.x), Math.sign(distance));
				assert.equal(Math.sign(offset.y), Math.sign(distance));
			}
		}
	}
	const near = fractureOffset({ x: 60, y: 0 }, origin, 1);
	const far = fractureOffset({ x: 150, y: 0 }, origin, 1);
	assert.ok(near.x > far.x);
	assert.deepEqual(fractureOffset({ x: 30, y: 0 }, origin, 2), { x: near.x / 2, y: 0 });
});
