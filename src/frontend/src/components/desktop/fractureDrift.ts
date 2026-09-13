/** Branch growth and retraction use their own clock, independent of shared rotation. */
export function createFractureDrift(random = Math.random) {
	const rest = 600 + random() * 2000;
	const expand = 1000 + random() * 2000;
	const hold = 800 + random() * 1200;
	const retract = 5000 + random() * 11000;
	return {
		rest, expand, hold, retract,
		duration: rest + expand + hold + retract,
		rotation: (6 + random() * 4) * (random() < 0.5 ? -1 : 1),
		scale: 1.035 + random() * 0.265,
		thickness: 1.25 + random() * 0.15,
	};
}

export type FractureBranchClock = {
	elapsed: number;
	cycle: ReturnType<typeof createFractureDrift> | null;
};

/** Reserve two motion slots; hand each off only after its branch fully retracts. */
export function advanceFractureBranches(branches: FractureBranchClock[], delta: number, random = Math.random, allowStarts = true) {
	// Snapshot idle branches so a finishing branch cannot immediately select itself.
	const idle = branches.filter((branch) => !branch.cycle);
	let active = 0;
	for (const branch of branches) {
		if (!branch.cycle) continue;
		branch.elapsed += delta;
		if (branch.elapsed >= branch.cycle.duration) {
			branch.cycle = null;
			branch.elapsed = 0;
		} else {
			active++;
		}
	}

	while (allowStarts && active < 2 && idle.length) {
		const [branch] = idle.splice(Math.floor(random() * idle.length), 1);
		branch.elapsed = 0;
		branch.cycle = createFractureDrift(random);
		active++;
	}
}

/** Independent quiet intervals followed by a small angular glitch, in degrees. */
export function createFractureTwitch(random = Math.random) {
	const rest = 4000 + random() * 16000;
	const settle = 120 + random() * 160;
	return {
		rest,
		settle,
		duration: rest + settle,
		angle: (0.3 + random() * 0.7) * (random() < 0.5 ? -1 : 1),
	};
}

export function fractureTwitchAt(cycle: ReturnType<typeof createFractureTwitch>, elapsed: number) {
	if (elapsed < cycle.rest || elapsed >= cycle.duration) return 0;
	// Deliberately snap outward, then quickly ease back without shifting the base rotation.
	const remaining = 1 - (elapsed - cycle.rest) / cycle.settle;
	return cycle.angle * remaining * remaining;
}

export type FractureTwitchClock = {
	twitchElapsed: number;
	twitchCycle: ReturnType<typeof createFractureTwitch>;
	/** A delayed neighbor response cannot trigger another response. */
	twitchReaction?: boolean;
};

/** Pass clocks in physical angular order; the first and last are neighbors. */
export function advanceFractureTwitches(states: FractureTwitchClock[], delta: number, allowStarts = true, random = Math.random) {
	const started: number[] = [];
	for (const [index, state] of states.entries()) {
		const { twitchCycle: cycle, twitchElapsed: previous } = state;
		if (!allowStarts && previous < cycle.rest) {
			// Drop delayed responses during a quiet spell, but preserve ordinary pauses.
			if (state.twitchReaction) {
				state.twitchCycle = createFractureTwitch(random);
				state.twitchElapsed = 0;
				state.twitchReaction = false;
			}
			continue;
		}

		state.twitchElapsed += delta;
		if (state.twitchElapsed >= cycle.duration) {
			state.twitchCycle = createFractureTwitch(random);
			state.twitchElapsed = 0;
			state.twitchReaction = false;
		} else if (previous < cycle.rest && state.twitchElapsed >= cycle.rest && !state.twitchReaction) {
			started.push(index);
		}
	}

	if (!allowStarts || states.length < 2) return;
	for (const index of started) {
		if (random() >= 0.18) continue;
		const direction = random() < 0.5 ? -1 : 1;
		const neighbor = states[(index + direction + states.length) % states.length];
		const delay = 80 + random() * 160;
		if (neighbor.twitchReaction || neighbor.twitchElapsed + delay >= neighbor.twitchCycle.rest) continue;

		// Only bring an idle neighbor forward; never interrupt an existing twitch.
		const rest = neighbor.twitchElapsed + delay;
		neighbor.twitchCycle = { ...neighbor.twitchCycle, rest, duration: rest + neighbor.twitchCycle.settle };
		neighbor.twitchReaction = true;
	}
}

/** Millisecond clocks: activity runs for 35–65s, then settles before 5–10s of quiet. */
export function createFractureActivity(random = Math.random) {
	return { untilQuiet: 35000 + random() * 30000, quietRemaining: 5000 + random() * 5000 };
}

/**
 * Advance growth and twitches together, using branches sorted by physical angle.
 * Keep shared rotation on its separate clock. Quiet time begins only after all
 * growth and visible twitches finish; idle clocks cannot start while settling.
 */
export function advanceFractureActivity(
	activity: ReturnType<typeof createFractureActivity>,
	branches: (FractureBranchClock & FractureTwitchClock)[],
	delta: number,
	random = Math.random,
) {
	if (activity.untilQuiet > 0) {
		activity.untilQuiet = Math.max(0, activity.untilQuiet - delta);
	} else if (branches.every((branch) => !branch.cycle && fractureTwitchAt(branch.twitchCycle, branch.twitchElapsed) === 0)) {
		activity.quietRemaining -= delta;
		if (activity.quietRemaining <= 0) Object.assign(activity, createFractureActivity(random));
	}

	const allowStarts = activity.untilQuiet > 0;
	advanceFractureBranches(branches, delta, random, allowStarts);
	advanceFractureTwitches(branches, delta, allowStarts, random);
}

/** Two slow, independently phased drifts avoid a repeated wind-up/return-to-zero rhythm. */
export function createFractureRotation(random = Math.random) {
	return {
		sway: 9 + random() * 3,
		swayPeriod: 90000 + random() * 60000,
		swayPhase: random() * Math.PI * 2,
		wander: 1.5 + random() * 1.5,
		wanderPeriod: 31000 + random() * 20000,
		wanderPhase: random() * Math.PI * 2,
	};
}

/** Continuous angle in degrees; the shared clock never resets between oscillations. */
export function fractureRotationAt(motion: ReturnType<typeof createFractureRotation>, elapsed: number) {
	const time = Math.max(0, elapsed);
	const t = Math.min(1, time / 10000);
	// Enter from neutral gently, including when reduced motion is turned off.
	const entrance = t * t * t * (t * (t * 6 - 15) + 10);
	const sway = motion.sway * Math.sin(time * Math.PI * 2 / motion.swayPeriod + motion.swayPhase);
	const wander = motion.wander * Math.sin(time * Math.PI * 2 / motion.wanderPeriod + motion.wanderPhase);
	return entrance * (sway + wander);
}

/** Normalized outward growth, independent of a branch's chosen scale or thickness. */
export function fractureGrowthAt(cycle: ReturnType<typeof createFractureDrift>, elapsed: number) {
	const time = elapsed - cycle.rest;
	const progress = time <= cycle.expand ? time / cycle.expand
		: 1 - (time - cycle.expand - cycle.hold) / cycle.retract;
	const t = Math.max(0, Math.min(1, progress));
	// Ease to a stop before reversing, with no jump between randomized cycles.
	return t * t * t * (t * (t * 6 - 15) + 10);
}

export function fractureDriftAt(cycle: ReturnType<typeof createFractureDrift>, elapsed: number) {
	const eased = fractureGrowthAt(cycle, elapsed);
	return {
		rotation: cycle.rotation * eased,
		scale: 1 + (cycle.scale - 1) * eased,
		thickness: 1 + (cycle.thickness - 1) * eased,
	};
}
