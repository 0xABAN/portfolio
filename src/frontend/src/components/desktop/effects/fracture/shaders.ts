import { WIDEST_SHARD } from "./cracks";

/** CSS px per cell of the candidate pass. */
export const CELL = 8;
/** CSS px beyond which a crack cannot mark a pixel. */
export const REACH = 48;
/** Cells per side of a tile, the unit segments are grouped by for the candidate pass. */
export const TILE_CELLS = 8;
/** Segment ids per row of the candidate pass's id list. */
export const LIST_WIDTH = 2048;

const PRELUDE = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
`;

/** Crack uniforms and helpers shared by the candidate and screen passes. Positions are CSS px from the top left. */
const HEADER = /* glsl */ `${PRELUDE}
uniform vec2 uGrid;                // candidate cells across and down
uniform highp sampler2D uSegments; // two texels per segment: ends, then shape

const float CELL = ${CELL.toFixed(1)};
const uint NONE = 65535u; // candidate id of an empty slot
const float REACH = ${REACH.toFixed(1)}; // CSS px beyond which a crack cannot mark a pixel
const float FAR = 1e4;

struct Hit {
	float shard;     // signed CSS px to the shard's edge, negative inside
	float line;      // signed CSS px to the crack line's edge, negative inside
	float width;     // shard half-width there
	float lineWidth; // crack-line half-width
};

Hit measure(uint id, vec2 p) {
	vec4 ends = texelFetch(uSegments, ivec2(0, int(id)), 0);
	vec4 shape = texelFetch(uSegments, ivec2(1, int(id)), 0); // shard half-width at a and b, line half-width, square ends
	vec2 along = ends.zw - ends.xy;
	vec2 offset = p - ends.xy;
	float length2 = max(dot(along, along), 1e-6);
	float t = dot(offset, along) / length2;
	float h = clamp(t, 0.0, 1.0);
	float centre = length(offset - along * h);
	Hit hit = Hit(FAR, FAR, mix(shape.x, shape.y, h), shape.z);
	if (hit.width > 0.0) {
		// Wedges of glass are cut straight across their ends; everything else is rounded.
		float across = abs(along.x * offset.y - along.y * offset.x) * inversesqrt(length2);
		hit.shard = shape.w > 0.5 ? max(across - hit.width, (abs(t - 0.5) - 0.5) * sqrt(length2)) : centre - hit.width;
	}
	if (hit.lineWidth > 0.0) hit.line = centre - hit.lineWidth;
	return hit;
}

// Distance outside a crack, stretched for slim ones: heavy cracks throw debris further.
float reach(Hit hit) {
	float weight = clamp(max(hit.width / 8.0, hit.lineWidth / 3.0), 0.15, 1.0);
	return max(min(hit.shard, hit.line), 0.0) / weight;
}
`;

/** One oversized triangle covers the target without any vertex buffers. */
export const FULLSCREEN_VERTEX = /* glsl */ `#version 300 es
void main() {
	vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
	gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * Picks the segments that matter around each cell: the one with the nearest
 * edge, which decides what is drawn, and the one with the smallest reach,
 * which decides where debris falls. Each cell checks only the segments listed
 * for its tile (see tiles.ts), in ascending order, so ties go to the same
 * segment as when checking all of them.
 */
export const CANDIDATE_FRAGMENT = /* glsl */ `${HEADER}
uniform highp usampler2D uTiles; // per tile: first entry in uList, entry count
uniform highp usampler2D uList;  // segment ids, tile after tile, LIST_WIDTH to a row
out uvec2 candidates;

// Widest a shard can get, CSS px: segments further than this plus REACH are skipped cheaply.
const float WIDEST = ${WIDEST_SHARD.toFixed(1)};
const int TILE_CELLS = ${TILE_CELLS};
const uint LIST_WIDTH = ${LIST_WIDTH}u;

void main() {
	ivec2 cell = ivec2(gl_FragCoord.x, uGrid.y - gl_FragCoord.y);
	vec2 centre = (vec2(cell) + 0.5) * CELL;
	// Pixels read the four cells around them, so allow a cell of slack.
	float limit = REACH + CELL;
	vec2 best = vec2(limit); // nearest edge, smallest reach
	uvec2 ids = uvec2(NONE);

	uvec2 run = texelFetch(uTiles, cell / TILE_CELLS, 0).rg;
	for (uint entry = run.x; entry < run.x + run.y; entry++) {
		uint i = texelFetch(uList, ivec2(entry % LIST_WIDTH, entry / LIST_WIDTH), 0).r;
		vec4 ends = texelFetch(uSegments, ivec2(0, int(i)), 0);
		float margin = limit + WIDEST;
		if (any(lessThan(centre, min(ends.xy, ends.zw) - margin)) || any(greaterThan(centre, max(ends.xy, ends.zw) + margin))) continue;
		Hit hit = measure(i, centre);
		vec2 score = vec2(min(hit.shard, hit.line), reach(hit));
		bvec2 better = lessThan(score, best);
		best = mix(best, score, better);
		ids = uvec2(better.x ? i : ids.x, better.y ? i : ids.y);
	}
	candidates = ids;
}`;

/** Colours, hashes and the burst tear shared by the damage and screen passes. */
const DISPLAY = /* glsl */ `
uniform vec2 uResolution; // backing-store pixels
uniform float uScale;     // backing-store pixels per CSS pixel
uniform vec2 uCenter;     // the impact
uniform vec2 uGlitch;     // burst (0 or 1), burst seed

// Averages to the desktop's #af0000 once the streaks even out.
const vec3 RED = vec3(0.686, 0.0, 0.0);
const vec3 DARK = vec3(0.3, 0.0, 0.0);
const vec3 HOT = vec3(1.0, 0.12, 0.08);
const vec3 INK = vec3(0.03, 0.0, 0.0);
const vec3 GLINT = vec3(1.0, 0.62, 0.58);

// A damage texel holds a gain for the screen content, then the ids of a colour
// painted over it and of a stuck line over everything; id 0 is none. The gain
// is in 204ths, so 204 is exactly 1 and 255 the brightest, 1.25.
const float GAIN_STEPS = 204.0;
const vec3 PAINT[3] = vec3[3](vec3(0.0), DARK, HOT);
const vec3 STUCK[3] = vec3[3](vec3(0.0), HOT, INK);

// Sine-free hash (Dave Hoskins), stable across GPU vendors.
float hash(vec2 p) {
	vec3 q = fract(p.xyx * 0.1031);
	q += dot(q, q.yzx + 33.33);
	return fract((q.x + q.y) * q.z);
}

// A fixed 0..1 number for a key and a seed.
float pick(float key, float seed) {
	return hash(vec2(key + 0.5, seed * 1.37 + 0.25));
}

// Bursts tear a few bands of the screen sideways, cracks and all.
vec2 tear(vec2 p, float burst, float seed) {
	if (burst > 0.0) {
		float band = floor(p.y / 12.0);
		p.x += step(0.8, pick(band, seed + 21.0)) * (pick(band, seed + 22.0) - 0.5) * 48.0;
	}
	return p;
}
`;

/**
 * Display damage that holds still between glitch bursts: misaligned striped
 * blocks, rows of dashes and stuck pixel lines, all densest around the impact.
 * It depends only on the screen size and the burst, so the renderer draws it
 * into a texture when either changes rather than for every frame.
 */
export const DAMAGE_FRAGMENT = /* glsl */ `${PRELUDE}${DISPLAY}
out uvec4 damage; // gain in GAIN_STEPS, PAINT id, STUCK id, unused

// Damaged blocks sit one per tile at most, so each pixel checks only its own tile.
const vec2 TILE = vec2(220.0, 48.0);

// Striped blocks and rows of dashes under the cracks, as (gain, PAINT id):
// the screen content is scaled by the gain, then painted over. 'unit' is half
// the screen diagonal.
vec2 corrupt(vec2 p, float unit, float seed) {
	vec2 result = vec2(1.0, 0.0);

	// Each row of tiles is offset sideways, so the blocks never line up into a grid.
	float tileRow = floor(p.y / TILE.y);
	float column = floor((p.x + pick(tileRow, 30.0) * TILE.x) / TILE.x);
	float key = column * 31.0 + tileRow;
	// During a burst, some blocks jump to new places.
	float s = pick(key, seed + 3.0) < 0.5 ? seed : 0.0;
	vec2 origin = vec2(column * TILE.x - pick(tileRow, 30.0) * TILE.x, tileRow * TILE.y);
	float near = exp(-length(origin + 0.5 * TILE - uCenter) / (0.35 * unit));
	if (pick(key, s + 1.0) < 0.6 * near) {
		vec2 size = TILE * vec2(mix(0.2, 0.9, pick(key, s + 4.0)), mix(0.2, 0.85, pick(key, s + 5.0)));
		vec2 corner = origin + (TILE - size) * vec2(pick(key, s + 2.0), pick(key, s + 7.0));
		vec2 inside = p - corner;
		if (all(greaterThanEqual(inside, vec2(0.0))) && all(lessThan(inside, size))) {
			// Stripes of uneven spacing and weight; a few blocks are solid bars instead.
			// Stripes keep the screen content, brightened or dimmed; the gaps are dark.
			float period = floor(mix(2.0, 9.0, pick(key, s + 8.0)));
			float weight = mix(0.25, 0.75, pick(key, s + 9.0));
			bool stripe = pick(key, s + 10.0) < 0.25 || fract(inside.y / period) >= weight;
			result = stripe ? vec2(mix(0.8, 1.25, pick(key, s + 6.0)), 0.0) : vec2(0.0, 1.0);
		}
	}

	// Rows of dashes, densest level with the impact.
	float row = floor(p.y / 5.0);
	if (pick(row, seed + 11.0) < 0.35 * exp(-abs(p.y - uCenter.y) / (0.3 * unit))) {
		float start = uCenter.x + (pick(row, seed + 12.0) - 0.5) * 1.6 * unit;
		float run = mix(40.0, 480.0, pick(row, seed + 13.0) * pick(row, seed + 14.0));
		float dash = floor((p.x - start) / mix(6.0, 24.0, pick(row, 15.0)));
		bool on = p.x > start && p.x < start + run && mod(p.y, 5.0) < 3.0 && pick(dash, row + seed) < 0.65;
		if (on) result = vec2(0.0, pick(row, seed + 16.0) < 0.65 ? 1.0 : 2.0);
	}
	return result;
}

// Stuck pixel lines over everything, as a STUCK id: a few dead 2px columns and
// rows near the impact, each running from a point near it to the edge of the screen.
float stuck(vec2 p, float unit, float seed) {
	float id = 0.0;
	for (int axis = 0; axis < 2; axis++) {
		bool vertical = axis == 0;
		vec2 q = vertical ? p : p.yx;
		vec2 c = vertical ? uCenter : uCenter.yx;
		float line = floor(q.x / 2.0) + (vertical ? 0.0 : 5000.0);
		float chance = (vertical ? 0.02 : 0.01) * exp(-abs(q.x - c.x) / (0.3 * unit));
		// Bursts make some lines drop out for a moment.
		if (pick(line, 60.0) >= chance || (seed > 0.0 && pick(line, seed + 50.0) < 0.4)) continue;
		float from = c.y + (pick(line, 61.0) - 0.5) * 0.3 * unit;
		float towards = pick(line, 62.0) < 0.5 ? -1.0 : 1.0;
		if ((q.y - from) * towards > 0.0) id = pick(line, 63.0) < 0.6 ? 1.0 : 2.0;
	}
	return id;
}

void main() {
	vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uScale;
	float unit = 0.5 * length(uResolution / uScale);
	float burst = uGlitch.x;
	float seed = burst * uGlitch.y;
	p = tear(p, burst, seed);

	vec2 corruption = corrupt(p, unit, seed);
	damage = uvec4(uint(round(corruption.x * GAIN_STEPS)), uint(corruption.y), uint(stuck(p, unit, seed)), 0u);
}`;

/**
 * The broken screen. Measures each pixel exactly against the candidates of
 * the four cells around it, then draws black fissures with toothed edges,
 * crisp crack lines and debris clustered beside the cracks, over red screen
 * content with drifting horizontal streaks. Flat, axis-aligned display damage
 * makes it glitch: misaligned blocks, rows of dashes, a red copy of the cracks
 * slipped out of register, stuck pixel lines, and bursts that tear and
 * reshuffle it all. Debris texture is taken in glass space, so it turns with
 * the fracture; display damage stays aligned to the screen. The damage itself
 * comes from DAMAGE_FRAGMENT, read back one texel per pixel.
 */
export const SCREEN_FRAGMENT = /* glsl */ `${HEADER}${DISPLAY}
uniform float uTime;      // seconds
uniform float uSway;      // radians the fracture is turned around the impact
uniform highp usampler2D uCandidates;
uniform highp usampler2D uDamage; // from DAMAGE_FRAGMENT, one texel per pixel
out vec4 color;

// CSS px the red image has slipped against the cracks near the impact; more during bursts.
const vec2 SLIP = vec2(3.0, -1.0);

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), u.x), u.y);
}

// Screen content: long horizontal bands and thin bars of uneven length, drifting slowly.
vec3 screen(vec2 p) {
	float bands = noise(vec2(p.x * 0.0035 - uTime * 0.012, p.y * 0.045)) - 0.5;
	float row = floor(p.y / 2.0);
	float bars = step(0.8, noise(vec2(p.x * 0.01 + row * 7.31 - uTime * 0.05, row * 0.61))) - 0.2;
	return RED * (1.0 + 0.08 * bands + 0.05 * bars);
}

// A stuck line from the damage pass covers everything under it.
vec3 overStuck(vec3 color, uint id) {
	return id == 0u ? color : STUCK[id];
}

void main() {
	vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uScale;
	float aa = 0.5 / uScale;
	float dither = (hash(gl_FragCoord.xy + fract(uTime) * 97.0) - 0.5) / 255.0;
	float unit = 0.5 * length(uResolution / uScale);
	float burst = uGlitch.x;
	float seed = burst * uGlitch.y;

	p = tear(p, burst, seed);
	uvec4 damage = texelFetch(uDamage, ivec2(gl_FragCoord.xy), 0);
	vec3 base = screen(p) * (float(damage.r) / GAIN_STEPS) + PAINT[damage.g];

	// Candidates of the four cells around this pixel. Most of the screen is
	// nowhere near a crack and stops here.
	uvec2 cells[4];
	bool found = false;
	vec2 cell = floor(p / CELL - 0.5);
	for (int k = 0; k < 4; k++) {
		vec2 index = clamp(cell + vec2(k & 1, k >> 1), vec2(0.0), uGrid - 1.0);
		cells[k] = texelFetch(uCandidates, ivec2(index.x, uGrid.y - 1.0 - index.y), 0).rg;
		found = found || cells[k].x != NONE || cells[k].y != NONE;
	}
	if (!found) {
		color = vec4(overStuck(base, damage.b) + dither, 1.0);
		return;
	}

	// The cracks near this pixel, measured exactly.
	float shardEdge = FAR;
	float shardWidth = 0.0;
	uint shardId = NONE;
	float lineEdge = FAR;
	float lineWidth = 0.0;
	uint lineId = NONE;
	float near = FAR;
	uint last = NONE;
	for (int k = 0; k < 8; k++) {
		uint id = cells[k >> 1][k & 1];
		// Neighbouring cells mostly share candidates; skip immediate repeats.
		if (id == NONE || id == last) continue;
		last = id;
		Hit hit = measure(id, p);
		if (hit.shard < shardEdge) {
			shardEdge = hit.shard;
			shardWidth = hit.width;
			shardId = id;
		}
		if (hit.line < lineEdge) {
			lineEdge = hit.line;
			lineWidth = hit.lineWidth;
			lineId = id;
		}
		near = min(near, reach(hit));
	}

	// Debris texture lives on the glass, turning with it.
	vec2 glass = mat2(cos(uSway), -sin(uSway), sin(uSway), cos(uSway)) * (p - uCenter);

	// Fissures: shallow chips where glass broke away, fine teeth where pixels died along the edge.
	float shard = 0.0;
	float roughness = 0.0;
	if (shardEdge < 12.0) {
		float chips = (noise(glass * 0.09) - 0.5) * min(shardWidth, 12.0) * 0.3;
		float teeth = (noise(glass * 0.55 + 31.0) - 0.5) * 2.0;
		roughness = chips + teeth;
		shard = 1.0 - smoothstep(-aa, aa, shardEdge + roughness);
	}

	// Crack lines thinner than a pixel fade rather than break up; thin ones catch a faint glint.
	float line = clamp(0.5 - lineEdge * uScale, 0.0, 1.0) * min(1.0, 2.0 * lineWidth * uScale);
	float glint = (1.0 - smoothstep(0.3, 1.6, lineEdge)) * (1.0 - line) * (1.0 - smoothstep(0.7, 1.3, lineWidth));

	// Near the impact the red image has slipped out of register, leaving a hot
	// copy of the nearest crack beside it. It can only show within the slip of an edge.
	float slipped = 0.0;
	vec2 slip = SLIP * (1.0 + 2.0 * burst);
	if (length(p - uCenter) < 0.45 * unit) {
		float reachOut = length(slip) + 3.0;
		if (shardId != NONE && shardEdge < reachOut) slipped = step(measure(shardId, p - slip).shard + roughness, 0.0);
		if (lineId != NONE && lineEdge < reachOut) slipped = max(slipped, step(measure(lineId, p - slip).line, 0.0));
	}

	// Blots and specks gather in clumps beside the cracks and thin out away from them.
	// They start a few px out, so fissure edges stay crisp and the debris stays separate.
	float splatter = 0.0;
	float closeness = exp(-near / 18.0) * smoothstep(1.0, 6.0, near);
	if (closeness > 0.12) {
		float clump = noise(glass * 0.03 + 5.0);
		float speck = 0.55 * noise(glass * 0.25 + 17.0) + 0.45 * noise(glass * 0.09 + 3.0);
		float field = speck * mix(0.5, 1.1, clump) - (1.0 - 0.8 * closeness);
		// A narrow band keeps blob edges crisp even where the field changes slowly.
		splatter = smoothstep(-0.02 / uScale, 0.02 / uScale, field);
	}

	vec3 result = mix(base, GLINT, glint * 0.12);
	result = mix(result, HOT, slipped);
	result = mix(result, INK, max(max(shard, line), splatter));
	color = vec4(overStuck(result, damage.b) + dither, 1.0);
}`;
