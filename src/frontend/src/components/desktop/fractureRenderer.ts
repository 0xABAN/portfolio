import { FRACTURE_DETAILS, FRACTURE_PIECES, type FractureSprite } from "./fractureAssets";
import { createFractureDrift, createFractureRotation, fractureDriftAt } from "./fractureDrift";
import { branchMatrix, composeMatrix, easeOffset, hoverOffset, viewportMatrix, type Affine, type Point } from "./fractureInteraction";
import { installFractureParticles } from "./fractureParticles";

const REST = { rotation: 0, scale: 1, thickness: 1 };
const ZERO = { x: 0, y: 0 };

function domMatrix(matrix: Affine) {
	return new DOMMatrix([matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]);
}

function placeSprite(element: HTMLImageElement, sprite: FractureSprite, matrix: Affine) {
	const x = matrix.a * sprite.x + matrix.c * sprite.y + matrix.e;
	const y = matrix.b * sprite.x + matrix.d * sprite.y + matrix.f;
	const transform = `matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${x},${y})`;
	if (element.style.transform !== transform) element.style.transform = transform;
}

/** Cached image transforms only: no SVG filters, path mutations, or frame-time layout reads. */
export function installFractureRenderer(root: HTMLElement, layer: HTMLElement, overlay: SVGSVGElement) {
	const desktop = root.closest<HTMLElement>(".desktop")!;
	const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
	const hover = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
	let viewport = viewportMatrix(1600, 1000);
	let origin = ZERO;
	let screenViewport = viewport;
	let pointer: Point | null = null;
	let active = false;
	let frame = 0;
	let lastTime = 0;
	let rotationElapsed = 0;
	let rotationCycle = createFractureRotation();
	let rotation = 0;
	const pieces = FRACTURE_PIECES.map((asset) => ({
		asset,
		element: layer.querySelector<HTMLImageElement>(`[data-piece="${asset.id}"]`)!,
		offset: ZERO,
		screenMatrix: viewport,
		elapsed: 0,
		cycle: createFractureDrift(),
		pose: REST,
	}));
	const details = layer.querySelector<HTMLImageElement>(".fracture-details")!;
	const removeParticles = installFractureParticles(overlay, desktop, hover,
		pieces.map((piece) => ({ outline: piece.asset.outline, getScreenMatrix: () => active ? domMatrix(piece.screenMatrix) : null })),
		() => domMatrix(screenViewport));

	function render(delta: number) {
		for (const piece of pieces) {
			const { pose } = piece;
			const ambient = composeMatrix(viewport, branchMatrix(piece.asset.angle * Math.PI / 180, rotation, pose.scale, pose.thickness));
			const screen = { ...ambient, e: ambient.e + origin.x, f: ambient.f + origin.y };
			const target = pointer ? hoverOffset(pointer, piece.asset.outline, screen) : ZERO;
			piece.offset = easeOffset(piece.offset, target, delta);
			if (!pointer && Math.hypot(piece.offset.x, piece.offset.y) < 0.01) piece.offset = ZERO;
			piece.screenMatrix = { ...screen, e: screen.e + piece.offset.x, f: screen.f + piece.offset.y };
			placeSprite(piece.element, piece.asset, { ...ambient, e: ambient.e + piece.offset.x, f: ambient.f + piece.offset.y });
		}
		placeSprite(details, FRACTURE_DETAILS, composeMatrix(viewport, branchMatrix(0, rotation, 1, 1)));
	}

	function resize() {
		// All geometry reads happen here; pointer and animation frames use cached matrices.
		const bounds = root.getBoundingClientRect();
		viewport = viewportMatrix(bounds.width, bounds.height);
		origin = { x: bounds.left, y: bounds.top };
		screenViewport = { ...viewport, e: viewport.e + origin.x, f: viewport.f + origin.y };
		layer.style.maskImage = `radial-gradient(ellipse ${950 * viewport.a}px ${660 * viewport.a}px at 50% 50%, #000 0%, #000 8%, rgba(0,0,0,.9) 48%, rgba(0,0,0,.5) 82%, transparent 100%)`;
		render(0);
	}

	function draw(now: number) {
		const delta = lastTime ? Math.min(100, now - lastTime) : 0;
		lastTime = now;
		// One rotation clock for the whole fracture; expansion clocks stay per branch.
		rotationElapsed += delta;
		if (rotationElapsed >= rotationCycle.duration) {
			rotationElapsed -= rotationCycle.duration;
			rotationCycle = createFractureRotation();
		}
		rotation = fractureDriftAt(rotationCycle, rotationElapsed).rotation;
		for (const piece of pieces) {
			piece.elapsed += delta;
			if (piece.elapsed >= piece.cycle.duration) {
				piece.elapsed -= piece.cycle.duration;
				piece.cycle = createFractureDrift();
			}
			piece.pose = fractureDriftAt(piece.cycle, piece.elapsed);
		}
		render(delta);
		frame = requestAnimationFrame(draw);
	}

	function resetPointer() { pointer = null; }
	function sync() {
		cancelAnimationFrame(frame);
		lastTime = 0;
		resetPointer();
		if (!active || !motion.matches) {
			rotationElapsed = 0;
			rotation = 0;
			for (const piece of pieces) {
				piece.elapsed = 0;
				piece.pose = REST;
				piece.offset = ZERO;
			}
			render(0);
		} else if (!document.hidden) {
			frame = requestAnimationFrame(draw);
		}
	}
	function move(event: PointerEvent) {
		pointer = active && hover.matches && event.pointerType === "mouse" && event.target === desktop
			? { x: event.clientX, y: event.clientY } : null;
	}

	const observer = new ResizeObserver(resize);
	observer.observe(root);
	resize();
	desktop.addEventListener("pointermove", move, { passive: true });
	desktop.addEventListener("pointerleave", resetPointer);
	window.addEventListener("blur", resetPointer);
	document.addEventListener("visibilitychange", sync);
	motion.addEventListener("change", sync);
	hover.addEventListener("change", resetPointer);
	return {
		setActive(value: boolean) { active = value; sync(); },
		destroy() {
			cancelAnimationFrame(frame);
			observer.disconnect();
			removeParticles();
			desktop.removeEventListener("pointermove", move);
			desktop.removeEventListener("pointerleave", resetPointer);
			window.removeEventListener("blur", resetPointer);
			document.removeEventListener("visibilitychange", sync);
			motion.removeEventListener("change", sync);
			hover.removeEventListener("change", resetPointer);
		},
	};
}
