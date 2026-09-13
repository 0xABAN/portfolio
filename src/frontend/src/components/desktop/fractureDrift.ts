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
export function advanceFractureBranches(branches: FractureBranchClock[], delta: number, random = Math.random) {
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

	while (active < 2 && idle.length) {
		const [branch] = idle.splice(Math.floor(random() * idle.length), 1);
		branch.elapsed = 0;
		branch.cycle = createFractureDrift(random);
		active++;
	}
}

/** Independent quiet intervals followed by a small angular glitch, in degrees. */
export function createFractureTwitch(random = Math.random) {
	const rest = 2000 + random() * 8000;
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

/** Shared rotation always moves, independently of branch handoffs. */
export function createFractureRotation(random = Math.random) {
	const expand = 4000 + random() * 10000;
	const hold = 800 + random() * 1200;
	const retract = 5000 + random() * 11000;
	const angle = 5 + random() * 15;

	return {
		rest: 0,
		expand,
		hold,
		retract,
		duration: expand + hold + retract,
		rotation: angle * (random() < 0.5 ? -1 : 1),
		scale: 1,
		thickness: 1,
	};
}

export function fractureDriftAt(cycle: ReturnType<typeof createFractureDrift>, elapsed: number) {
	const time = elapsed - cycle.rest;
	const progress = time <= cycle.expand ? time / cycle.expand
		: 1 - (time - cycle.expand - cycle.hold) / cycle.retract;
	const t = Math.max(0, Math.min(1, progress));
	// Ease to a stop before reversing, with no jump between randomized cycles.
	const eased = t * t * t * (t * (t * 6 - 15) + 10);
	return {
		rotation: cycle.rotation * eased,
		scale: 1 + (cycle.scale - 1) * eased,
		thickness: 1 + (cycle.thickness - 1) * eased,
	};
}
