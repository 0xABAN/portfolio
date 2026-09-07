type Point = { x: number; y: number };
type Sample = Point & { time: number };

export function canScatter(from: Sample, to: Sample, lastBurst: number) {
	const elapsed = to.time - from.time;
	return elapsed > 0 && elapsed <= 100 && to.time - lastBurst >= 240
		&& Math.hypot(to.x - from.x, to.y - from.y) / elapsed >= 0.3;
}

export function findEdgeHit(from: Point, to: Point, outline: readonly Point[], radius = 12): Point | null {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const lengthSquared = dx * dx + dy * dy;
	let nearest = radius * radius;
	let hit: Point | null = null;
	for (const point of outline) {
		const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
			((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
		const distance = (point.x - from.x - t * dx) ** 2 + (point.y - from.y - t * dy) ** 2;
		if (distance < nearest) {
			nearest = distance;
			hit = point;
		}
	}
	return hit;
}

export type Piece = { outline: readonly Point[]; getScreenMatrix: () => DOMMatrix | null };
type Fragment = {
	element: SVGPathElement;
	x: number; y: number; dx: number; dy: number;
	angle: number; spin: number; size: number; start: number; duration: number;
	opacity: number; gravity: number; flutter: number;
};

const SHAPES = [
	"M-.65-.35 .15-.6 .7-.15 .25.65-.45.3Z",
	"M-.6-.5 .7-.2-.15.65Z",
	"M-.25-.7 .4-.4 .25.55-.4.7-.5-.15Z",
	"M-.75-.15 .6-.35 .85.05-.35.25Z",
];
const MAX_FRAGMENTS = 160;

export function installFractureParticles(
	svg: SVGSVGElement, desktop: HTMLElement, motion: MediaQueryList, pieces: readonly Piece[],
	getRootMatrix: () => DOMMatrix | null = () => svg.getScreenCTM(),
) {
	const ns = "http://www.w3.org/2000/svg";
	const layer = document.createElementNS(ns, "g");
	layer.setAttribute("fill", "#120000");
	layer.setAttribute("class", "fracture-fragments");
	// Use the artwork's actual falloff so debris also becomes translucent at the ends.
	// Detailed artwork is cached separately; debris stays lightweight.
	layer.setAttribute("mask", "url(#screen)");
	svg.append(layer);
	let previous: Sample | null = null;
	let pending: Sample | null = null;
	let lastBurst = -Infinity;
	let frame = 0;
	let fragments: Fragment[] = [];

	function draw(now: number) {
		frame = 0;
		if (pending) {
			const current = pending;
			pending = null;
			if (previous && canScatter(previous, current, lastBurst)) scatter(previous, current, now);
			previous = current;
		}
		fragments = fragments.filter((fragment) => {
			const t = Math.min(1, (now - fragment.start) / fragment.duration);
			if (t >= 1) { fragment.element.remove(); return false; }
			const travel = 1 - (1 - t) ** 3;
			const fade = Math.max(0, (t - 0.12) / 0.88);
			const opacity = fragment.opacity * (1 - fade * fade * (3 - 2 * fade));
			const size = fragment.size * (1 - 0.25 * t);
			const tumble = 1 - fragment.flutter * Math.sin(t * Math.PI * 2) ** 2;
			fragment.element.setAttribute("transform",
				`translate(${fragment.x + fragment.dx * travel} ${fragment.y + fragment.dy * travel + fragment.gravity * t * t}) rotate(${fragment.angle + fragment.spin * travel}) scale(${size * tumble} ${size})`);
			fragment.element.setAttribute("opacity", String(opacity));
			return true;
		});
		if (fragments.length) frame = requestAnimationFrame(draw);
	}

	function reset() {
		previous = null;
		pending = null;
		lastBurst = -Infinity;
		cancelAnimationFrame(frame);
		frame = 0;
		fragments = [];
		layer.replaceChildren();
	}

	function scatter(from: Sample, current: Sample, now: number) {
		const rootMatrix = getRootMatrix();
		if (!rootMatrix) return;
		const scale = Math.hypot(rootMatrix.a, rootMatrix.b);
		if (scale <= 0) return;
		let hit: Point | null = null;
		let nearest = Infinity;
		for (const piece of pieces) {
			const matrix = piece.getScreenMatrix();
			if (!matrix) continue;
			// Thickness grows across each branch, so hit distance must be measured
			// in screen space rather than assuming a uniform SVG scale.
			const screenOutline = piece.outline.map((point) => ({
				x: matrix.a * point.x + matrix.c * point.y + matrix.e,
				y: matrix.b * point.x + matrix.d * point.y + matrix.f,
			}));
			const candidate = findEdgeHit(from, current, screenOutline, 18);
			if (!candidate) continue;
			const distance = (candidate.x - current.x) ** 2 + (candidate.y - current.y) ** 2;
			if (distance < nearest && document.elementFromPoint(candidate.x, candidate.y) === desktop) {
				nearest = distance;
				hit = candidate;
			}
		}
		if (!hit) return;
		lastBurst = current.time;
		const origin = new DOMPoint(hit.x, hit.y).matrixTransform(rootMatrix.inverse());
		const direction = Math.atan2(current.y - from.y, current.x - from.x);
		const speed = Math.hypot(current.x - from.x, current.y - from.y) / (current.time - from.time);
		const energy = Math.min(1, speed / 2.8);
		const count = 4 + Math.round(energy * 5);
		while (fragments.length + count > MAX_FRAGMENTS) fragments.shift()?.element.remove();
		for (let i = 0; i < count; i++) {
			const element = document.createElementNS(ns, "path");
			const dust = i % 3 === 0;
			element.setAttribute("d", SHAPES[Math.floor(Math.random() * SHAPES.length)]);
			if (dust) {
				element.setAttribute("fill", i % 2 === 0 ? "#591009" : "#120000");
			} else {
				element.setAttribute("stroke", "#fff");
				element.setAttribute("stroke-width", ".1");
			}
			// A forward fan inherits the gesture; a few small chips scatter back from the edge.
			const angle = direction + (Math.random() - 0.5) * 2.6 + (i % 5 === 0 ? Math.PI : 0);
			const distance = (22 + Math.random() * 55 + energy * 65) * (dust ? 1.25 : 1) / scale;
			const spread = (Math.random() - 0.5) * 16 / scale;
			fragments.push({
				element,
				x: origin.x - Math.sin(direction) * spread,
				y: origin.y + Math.cos(direction) * spread,
				dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance,
				angle: Math.random() * 360, spin: (Math.random() - 0.5) * (dust ? 90 : 420),
				size: (dust ? 1.2 + Math.random() * 2 : 3 + Math.random() * 5 + energy * 2) / scale,
				start: now, duration: dust ? 550 + Math.random() * 400 : 850 + Math.random() * 500,
				opacity: dust ? 0.3 + Math.random() * 0.3 : 0.65 + Math.random() * 0.3,
				gravity: (dust ? 8 : 18 + Math.random() * 24) / scale,
				flutter: dust ? 0 : 0.3 + Math.random() * 0.4,
			});
			layer.append(element);
		}
	}

	function move(event: PointerEvent) {
		if (!motion.matches || event.pointerType !== "mouse" || event.target !== desktop || (event.buttons & ~1)) {
			previous = null;
			pending = null;
			return;
		}
		const current = { x: event.clientX, y: event.clientY, time: event.timeStamp };
		if (!previous) previous = current;
		else pending = current;
		if (pending && !frame) frame = requestAnimationFrame(draw);
	}

	desktop.addEventListener("pointermove", move, { passive: true });
	desktop.addEventListener("pointerleave", reset);
	window.addEventListener("blur", reset);
	window.addEventListener("resize", reset);
	motion.addEventListener("change", reset);
	return () => {
		reset();
		layer.remove();
		desktop.removeEventListener("pointermove", move);
		desktop.removeEventListener("pointerleave", reset);
		window.removeEventListener("blur", reset);
		window.removeEventListener("resize", reset);
		motion.removeEventListener("change", reset);
	};
}
