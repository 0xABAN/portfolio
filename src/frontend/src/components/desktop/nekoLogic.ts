/** Sprite cells from crgimenes/neko (oneko.js 8×4 sheet layout). */
const SPRITES: Record<string, readonly (readonly [number, number])[]> = {
	idle: [[-3, -3]],
	alert: [[-7, -3]],
	scratchSelf: [
		[-5, 0],
		[-6, 0],
		[-7, 0],
	],
	scratchWallN: [
		[0, 0],
		[0, -1],
	],
	scratchWallS: [
		[-7, -1],
		[-6, -2],
	],
	scratchWallE: [
		[-2, -2],
		[-2, -3],
	],
	scratchWallW: [
		[-4, 0],
		[-4, -1],
	],
	tired: [[-3, -2]],
	sleeping: [
		[-2, 0],
		[-2, -1],
	],
	N: [
		[-1, -2],
		[-1, -3],
	],
	NE: [
		[0, -2],
		[0, -3],
	],
	E: [
		[-3, 0],
		[-3, -1],
	],
	SE: [
		[-5, -1],
		[-5, -2],
	],
	S: [
		[-6, -3],
		[-7, -2],
	],
	SW: [
		[-5, -3],
		[-6, -1],
	],
	W: [
		[-4, -2],
		[-4, -3],
	],
	NW: [
		[-1, 0],
		[-1, -1],
	],
};

const SPEED = 20;
const TICK_MS = 100;
const SCRATCH = new Set([
	"scratchWallN",
	"scratchWallS",
	"scratchWallE",
	"scratchWallW",
	"scratchSelf",
]);

type IdleState = { time: number; anim: string | null; frame: number };

const IDLE_CELL: readonly [number, number] = [-3, -3];

function cell(name: string, frame: number): readonly [number, number] {
	const set = SPRITES[name] ?? SPRITES.idle;
	if (!set || set.length === 0) return IDLE_CELL;
	return set[frame % set.length] ?? set[0] ?? IDLE_CELL;
}

function moveDir(dx: number, dy: number, dist: number) {
	const n = dy / dist > 0.5 ? "N" : "";
	const s = dy / dist < -0.5 ? "S" : "";
	const w = dx / dist > 0.5 ? "W" : "";
	const e = dx / dist < -0.5 ? "E" : "";
	return `${n}${s}${w}${e}` || "idle";
}

function pickIdleAnim(x: number, y: number, vw: number, vh: number) {
	const opts = ["sleeping", "scratchSelf"];
	if (x < 32) opts.push("scratchWallW");
	if (y < 32) opts.push("scratchWallN");
	if (x > vw - 32) opts.push("scratchWallE");
	if (y > vh - 32) opts.push("scratchWallS");
	return opts[Math.floor(Math.random() * opts.length)] ?? "sleeping";
}

function stepIdle(
	idle: IdleState,
	x: number,
	y: number,
	vw: number,
	vh: number,
): [string, number] {
	idle.time += 1;
	if (idle.time > 10 && Math.floor(Math.random() * 200) === 0 && !idle.anim) {
		idle.anim = pickIdleAnim(x, y, vw, vh);
	}

	const anim = idle.anim;
	if (anim === "sleeping") {
		const sprite: [string, number] =
			idle.frame < 8 ? ["tired", 0] : ["sleeping", Math.floor(idle.frame / 4)];
		if (idle.frame > 192) {
			idle.anim = null;
			idle.frame = 0;
		} else {
			idle.frame += 1;
		}
		return sprite;
	}

	if (anim && SCRATCH.has(anim)) {
		const sprite: [string, number] = [anim, idle.frame];
		if (idle.frame > 9) {
			idle.anim = null;
			idle.frame = 0;
		} else {
			idle.frame += 1;
		}
		return sprite;
	}

	return ["idle", 0];
}

/** Drive a neko element. Returns cleanup. */
export function runNeko(el: HTMLElement, sheetUrl: string): () => void {
	let nekoX = 48;
	let nekoY = 48;
	let mouseX = 48;
	let mouseY = 48;
	let frameCount = 0;
	const idle: IdleState = { time: 0, anim: null, frame: 0 };
	let vw = window.innerWidth;
	let vh = window.innerHeight;
	let timer = 0;

	const paint = (name: string, frame: number) => {
		const [sx, sy] = cell(name, frame);
		el.style.backgroundPosition = `${sx * 32}px ${sy * 32}px`;
	};

	const place = () => {
		el.style.transform = `translate(${nekoX - 16}px, ${nekoY - 16}px)`;
	};

	const tick = () => {
		if (!el.isConnected || document.hidden) return;
		frameCount += 1;
		const dx = nekoX - mouseX;
		const dy = nekoY - mouseY;
		const dist = Math.hypot(dx, dy);

		if (dist < SPEED || dist < 48) {
			// Sleeping is long idle — skip most paint work while static idle sprite
			const [name, frame] = stepIdle(idle, nekoX, nekoY, vw, vh);
			paint(name, frame);
			return;
		}

		idle.anim = null;
		idle.frame = 0;

		if (idle.time > 1) {
			paint("alert", 0);
			idle.time = Math.min(idle.time, 7) - 1;
			return;
		}

		paint(moveDir(dx, dy, dist), frameCount);
		nekoX -= (dx / dist) * SPEED;
		nekoY -= (dy / dist) * SPEED;
		nekoX = Math.min(Math.max(16, nekoX), vw - 16);
		nekoY = Math.min(Math.max(16, nekoY), vh - 16);
		place();
	};

	const onMove = (e: MouseEvent) => {
		mouseX = e.clientX;
		mouseY = e.clientY;
	};

	const onResize = () => {
		vw = window.innerWidth;
		vh = window.innerHeight;
	};

	const onVis = () => {
		// timer keeps running; tick no-ops while hidden
		if (!document.hidden) tick();
	};

	el.style.backgroundImage = `url(${sheetUrl})`;
	paint("idle", 0);
	place();
	document.addEventListener("mousemove", onMove, { passive: true });
	window.addEventListener("resize", onResize, { passive: true });
	document.addEventListener("visibilitychange", onVis);
	// Fixed 10Hz — no rAF tax at display refresh
	timer = window.setInterval(tick, TICK_MS);

	return () => {
		window.clearInterval(timer);
		document.removeEventListener("mousemove", onMove);
		window.removeEventListener("resize", onResize);
		document.removeEventListener("visibilitychange", onVis);
	};
}
