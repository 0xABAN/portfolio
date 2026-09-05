import assert from "node:assert/strict";
import { test } from "node:test";
import { canScatter, findEdgeHit } from "./fractureParticles";

test("only fast, recent pointer movement outside the cooldown scatters fragments", () => {
	const from = { x: 0, y: 0, time: 1000 };
	assert.equal(canScatter(from, { x: 60, y: 0, time: 1040 }, 0), true);
	assert.equal(canScatter(from, { x: 10, y: 0, time: 1040 }, 0), false);
	assert.equal(canScatter(from, { x: 60, y: 0, time: 1040 }, 1000), false);
	assert.equal(canScatter(from, { x: 500, y: 0, time: 1600 }, 0), false);
	assert.equal(canScatter(from, { x: 60, y: 0, time: 1000 }, 0), false);
});

test("a deliberate drag produces a continuous trail without needing a fast flick", () => {
	const from = { x: 0, y: 0, time: 1000 };
	assert.equal(canScatter(from, { x: 20, y: 0, time: 1040 }, 800), true);
	assert.equal(canScatter(from, { x: 20, y: 0, time: 1040 }, 920), false);
	assert.equal(canScatter(from, { x: 0, y: 0, time: 1040 }, 0), false);
});

test("a fast swipe catches an edge between events, but ignores distant edges", () => {
	const from = { x: 0, y: 0 };
	const to = { x: 100, y: 0 };
	const edge = { x: 50, y: 4 };
	assert.deepEqual(findEdgeHit(from, to, [{ x: 60, y: 40 }, edge]), edge);
	assert.equal(findEdgeHit(from, to, [{ x: 50, y: 30 }]), null);
	assert.equal(findEdgeHit(from, to, [{ x: 150, y: 0 }]), null);
	assert.equal(findEdgeHit(from, to, []), null);
});
