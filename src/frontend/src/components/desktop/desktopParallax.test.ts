import assert from "node:assert/strict";
import { test } from "node:test";
import { parallaxRatio } from "./desktopParallax";

test("parallax centers the pointer and bounds travel even outside the desktop", () => {
	for (const [position, expected] of [
		[-100, -1], [0, -1], [25, -0.5], [50, 0], [75, 0.5], [100, 1], [200, 1],
	]) {
		assert.equal(parallaxRatio(position, 100), expected);
	}
	assert.equal(parallaxRatio(50, 0), 0);
	assert.equal(parallaxRatio(50, -100), 0);
});
