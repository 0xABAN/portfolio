import { WIDEST_SHARD } from "./cracks";

/** CSS px per cell of the candidate pass. */
export const CELL = 8;

/** Uniforms and helpers shared by both passes. Positions are CSS px from the top left. */
const HEADER = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uGrid;                // candidate cells across and down
uniform highp sampler2D uSegments; // two texels per segment: ends, then shape

const float CELL = ${CELL.toFixed(1)};
const uint NONE = 65535u; // candidate id of an empty slot
const float REACH = 48.0; // CSS px beyond which a crack cannot mark a pixel
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
 * which decides where debris falls.
 */
export const CANDIDATE_FRAGMENT = /* glsl */ `${HEADER}
uniform int uCount;
out uvec2 candidates;

// Widest a shard can get, CSS px: segments further than this plus REACH are skipped cheaply.
const float WIDEST = ${WIDEST_SHARD.toFixed(1)};

void main() {
	vec2 centre = vec2(gl_FragCoord.x, uGrid.y - gl_FragCoord.y) * CELL;
	// Pixels read the four cells around them, so allow a cell of slack.
	float limit = REACH + CELL;
	vec2 best = vec2(limit); // nearest edge, smallest reach
	uvec2 ids = uvec2(NONE);

	for (int i = 0; i < uCount; i++) {
		vec4 ends = texelFetch(uSegments, ivec2(0, i), 0);
		float margin = limit + WIDEST;
		if (any(lessThan(centre, min(ends.xy, ends.zw) - margin)) || any(greaterThan(centre, max(ends.xy, ends.zw) + margin))) continue;
		Hit hit = measure(uint(i), centre);
		vec2 score = vec2(min(hit.shard, hit.line), reach(hit));
		bvec2 better = lessThan(score, best);
		best = mix(best, score, better);
		ids = uvec2(better.x ? uint(i) : ids.x, better.y ? uint(i) : ids.y);
	}
	candidates = ids;
}`;

/**
 * The broken screen. Measures each pixel exactly against the candidates of
 * the four cells around it, then draws black fissures with
 * chunky, toothed edges, crisp crack lines, and debris that clusters beside
 * the cracks, over red screen content with drifting horizontal streaks.
 * Debris texture is taken in glass space, so it turns with the fracture.
 */
export const SCREEN_FRAGMENT = /* glsl */ `${HEADER}
uniform vec2 uResolution; // backing-store pixels
uniform float uScale;     // backing-store pixels per CSS pixel
uniform float uTime;      // seconds
uniform vec2 uCenter;     // the impact
uniform float uSway;      // radians the fracture is turned around the impact
uniform highp usampler2D uCandidates;
out vec4 color;

// Averages to the desktop's #af0000 once the streaks even out.
const vec3 RED = vec3(0.686, 0.0, 0.0);
const vec3 INK = vec3(0.03, 0.0, 0.0);
const vec3 GLINT = vec3(1.0, 0.62, 0.58);

// Sine-free hash (Dave Hoskins), stable across GPU vendors.
float hash(vec2 p) {
	vec3 q = fract(p.xyx * 0.1031);
	q += dot(q, q.yzx + 33.33);
	return fract((q.x + q.y) * q.z);
}

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

void main() {
	vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uScale;
	float aa = 0.5 / uScale;
	float dither = (hash(gl_FragCoord.xy + fract(uTime) * 97.0) - 0.5) / 255.0;

	// Candidates of the four cells around this pixel. Most of the screen is
	// nowhere near a crack and stops here.
	uvec2 cells[4];
	bool found = false;
	vec2 base = floor(p / CELL - 0.5);
	for (int k = 0; k < 4; k++) {
		vec2 index = clamp(base + vec2(k & 1, k >> 1), vec2(0.0), uGrid - 1.0);
		cells[k] = texelFetch(uCandidates, ivec2(index.x, uGrid.y - 1.0 - index.y), 0).rg;
		found = found || cells[k].x != NONE || cells[k].y != NONE;
	}
	if (!found) {
		color = vec4(screen(p) + dither, 1.0);
		return;
	}

	// The cracks near this pixel, measured exactly.
	float shardEdge = FAR;
	float shardWidth = 0.0;
	float lineEdge = FAR;
	float lineWidth = 0.0;
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
		}
		if (hit.line < lineEdge) {
			lineEdge = hit.line;
			lineWidth = hit.lineWidth;
		}
		near = min(near, reach(hit));
	}

	// Debris texture lives on the glass, turning with it.
	vec2 glass = mat2(cos(uSway), -sin(uSway), sin(uSway), cos(uSway)) * (p - uCenter);

	// Fissures: shallow chips where glass broke away, fine teeth where pixels died along the edge.
	float shard = 0.0;
	if (shardEdge < 12.0) {
		float chips = (noise(glass * 0.09) - 0.5) * min(shardWidth, 12.0) * 0.3;
		float teeth = (noise(glass * 0.55 + 31.0) - 0.5) * 2.0;
		shard = 1.0 - smoothstep(-aa, aa, shardEdge + chips + teeth);
	}

	// Crack lines thinner than a pixel fade rather than break up; thin ones catch a faint glint.
	float line = clamp(0.5 - lineEdge * uScale, 0.0, 1.0) * min(1.0, 2.0 * lineWidth * uScale);
	float glint = (1.0 - smoothstep(0.3, 1.6, lineEdge)) * (1.0 - line) * (1.0 - smoothstep(0.7, 1.3, lineWidth));

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

	vec3 result = mix(screen(p), GLINT, glint * 0.12);
	result = mix(result, INK, max(max(shard, line), splatter));
	color = vec4(result + dither, 1.0);
}`;
