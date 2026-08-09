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

function pickIdleAnim(x: number, y: number) {
	const opts = ["sleeping", "scratchSelf"];
	if (x < 32) opts.push("scratchWallW");
	if (y < 32) opts.push("scratchWallN");
	if (x > window.innerWidth - 32) opts.push("scratchWallE");
	if (y > window.innerHeight - 32) opts.push("scratchWallS");
	return opts[Math.floor(Math.random() * opts.length)] ?? "sleeping";
}

function stepIdle(idle: IdleState, x: number, y: number): [string, number] {
	idle.time += 1;
	if (idle.time > 10 && Math.floor(Math.random() * 200) === 0 && !idle.anim) {
		idle.anim = pickIdleAnim(x, y);
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
	let lastTs = 0;
	let raf = 0;

	const paint = (name: string, frame: number) => {
		const [sx, sy] = cell(name, frame);
		el.style.backgroundPosition = `${sx * 32}px ${sy * 32}px`;
	};

	const place = () => {
		el.style.transform = `translate(${nekoX - 16}px, ${nekoY - 16}px)`;
	};

	const tick = () => {
		frameCount += 1;
		const dx = nekoX - mouseX;
		const dy = nekoY - mouseY;
		const dist = Math.hypot(dx, dy);

		if (dist < SPEED || dist < 48) {
			const [name, frame] = stepIdle(idle, nekoX, nekoY);
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
		nekoX = Math.min(Math.max(16, nekoX), window.innerWidth - 16);
		nekoY = Math.min(Math.max(16, nekoY), window.innerHeight - 16);
		place();
	};

	const onMove = (e: MouseEvent) => {
		mouseX = e.clientX;
		mouseY = e.clientY;
	};

	const loop = (ts: number) => {
		if (!el.isConnected) return;
		if (!lastTs) lastTs = ts;
		if (ts - lastTs > 100) {
			lastTs = ts;
			tick();
		}
		raf = requestAnimationFrame(loop);
	};

	el.style.backgroundImage = `url(${sheetUrl})`;
	paint("idle", 0);
	place();
	document.addEventListener("mousemove", onMove);
	raf = requestAnimationFrame(loop);

	return () => {
		cancelAnimationFrame(raf);
		document.removeEventListener("mousemove", onMove);
	};
}
