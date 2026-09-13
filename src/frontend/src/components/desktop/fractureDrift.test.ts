import assert from "node:assert/strict";
import { test } from "node:test";
import {
	advanceFractureActivity, advanceFractureBranches, advanceFractureTwitches,
	createFractureActivity, createFractureDrift, createFractureRotation, createFractureTwitch,
	fractureDriftAt, fractureGrowthAt, fractureRotationAt, fractureTwitchAt, type FractureBranchClock, type FractureTwitchClock,
} from "./fractureDrift";

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

test("normalized growth travels outward, holds, then retracts exactly to zero", () => {
	const cycle = createFractureDrift(() => 0.5);
	assert.equal(fractureGrowthAt(cycle, 0), 0);
	assert.equal(fractureGrowthAt(cycle, cycle.rest), 0);
	assert.equal(fractureGrowthAt(cycle, cycle.rest + cycle.expand), 1);
	assert.equal(fractureGrowthAt(cycle, cycle.rest + cycle.expand + cycle.hold), 1);
	assert.equal(fractureGrowthAt(cycle, cycle.duration), 0);
	assert.equal(fractureGrowthAt(cycle, cycle.duration + 100), 0);
	assert.ok(fractureGrowthAt(cycle, cycle.rest + cycle.expand / 4) < fractureGrowthAt(cycle, cycle.rest + cycle.expand / 2));
	const retractStart = cycle.rest + cycle.expand + cycle.hold;
	assert.ok(fractureGrowthAt(cycle, retractStart + cycle.retract / 4) > fractureGrowthAt(cycle, retractStart + cycle.retract / 2));
	for (let elapsed = 0; elapsed < cycle.duration; elapsed += 173) {
		const growth = fractureGrowthAt(cycle, elapsed);
		assert.ok(growth >= 0 && growth <= 1);
		assert.ok(Math.abs(growth - (fractureDriftAt(cycle, elapsed).scale - 1) / (cycle.scale - 1)) < 1e-12);
	}
	assert.equal(fractureGrowthAt({ ...cycle, scale: 1 }, cycle.rest + cycle.expand), 1);
});

test("successive motions can change direction, pace, and expansion without sudden endpoints", () => {
	const a = createFractureDrift(() => 0.1);
	const b = createFractureDrift(() => 0.9);
	assert.notEqual(a.duration, b.duration);
	assert.ok(a.scale > 1);
	assert.ok(a.rotation < 0);
	assert.ok(a.thickness > 1);
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

test("shared rotation enters gently and stays slow and bounded across many oscillations", () => {
	for (const randomValue of [0, 0.1, 0.34, 0.5, 0.9, 1]) {
		const motion = createFractureRotation(() => randomValue);
		assert.equal(Math.abs(fractureRotationAt(motion, 0)), 0);
		assert.ok(Math.abs(fractureRotationAt(motion, 1)) < 1e-7);
		let previous = 0;
		let furthest = 0;
		for (let elapsed = 100; elapsed <= 600000; elapsed += 100) {
			const angle = fractureRotationAt(motion, elapsed);
			assert.ok(Math.abs(angle) <= 15);
			assert.ok(Math.abs(angle - previous) < 0.5, "no sudden turns or resets");
			furthest = Math.max(furthest, Math.abs(angle));
			previous = angle;
		}
		assert.ok(furthest > 5, "rotation should remain visibly alive");
	}
});

test("overlapping rotational drifts do not return to neutral at a cycle boundary", () => {
	const motion = createFractureRotation(() => 0.5);
	assert.notDeepEqual(motion, createFractureRotation(() => 0.1));
	assert.ok(Math.abs(fractureRotationAt(motion, motion.swayPeriod)) > 0.1);
	for (const boundary of [10000, motion.swayPeriod, motion.wanderPeriod]) {
		const before = fractureRotationAt(motion, boundary - 1);
		const at = fractureRotationAt(motion, boundary);
		const after = fractureRotationAt(motion, boundary + 1);
		assert.ok(Math.abs(after - before) < 0.004);
		assert.ok(Math.abs((after - at) - (at - before)) < 1e-6, "velocity remains continuous");
	}
});


test("only two random branches run, with independent handoffs after full retraction", () => {
	const branches: FractureBranchClock[] = Array.from({ length: 8 }, () => ({ elapsed: 0, cycle: null }));
	advanceFractureBranches(branches, 0, () => 0.5);
	assert.deepEqual(branches.flatMap((branch, index) => branch.cycle ? [index] : []), [3, 4]);

	const finishing = branches[3];
	const continuing = branches[4];
	const originalCycle = continuing.cycle;
	finishing.elapsed = finishing.cycle!.duration - 1;
	advanceFractureBranches(branches, 1, () => 0);
	assert.equal(finishing.cycle, null);
	assert.ok(branches[0].cycle);
	assert.equal(continuing.cycle, originalCycle);
	assert.equal(continuing.elapsed, 1);

	for (let frame = 0; frame < 2000; frame++) {
		advanceFractureBranches(branches, 100, () => 0.7);
		assert.equal(branches.filter((branch) => branch.cycle).length, 2);
	}
});

test("random twitches stay small, snap after a pause, and settle exactly to zero", () => {
	const a = createFractureTwitch(() => 0.1);
	const b = createFractureTwitch(() => 0.9);
	assert.equal(a.rest, 5600);
	assert.equal(b.rest, 18400);
	assert.notEqual(a.settle, b.settle);
	assert.ok(a.angle < 0 && b.angle > 0);

	for (const cycle of [a, b]) {
		assert.ok(Math.abs(cycle.angle) >= 0.3 && Math.abs(cycle.angle) <= 1);
		assert.equal(fractureTwitchAt(cycle, 0), 0);
		assert.equal(fractureTwitchAt(cycle, cycle.rest - 1), 0);
		assert.equal(fractureTwitchAt(cycle, cycle.rest), cycle.angle);
		assert.ok(Math.abs(fractureTwitchAt(cycle, cycle.rest + cycle.settle / 2)) < Math.abs(cycle.angle));
		assert.equal(fractureTwitchAt(cycle, cycle.duration), 0);
		assert.equal(fractureTwitchAt(cycle, cycle.duration + 100), 0);
	}
});

test("an occasional twitch triggers only an adjacent branch after a short delay, without cascading", () => {
	const states: FractureTwitchClock[] = Array.from({ length: 4 }, () => ({
		twitchCycle: createFractureTwitch(() => 0.5), twitchElapsed: 0,
	}));
	states[0].twitchElapsed = states[0].twitchCycle.rest - 1;
	advanceFractureTwitches(states, 1, true, () => 0);

	assert.equal(states[3].twitchReaction, true, "angular neighbors wrap around the array");
	assert.equal(states[3].twitchCycle.rest - states[3].twitchElapsed, 80);
	assert.equal(fractureTwitchAt(states[3].twitchCycle, states[3].twitchElapsed), 0);
	assert.equal(states[1].twitchReaction, undefined);
	assert.equal(states[2].twitchReaction, undefined);

	advanceFractureTwitches(states, 80, true, () => 0);
	assert.equal(fractureTwitchAt(states[3].twitchCycle, states[3].twitchElapsed), states[3].twitchCycle.angle);
	assert.equal(states[2].twitchReaction, undefined, "a response must not start a chain");
	advanceFractureTwitches(states, 300, true, () => 0);
	assert.equal(states[3].twitchReaction, false);
	assert.ok(states[3].twitchCycle.rest >= 4000);
});

test("most twitches remain independent and a reaction never interrupts an active neighbor", () => {
	for (const randomValue of [0, 0.5]) {
		const states: FractureTwitchClock[] = Array.from({ length: 2 }, () => ({
			twitchCycle: createFractureTwitch(() => 0.5), twitchElapsed: 0,
		}));
		states[0].twitchElapsed = states[0].twitchCycle.rest - 1;
		if (randomValue === 0) states[1].twitchElapsed = states[1].twitchCycle.rest + 10;
		const neighborCycle = states[1].twitchCycle;
		advanceFractureTwitches(states, 1, true, () => randomValue);
		assert.equal(states[1].twitchCycle, neighborCycle);
		assert.equal(states[1].twitchReaction, undefined);
	}
});

test("quiet scheduling cancels pending reactions, freezes pauses, and lets visible twitches settle", () => {
	const states: FractureTwitchClock[] = Array.from({ length: 3 }, () => ({
		twitchCycle: createFractureTwitch(() => 0.5), twitchElapsed: 0,
	}));
	states[0].twitchElapsed = states[0].twitchCycle.rest + 10;
	states[1].twitchElapsed = states[1].twitchCycle.rest - 1;
	states[2].twitchReaction = true;
	const visibleCycle = states[0].twitchCycle;
	const before = Math.abs(fractureTwitchAt(visibleCycle, states[0].twitchElapsed));
	advanceFractureTwitches(states, 50, false, () => 0.5);
	assert.equal(states[0].twitchCycle, visibleCycle);
	assert.ok(Math.abs(fractureTwitchAt(visibleCycle, states[0].twitchElapsed)) < before);
	assert.equal(states[1].twitchElapsed, states[1].twitchCycle.rest - 1);
	assert.equal(states[2].twitchReaction, false);
	assert.equal(states[2].twitchElapsed, 0);
	advanceFractureTwitches(states, 1000, false, () => 0.5);
	assert.ok(states.every((state) => fractureTwitchAt(state.twitchCycle, state.twitchElapsed) === 0));
});

test("global quiet waits for full retraction and twitch settling, then resumes after its whole pause", () => {
	assert.deepEqual(createFractureActivity(() => 0), { untilQuiet: 35000, quietRemaining: 5000 });
	assert.deepEqual(createFractureActivity(() => 1), { untilQuiet: 65000, quietRemaining: 10000 });
	const activity = { untilQuiet: 1, quietRemaining: 5000 };
	const branches: (FractureBranchClock & FractureTwitchClock)[] = Array.from({ length: 4 }, () => ({
		cycle: null, elapsed: 0, twitchCycle: createFractureTwitch(() => 0.5), twitchElapsed: 0,
	}));
	branches[0].cycle = createFractureDrift(() => 0.5);
	branches[0].elapsed = branches[0].cycle.duration - 20;
	branches[1].twitchElapsed = branches[1].twitchCycle.rest + 1;
	const twitchCycle = branches[1].twitchCycle;

	advanceFractureActivity(activity, branches, 1, () => 0.5);
	assert.equal(activity.untilQuiet, 0);
	assert.equal(activity.quietRemaining, 5000);
	assert.ok(branches[0].cycle, "draining cannot snap an expanded branch to rest");
	advanceFractureActivity(activity, branches, 19, () => 0.5);
	assert.equal(branches[0].cycle, null);
	assert.equal(branches[1].twitchCycle, twitchCycle);
	assert.equal(activity.quietRemaining, 5000);
	advanceFractureActivity(activity, branches, 300, () => 0.5);
	assert.ok(branches.every((branch) => !branch.cycle));
	assert.equal(activity.quietRemaining, 5000, "visible settling is not part of the quiet interval");

	advanceFractureActivity(activity, branches, 4999, () => 0.5);
	assert.equal(activity.quietRemaining, 1);
	assert.ok(branches.every((branch) => !branch.cycle && fractureTwitchAt(branch.twitchCycle, branch.twitchElapsed) === 0));
	advanceFractureActivity(activity, branches, 1, () => 0.5);
	assert.equal(branches.filter((branch) => branch.cycle).length, 2);
	assert.deepEqual(activity, createFractureActivity(() => 0.5));
});

test("random activity keeps its two-branch ceiling across repeated quiet intervals", () => {
	let seed = 42;
	const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
	const activity = createFractureActivity(random);
	const branches: (FractureBranchClock & FractureTwitchClock)[] = Array.from({ length: 8 }, () => ({
		cycle: null, elapsed: 0, twitchCycle: createFractureTwitch(random), twitchElapsed: 0,
	}));
	let quietFrames = 0;
	let resumptions = 0;
	for (let frame = 0; frame < 4000; frame++) {
		const wasQuiet = activity.untilQuiet === 0;
		advanceFractureActivity(activity, branches, 100, random);
		assert.ok(branches.filter((branch) => branch.cycle).length <= 2);
		assert.ok(branches.every((branch) => Math.abs(fractureTwitchAt(branch.twitchCycle, branch.twitchElapsed)) <= 1));
		if (wasQuiet && activity.untilQuiet > 0) resumptions++;
		if (activity.untilQuiet === 0 && branches.every((branch) => !branch.cycle)) {
			quietFrames++;
			assert.ok(branches.every((branch) => fractureTwitchAt(branch.twitchCycle, branch.twitchElapsed) === 0));
		}
	}
	assert.ok(quietFrames >= 100);
	assert.ok(resumptions >= 3);
});

test("branches expand quickly and retract independently of the shared rotational drift", () => {
	const branch = createFractureDrift(() => 0.5);
	const rotation = createFractureRotation(() => 0.5);
	const retractStart = branch.rest + branch.expand + branch.hold;
	const later = retractStart + 1000;

	assert.ok(branch.expand >= 1000 && branch.expand <= 3000);
	assert.ok(fractureDriftAt(branch, later).scale < fractureDriftAt(branch, retractStart).scale);
	assert.notEqual(fractureRotationAt(rotation, later), fractureRotationAt(rotation, retractStart));
});
