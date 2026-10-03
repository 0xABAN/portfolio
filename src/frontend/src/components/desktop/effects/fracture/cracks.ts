/**
 * Shape and motion of the fracture, free of DOM and WebGL.
 *
 * Modelled on a smashed display: straight cracks radiate from the impact, from
 * heavy black fissures that stay thick for most of their length to hairlines.
 * Some fork on the way out, cross-cracks join neighbouring radials into a web,
 * and wedges of dead glass fan out between radials around the impact. Radials
 * rest at part of their length and now and then grow further before slowly
 * retracting.
 *
 * Layout units are half the viewport diagonal, so a crack of length 1 reaches
 * the corners at any aspect ratio. Widths are CSS px for a 900px half-diagonal.
 */

/** Fixed, so every visit shows the same composed fracture. */
const SEED = 0x7c3a91;
const TAU = Math.PI * 2;
const REFERENCE_UNIT = 900;

/** Floats per segment: a.xy, b.xy (CSS px), shard half-width at a and b, line half-width, square ends (0 or 1). */
export const SEGMENT_FLOATS = 8;
/** Candidate ids are 16-bit; this bounds the per-frame upload and GPU work. */
export const MAX_SEGMENTS = 1024;
/** Widest a shard's half-width may get on screen, CSS px; the candidate pass skips segments further away. */
export const WIDEST_SHARD = 140;

const FISSURE = 0;
const CRACK = 1;
const HAIR = 2;
/** Kinds of the radial cracks in order around the impact: F fissure, C crack, H hairline. */
const RADIALS = [..."FHCHHFHHCHFHHCHFHCHHFHHCHFHC"].map((letter) => ({ F: FISSURE, C: CRACK, H: HAIR })[letter] ?? HAIR);
/** Rings of cross-cracks: radius (layout units) and the chance of joining each pair of radials. */
const RINGS = [[0.04, 0.6], [0.085, 0.5], [0.14, 0.4], [0.22, 0.25]] as const;
const WEDGE_CHANCE = 0.3;
/** Red margin a wedge keeps from neighbouring branches, reference px. */
const WEDGE_MARGIN = 8;
/** Share of a wedge's length beyond which the margin applies; nearer the impact everything converges. */
const WEDGE_CLEAR_FROM = 0.7;
/** Narrowest half-angle worth drawing as a wedge, radians. */
const WEDGE_NARROWEST = 0.04;
const SLIVERS = 14;
/** Spacing of the points that let a shard's width vary along it, layout units. */
const STEP = 0.03;

type Range = readonly [number, number];
type Profile = {
	length: Range;
	/** Peak shard half-width, reference px; 0 for a bare crack line. */
	width: Range;
	/** Share of the length the shard spans before it closes up. */
	end: Range;
	/** Crack-line half-width, reference px. */
	line: Range;
	/** Straight runs the crack is made of. */
	runs: Range;
	/** Share of the length shown between growth spurts. */
	rest: Range;
	forks: Range;
};
const PROFILES: Record<number, Profile> = {
	[FISSURE]: { length: [0.85, 1.2], width: [14, 26], end: [0.75, 0.95], line: [1.3, 1.7], runs: [3, 5], rest: [0.85, 0.95], forks: [1, 2] },
	[CRACK]: { length: [0.75, 1.1], width: [6, 11], end: [0.7, 0.9], line: [1, 1.4], runs: [2, 4], rest: [0.8, 0.92], forks: [0, 2] },
	[HAIR]: { length: [0.25, 1.15], width: [0, 0], end: [0, 0], line: [0.6, 1], runs: [1, 3], rest: [0.65, 0.9], forks: [0, 1] },
};

// Motion timing, in seconds and radians.
const BURST = 0.6;
const GROW = 1.4;
const HOLD = 1.6;
const RETRACT = 7;
const SWAY = (3 * Math.PI) / 180;
const WANDER = (1 * Math.PI) / 180;
const SWAY_ENTRANCE = 8;
/** Share of a radial's growth over which a growing tip tapers to a point. */
const TIP = 0.05;
/** One glitch burst falls at a random moment in every slot of this many seconds. */
const GLITCH_SLOT = 6;
const GLITCH_BURST = 0.3;
/** Burst frames hold this long, so the corruption jumps rather than flickers. */
const GLITCH_STEP = 0.06;

type Point = { x: number; y: number };

/** A straight-segmented crack. Per-point values are static; motion is applied per frame. */
type Crack = {
	points: Point[];
	/** Share (0..1) of its radial's growth at which each point appears. */
	appear: number[];
	/** Shard half-width at each point, reference px. */
	shard: number[];
	/** Crack-line half-width, reference px. */
	line: number;
	/** Square ends, for wedges of glass; otherwise rounded. */
	square: boolean;
	/** The radial whose growth this crack follows. */
	radial: number;
};

/** Growth of one radial crack, shared by the cracks attached to it. */
type Growth = { rest: number; delay: number; period: number; phase: number };

export type Fracture = { cracks: Crack[]; growth: Growth[] };

/** Per-frame inputs, reused by the caller to avoid allocating every frame. */
export type FrameInput = {
	time: number;
	/** Clock time of the impact; null while the screen is intact. */
	struckAt: number | null;
	/** Reduced motion: the settled fracture, without any movement. */
	still: boolean;
	width: number;
	height: number;
	/** Eased cursor x, y and presence (0..1), CSS px. */
	pointer: Float32Array;
};

export function createFracture(random = mulberry32(SEED)): Fracture {
	const between = (min: number, max: number) => min + random() * (max - min);
	const pick = ([min, max]: Range) => between(min, max);
	const cracks: Crack[] = [];
	const growth: Growth[] = [];
	const turn = random() * TAU;

	/**
	 * A crack along `points`. Where it has a shard, it is resampled so the width
	 * can vary: a slim spindle that widens out of the impact and closes to a
	 * needle point at `end` of the length, unevenly along the way.
	 */
	function add(points: Point[], peak: number, end: number, line: number, radial: number, appearFrom: number) {
		const total = arcLengths(points).at(-1) ?? 0;
		const fine = peak > 0 ? resample(points, STEP, total * end) : points;
		const arc = arcLengths(fine);
		// A gentle random walk, so the width wanders instead of beading; now and then a piece is missing.
		let wander = 1;
		const crack: Crack = {
			points: fine,
			appear: arc.map((s) => appearFrom + (1 - appearFrom) * (s / total)),
			shard: arc.map((s) => {
				wander = 0.6 * wander + 0.4 * between(0.7, 1.2);
				return peak > 0 ? peak * spindle(s / total, end) * (random() < 0.05 ? 0.5 : wander) : 0;
			}),
			line,
			square: false,
			radial,
		};
		cracks.push(crack);
		return crack;
	}

	const radials = RADIALS.map((kind, radial) => {
		const profile = PROFILES[kind];
		const heading = turn + ((radial + between(-0.35, 0.35)) * TAU) / RADIALS.length;
		const points = straight(random, { x: 0, y: 0 }, heading, pick(profile.length), Math.round(pick(profile.runs)), 0.06);
		const crack = add(points, pick(profile.width), pick(profile.end), pick(profile.line), radial, 0);
		growth.push({ rest: pick(profile.rest), delay: between(0, 0.12), period: between(18, 38), phase: between(0, 38) });

		// Forks split off part-way out and finish growing with their radial.
		for (let n = Math.round(pick(profile.forks)); n > 0; n--) {
			const i = Math.min(crack.points.length - 2, Math.floor(between(0.25, 0.75) * (crack.points.length - 1)));
			const [from, next] = [crack.points[i], crack.points[i + 1]];
			const direction = Math.atan2(next.y - from.y, next.x - from.x) + (random() < 0.5 ? -1 : 1) * between(0.15, 0.45);
			const fork = straight(random, from, direction, between(0.15, 0.45), Math.round(between(1, 3)), 0.07);
			add(fork, Math.min(crack.shard[i] * 0.5, 10), 0.6, between(0.6, 1), radial, crack.appear[i]);
		}
		return crack;
	});

	// Radials and their forks, which the wedges keep clear of.
	const branches = [...cracks];

	// Cross-cracks join neighbouring radials into a web around the impact.
	for (const [radius, chance] of RINGS) {
		radials.forEach((crack, i) => {
			if (random() > chance) return;
			const a = pointAt(crack, radius * between(0.85, 1.15));
			const b = pointAt(radials[(i + 1) % radials.length], radius * between(0.85, 1.15));
			if (a && b) cracks.push({ points: [a.point, b.point], appear: [a.appear, a.appear], shard: [0, 0], line: between(0.6, 1), square: false, radial: i });
		});
	}

	// Wedges of dead glass: triangles from the impact between neighbouring radials, reaching past the
	// central windows and cut straight across at their outer end. Each sits in the widest stretch of
	// its gap that every branch leaves free over the wedge's outer part, keeping a red margin.
	radials.forEach((crack, i) => {
		if (random() > WEDGE_CHANCE) return;
		const start = headingOf(crack);
		const gap = (((headingOf(radials[(i + 1) % radials.length]) - start) % TAU) + TAU) % TAU;
		if (gap > 0.4) return;
		const length = between(0.3, 0.5);
		const fill = between(0.75, 1);
		const free = widestFree(branches, start, gap, length);
		const half = (free.width / 2) * fill;
		if (half < WEDGE_NARROWEST) return;
		const axis = start + free.middle;
		const width = length * REFERENCE_UNIT * Math.tan(half);
		const tip = { x: Math.cos(axis) * length, y: Math.sin(axis) * length };
		cracks.push({ points: [{ x: 0, y: 0 }, tip], appear: [0, 0.5], shard: [0, width], line: 0, square: true, radial: i });
	});

	// Slivers of missing glass around the impact.
	for (let n = 0; n < SLIVERS; n++) {
		const angle = random() * TAU;
		const distance = between(0.03, 0.2);
		const heading = random() * TAU;
		const half = between(0.008, 0.025);
		const centre = { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
		const width = between(4, 9);
		cracks.push({
			points: [-1, 1].map((t) => ({ x: centre.x + Math.cos(heading) * half * t, y: centre.y + Math.sin(heading) * half * t })),
			appear: [distance / 0.3, distance / 0.3],
			shard: [width, width * between(0.2, 0.7)],
			line: 0,
			square: false,
			radial: Math.floor(random() * RADIALS.length),
		});
	}

	return { cracks, growth };
}

/** A few straight runs, each turning slightly from the last. */
function straight(random: () => number, origin: Point, heading: number, length: number, runs: number, kink: number) {
	const points = [origin];
	let direction = heading;
	for (let i = 0; i < runs; i++) {
		direction += (random() - 0.5) * 2 * kink;
		const step = (length / runs) * (0.7 + 0.6 * random());
		const last = points[points.length - 1];
		points.push({ x: last.x + Math.cos(direction) * step, y: last.y + Math.sin(direction) * step });
	}
	return points;
}

/** Splits runs into pieces no longer than `step`, up to arc length `until`; later runs stay whole. */
function resample(points: Point[], step: number, until: number) {
	const fine = [points[0]];
	let travelled = 0;
	for (let i = 1; i < points.length; i++) {
		const [a, b] = [points[i - 1], points[i]];
		const length = Math.hypot(b.x - a.x, b.y - a.y);
		const pieces = travelled < until ? Math.max(1, Math.ceil(length / step)) : 1;
		for (let k = 1; k <= pieces; k++) fine.push({ x: a.x + ((b.x - a.x) * k) / pieces, y: a.y + ((b.y - a.y) * k) / pieces });
		travelled += length;
	}
	return fine;
}

/** 0..1 width at share `u` of a shard's length: widens out of the impact, then tapers to a point at `end`. */
function spindle(u: number, end: number) {
	if (u >= end) return 0;
	const widest = 0.35 * end;
	return u < widest ? 0.3 + 0.7 * smooth(u / widest) : 1 - smooth((u - widest) / (end - widest));
}

/** Direction of a crack's first run. */
function headingOf(crack: Crack) {
	const [a, b] = crack.points;
	return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * The widest angular stretch of the gap [start, start + gap] that no branch comes within
 * WEDGE_MARGIN of, between WEDGE_CLEAR_FROM of `length` and `length` from the impact.
 * Angles are radians relative to `start`.
 */
function widestFree(branches: Crack[], start: number, gap: number, length: number) {
	const blocked: [number, number][] = [];
	for (const branch of branches) {
		const total = arcLengths(branch.points).at(-1) ?? 0;
		for (let s = STEP / 2; s < total; s += STEP / 2) {
			const at = pointAt(branch, s);
			const r = at ? Math.hypot(at.point.x, at.point.y) : 0;
			if (!at || r < WEDGE_CLEAR_FROM * length || r > length) continue;
			const angle = ((((Math.atan2(at.point.y, at.point.x) - start) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
			const clearance = (at.shard + WEDGE_MARGIN) / (r * REFERENCE_UNIT);
			blocked.push([angle - clearance, angle + clearance]);
		}
	}
	blocked.sort((a, b) => a[0] - b[0]);
	let best = { middle: gap / 2, width: 0 };
	let from = 0;
	for (const [low, high] of [...blocked, [gap, gap] as [number, number]]) {
		const to = Math.min(low, gap);
		if (to - from > best.width) best = { middle: (from + to) / 2, width: to - from };
		from = Math.max(from, high);
	}
	return best;
}

/** The point at arc length `s` along a crack, or null past its end. */
function pointAt(crack: Crack, s: number) {
	const arc = arcLengths(crack.points);
	const i = arc.findIndex((value) => value >= s);
	if (i <= 0) return null;
	const t = (s - arc[i - 1]) / (arc[i] - arc[i - 1]);
	const [a, b] = [crack.points[i - 1], crack.points[i]];
	const lerp = (values: number[]) => values[i - 1] + (values[i] - values[i - 1]) * t;
	return { point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, appear: lerp(crack.appear), shard: lerp(crack.shard) };
}

function arcLengths(points: Point[]) {
	const lengths = [0];
	for (let i = 1; i < points.length; i++) {
		lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
	}
	return lengths;
}

/** Rotation of the whole fracture around the impact, easing in after it lands. */
export function swayAngle({ time, struckAt, still }: FrameInput) {
	if (struckAt === null || still) return 0;
	const entrance = smooth(clamp((time - struckAt) / SWAY_ENTRANCE, 0, 1));
	return entrance * (SWAY * Math.sin((time * TAU) / 70 + 1.3) + WANDER * Math.sin((time * TAU) / 23 + 4.1));
}

/**
 * Writes the display glitch state into `out`: whether the screen is broken
 * (0 or 1), whether a burst is running (0 or 1), and a seed that changes every
 * few frames of a burst, so the corruption jumps around.
 */
export function writeGlitch({ time, struckAt, still }: FrameInput, out: Float32Array) {
	out.fill(0);
	if (struckAt === null) return out;
	out[0] = 1;
	if (still || time - struckAt < BURST) return out;

	const slot = Math.floor(time / GLITCH_SLOT);
	const into = time - slot * GLITCH_SLOT - mulberry32(slot)() * (GLITCH_SLOT - GLITCH_BURST);
	if (into < 0 || into >= GLITCH_BURST) return out;
	out[1] = 1;
	// Small seeds keep the GPU hashes precise.
	out[2] = (slot % 997) * 8 + Math.floor(into / GLITCH_STEP) + 1;
	return out;
}

/**
 * Animates every crack for this frame and writes its visible segments into
 * `out`, in screen CSS px. The first segment is the crater. Returns the count.
 */
export function writeSegments({ cracks, growth }: Fracture, out: Float32Array, frame: FrameInput) {
	const { time, struckAt, still, width, height, pointer } = frame;
	if (struckAt === null) return 0;

	const age = still ? Infinity : time - struckAt;
	const unit = Math.hypot(width, height) / 2;
	const scale = clamp(unit / REFERENCE_UNIT, 0.6, 1.4);
	const cx = width / 2;
	const cy = height / 2;
	const angle = swayAngle(frame);
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);

	let count = 0;
	const segment = (ax: number, ay: number, bx: number, by: number, shardA: number, shardB: number, line: number, square: number) => {
		if (count === MAX_SEGMENTS) return;
		const at = count++ * SEGMENT_FLOATS;
		out[at] = ax;
		out[at + 1] = ay;
		out[at + 2] = bx;
		out[at + 3] = by;
		out[at + 4] = shardA;
		out[at + 5] = shardB;
		out[at + 6] = line;
		out[at + 7] = square;
	};

	const crater = 18 * scale * ease(clamp(age / 0.15, 0, 1));
	segment(cx, cy, cx, cy, crater, crater, 0, 0);

	// Where a point of a crack lands this frame, and how wide it is there.
	let x = 0;
	let y = 0;
	let shard = 0;
	let tip = 0;
	const place = (crack: Crack, i: number, t: number, reveal: number, swelling: number) => {
		const j = Math.min(i + 1, crack.points.length - 1);
		const at = (values: number[]) => values[i] + (values[j] - values[i]) * t;
		const px = (crack.points[i].x + (crack.points[j].x - crack.points[i].x) * t) * unit;
		const py = (crack.points[i].y + (crack.points[j].y - crack.points[i].y) * t) * unit;
		x = cx + px * cos - py * sin;
		y = cy + px * sin + py * cos;

		// Outer parts reach towards a nearby cursor; the centre stays put, so the web holds together.
		const dx = pointer[0] - x;
		const dy = pointer[1] - y;
		const gap = Math.hypot(dx, dy);
		const pull = pointer[2] * Math.exp((-gap * gap) / 60000) * smooth(clamp((Math.hypot(px, py) / unit - 0.15) / 0.45, 0, 1));
		if (gap > 1) {
			x += (dx / gap) * Math.min(gap * 0.5, 30) * pull;
			y += (dy / gap) * Math.min(gap * 0.5, 30) * pull;
		}

		tip = clamp((reveal - at(crack.appear)) / TIP, 0, 1) * scale;
		shard = Math.min(WIDEST_SHARD, at(crack.shard) * tip * (1 + 0.25 * swelling));
	};

	for (const crack of cracks) {
		const radial = growth[crack.radial];
		const burst = still ? 1 : ease(clamp((age - radial.delay) / BURST, 0, 1));
		const swelling = still ? 0 : grown(radial, time);
		const reveal = (radial.rest + (1 - radial.rest) * swelling) * burst;
		if (crack.appear[0] >= reveal) continue;

		place(crack, 0, 0, reveal, swelling);
		for (let i = 1; i < crack.points.length; i++) {
			const [ax, ay, shardA, tipA] = [x, y, shard, tip];
			// The growing front cuts the segment it falls inside.
			const visible = crack.appear[i] <= reveal;
			const span = crack.appear[i] - crack.appear[i - 1];
			const t = visible || span <= 0 ? 1 : (reveal - crack.appear[i - 1]) / span;
			place(crack, i - 1, t, reveal, swelling);
			segment(ax, ay, x, y, shardA, shard, (crack.line * (tipA + tip)) / 2, crack.square ? 1 : 0);
			if (!visible) break;
		}
	}
	return count;
}

/** 0 at rest, 1 fully grown: a quick spurt, a pause, then a slow retreat. */
function grown(radial: Growth, time: number) {
	const t = (((time + radial.phase) % radial.period) + radial.period) % radial.period;
	if (t < GROW) return ease(t / GROW);
	if (t < GROW + HOLD) return 1;
	return 1 - smooth(clamp((t - GROW - HOLD) / RETRACT, 0, 1));
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const ease = (t: number) => 1 - (1 - t) ** 3;
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Small, fast seeded generator (mulberry32). */
function mulberry32(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
