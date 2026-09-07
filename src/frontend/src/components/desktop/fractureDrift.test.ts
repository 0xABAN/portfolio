import assert from "node:assert/strict";
import { test } from "node:test";
import { createFractureDrift, createFractureRotation, fractureDriftAt } from "./fractureDrift";

test("the original fracture gently rotates and expands, then returns exactly", () => {
	const cycle = createFractureDrift(() => 0.5);
	assert.deepEqual(fractureDriftAt(cycle, 0), { rotation: 0, scale: 1, thickness: 1 });
	assert.deepEqual(fractureDriftAt(cycle, cycle.duration), { rotation: 0, scale: 1, thickness: 1 });
	const peak = fractureDriftAt(cycle, cycle.rest + cycle.expand);
	assert.ok(Math.abs(peak.rotation) >= 6 && Math.abs(peak.rotation) <= 10);
	assert.ok(peak.scale >= 1.035 && peak.scale <= 1.3);
	const opening = fractureDriftAt(cycle, cycle.rest + cycle.expand / 2);
	assert.ok(Math.abs(opening.rotation) < Math.abs(peak.rotation));
	assert.ok(opening.scale > 1 && opening.scale < peak.scale);
	assert.ok(peak.thickness >= 1.25 && peak.thickness <= 1.4);
	assert.ok(opening.thickness > 1 && opening.thickness < peak.thickness);
	assert.ok(fractureDriftAt(cycle, cycle.duration - 1).scale - 1 < 0.000001);
});

test("successive motions can change direction, pace, and expansion without sudden endpoints", () => {
	const a = createFractureDrift(() => 0.1);
	const b = createFractureDrift(() => 0.9);
	assert.notEqual(a.duration, b.duration);
	assert.equal(a.scale, 1);
	assert.equal(a.rotation, 0);
	assert.equal(a.thickness, 1);
	assert.ok(b.scale >= 1.035 && b.scale <= 1.3);
	assert.notEqual(a.expand, b.expand);
	assert.notEqual(a.scale, b.scale);
	for (const cycle of [a, b]) {
		for (let t = 0; t <= cycle.duration; t += 173) {
			const pose = fractureDriftAt(cycle, t);
			assert.ok(Math.abs(pose.rotation) <= 10);
			assert.ok(pose.scale >= 1 && pose.scale <= 1.3);
		}
	}
});

test("shared rotation always moves, including random values that pause expansion", () => {
	for (const randomValue of [0, 0.1, 0.34, 0.5, 0.9, 1]) {
		const cycle = createFractureRotation(() => randomValue);
		const peak = fractureDriftAt(cycle, cycle.rest + cycle.expand);

		assert.ok(Math.abs(peak.rotation) >= 5 && Math.abs(peak.rotation) <= 20);
		assert.ok(Math.abs(fractureDriftAt(cycle, cycle.expand / 2).rotation) > 0);
		assert.equal(peak.scale, 1);
		assert.equal(peak.thickness, 1);
		assert.equal(Math.abs(fractureDriftAt(cycle, 0).rotation), 0);
		assert.equal(Math.abs(fractureDriftAt(cycle, cycle.duration).rotation), 0);
	}
});


test("branches expand quickly and can retract while shared rotation is still opening", () => {
	const branch = createFractureDrift(() => 0.5);
	const rotation = createFractureRotation(() => 0.5);
	const retractStart = branch.rest + branch.expand + branch.hold;
	const later = retractStart + 1000;

	assert.ok(branch.expand >= 1000 && branch.expand <= 3000);
	assert.ok(fractureDriftAt(branch, later).scale < fractureDriftAt(branch, retractStart).scale);
	assert.ok(fractureDriftAt(rotation, later).rotation > fractureDriftAt(rotation, retractStart).rotation);
});
