/** Branch growth and retraction use their own clock, independent of shared rotation. */
export function createFractureDrift(random = Math.random) {
	const rest = 600 + random() * 2000;
	const expand = 1000 + random() * 2000;
	const hold = 800 + random() * 1200;
	const retract = 5000 + random() * 11000;
	const moving = random() >= 0.35;
	return {
		rest, expand, hold, retract,
		duration: rest + expand + hold + retract,
		rotation: moving ? (6 + random() * 4) * (random() < 0.5 ? -1 : 1) : 0,
		scale: moving ? 1.035 + random() * 0.265 : 1,
		thickness: moving ? 1.25 + random() * 0.15 : 1,
	};
}

/** Shared rotation always moves; only individual expansion cycles may sit out. */
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
