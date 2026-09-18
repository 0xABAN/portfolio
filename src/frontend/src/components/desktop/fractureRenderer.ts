import { FRACTURE_DETAILS, FRACTURE_PIECES, type FractureSprite } from "./fractureAssets";
import {
	advanceFractureActivity, createFractureActivity, createFractureRotation, createFractureTwitch,
	fractureDriftAt, fractureGrowthAt, fractureRotationAt, fractureTwitchAt, type FractureBranchClock,
} from "./fractureDrift";
import { branchMatrix, composeMatrix, easeOffset, edgeReachScale, hoverOffset, spriteFalloff, viewportMatrix, type Affine, type Point } from "./fractureInteraction";

const REST = { rotation: 0, scale: 1, thickness: 1 };
const ZERO = { x: 0, y: 0 };

function placeSprite(element: HTMLElement, sprite: FractureSprite, matrix: Affine) {
	const x = matrix.a * sprite.x + matrix.c * sprite.y + matrix.e;
	const y = matrix.b * sprite.x + matrix.d * sprite.y + matrix.f;
	const transform = `matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${x},${y})`;
	if (element.style.transform !== transform) element.style.transform = transform;
}

/** Cached sprites and reveal masks: no live SVG filters, path mutations, or frame-time layout reads. */
export function installFractureRenderer(root: HTMLElement, layer: HTMLElement) {
	const desktop = root.closest<HTMLElement>(".desktop")!;
	const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
	const hover = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
	let viewport = viewportMatrix(1600, 1000);
	let size = { width: 1600, height: 1000 };
	let origin = ZERO;
	let pointer: Point | null = null;
	let active = false;
	let frame = 0;
	let lastTime = 0;
	let rotationElapsed = 0;
	const rotationMotion = createFractureRotation();
	let rotation = 0;
	let activity = createFractureActivity();
	const pieces = FRACTURE_PIECES.map((asset) => ({
		asset,
		element: layer.querySelector<HTMLElement>(`[data-piece="${asset.id}"]`)!,
		growthElement: layer.querySelector<HTMLElement>(`[data-growth="${asset.id}"]`)!,
		growthImage: layer.querySelector<HTMLImageElement>(`[data-growth="${asset.id}"] img`)!,
		angle: asset.angle * Math.PI / 180,
		falloff: asset.edge ? "" : spriteFalloff(asset),
		growthRadius: Math.max(...asset.outline.map((point) => Math.hypot(point.x - 800, point.y - 500))),
		offset: ZERO,
		growth: 0,
		elapsed: 0,
		cycle: null as FractureBranchClock["cycle"],
		pose: REST,
		twitchElapsed: 0,
		twitchCycle: createFractureTwitch(),
		twitch: 0,
		twitchReaction: false,
	}));
	const angularPieces = [...pieces].sort((a, b) => a.asset.angle - b.asset.angle);
	const details = layer.querySelector<HTMLElement>(".fracture-details")!;

	function render(delta: number) {
		for (const piece of pieces) {
			const { angle, pose } = piece;
			const turn = rotation + piece.twitch;
			const reach = piece.asset.edge
				? edgeReachScale(angle + turn * Math.PI / 180, piece.growthRadius * viewport.a, size.width, size.height)
				: 1;
			// The solid branch remains the interaction surface; growth is a translucent wake.
			const ambient = composeMatrix(viewport, branchMatrix(angle, turn, reach, 1));
			const screen = { ...ambient, e: ambient.e + origin.x, f: ambient.f + origin.y };
			const target = pointer ? hoverOffset(pointer, piece.asset.outline, screen) : ZERO;
			piece.offset = easeOffset(piece.offset, target, delta);
			if (!pointer && Math.hypot(piece.offset.x, piece.offset.y) < 0.01) piece.offset = ZERO;
			placeSprite(piece.element, piece.asset, { ...ambient, e: ambient.e + piece.offset.x, f: ambient.f + piece.offset.y });

			const opacity = String(Math.min(0.7, piece.growth * 3));
			if (piece.growthImage.style.opacity !== opacity) piece.growthImage.style.opacity = opacity;
			if (piece.growth > 0) {
				const matrix = composeMatrix(viewport, branchMatrix(angle, turn, reach * pose.scale, pose.thickness));
				placeSprite(piece.growthElement, piece.asset, { ...matrix, e: matrix.e + piece.offset.x, f: matrix.f + piece.offset.y });
				const radius = piece.growthRadius * piece.growth;
				const reveal = `radial-gradient(circle ${radius}px at ${800 - piece.asset.x}px ${500 - piece.asset.y}px, #000 75%, transparent 100%)`;
				const mask = piece.asset.edge ? reveal : `${reveal}, ${piece.falloff}`;
				if (piece.growthImage.style.maskImage !== mask) piece.growthImage.style.maskImage = mask;
			}
		}
		placeSprite(details, FRACTURE_DETAILS, composeMatrix(viewport, branchMatrix(0, rotation, 1, 1)));
	}

	function resize() {
		// All geometry reads happen here; pointer and animation frames use cached matrices.
		const bounds = root.getBoundingClientRect();
		size = { width: bounds.width, height: bounds.height };
		viewport = viewportMatrix(bounds.width, bounds.height);
		origin = { x: bounds.left, y: bounds.top };
		render(0);
	}

	function draw(now: number) {
		const delta = lastTime ? Math.min(100, now - lastTime) : 0;
		lastTime = now;
		// One rotation clock for the whole fracture; expansion clocks stay per branch.
		rotationElapsed += delta;
		rotation = fractureRotationAt(rotationMotion, rotationElapsed);
		advanceFractureActivity(activity, angularPieces, delta);
		for (const piece of pieces) {
			piece.growth = piece.cycle ? fractureGrowthAt(piece.cycle, piece.elapsed) : 0;
			piece.pose = piece.cycle ? fractureDriftAt(piece.cycle, piece.elapsed, piece.growth) : REST;
			piece.twitch = fractureTwitchAt(piece.twitchCycle, piece.twitchElapsed);
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
			activity = createFractureActivity();
			for (const piece of pieces) {
				piece.elapsed = 0;
				piece.growth = 0;
				piece.cycle = null;
				piece.pose = REST;
				piece.twitchElapsed = 0;
				piece.twitchCycle = createFractureTwitch();
				piece.twitchReaction = false;
				piece.twitch = 0;
				piece.offset = ZERO;
			}
			render(0);
		} else if (!document.hidden) {
			frame = requestAnimationFrame(draw);
		}
	}
	function move(event: PointerEvent) {
		pointer = active && hover.matches && event.pointerType === "mouse"
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
			desktop.removeEventListener("pointermove", move);
			desktop.removeEventListener("pointerleave", resetPointer);
			window.removeEventListener("blur", resetPointer);
			document.removeEventListener("visibilitychange", sync);
			motion.removeEventListener("change", sync);
			hover.removeEventListener("change", resetPointer);
		},
	};
}
