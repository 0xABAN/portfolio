import { desktopViewport, toDesktop } from "../../viewport";

/** Sprite cells from crgimenes/neko (oneko.js 8×4 sheet layout), as [column, row] offsets. */
const SPRITES: Record<string, readonly (readonly [number, number])[]> = {
	idle: [[-3, -3]],
	alert: [[-7, -3]],
	scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
	scratchWallN: [[0, 0], [0, -1]],
	scratchWallS: [[-7, -1], [-6, -2]],
	scratchWallE: [[-2, -2], [-2, -3]],
	scratchWallW: [[-4, 0], [-4, -1]],
	tired: [[-3, -2]],
	sleeping: [[-2, 0], [-2, -1]],
	N: [[-1, -2], [-1, -3]],
	NE: [[0, -2], [0, -3]],
	E: [[-3, 0], [-3, -1]],
	SE: [[-5, -1], [-5, -2]],
	S: [[-6, -3], [-7, -2]],
	SW: [[-5, -3], [-6, -1]],
	W: [[-4, -2], [-4, -3]],
	NW: [[-1, 0], [-1, -1]],
};

const SPEED = 20;
const TICK_MS = 100;

/** An idle animation in progress, and how long the cat has been idle. */
type Idle = { time: number; anim: string | null; frame: number };

/** The compass sprite for moving by (dx, dy) over `dist`; the axes are flipped, since the cat moves against them. */
function moveDir(dx: number, dy: number, dist: number) {
	const n = dy / dist > 0.5 ? "N" : "";
	const s = dy / dist < -0.5 ? "S" : "";
	const w = dx / dist > 0.5 ? "W" : "";
	const e = dx / dist < -0.5 ? "E" : "";
	return `${n}${s}${w}${e}` || "idle";
}

/** Sleeping, or scratching itself or a nearby screen edge. */
function pickIdleAnim(x: number, y: number, vw: number, vh: number) {
	const options = ["sleeping", "scratchSelf"];
	if (x < 32) options.push("scratchWallW");
	if (y < 32) options.push("scratchWallN");
	if (x > vw - 32) options.push("scratchWallE");
	if (y > vh - 32) options.push("scratchWallS");
	return options[Math.floor(Math.random() * options.length)];
}

/** Advances the idle animation; returns the sprite and frame to show. */
function stepIdle(idle: Idle, x: number, y: number, vw: number, vh: number): [string, number] {
	idle.time += 1;
	if (idle.time > 10 && Math.floor(Math.random() * 200) === 0 && !idle.anim) {
		idle.anim = pickIdleAnim(x, y, vw, vh);
	}
	if (!idle.anim) return ["idle", 0];

	// A nap dozes off for 8 frames then sleeps; a scratch lasts 10.
	const sleeping = idle.anim === "sleeping";
	const sprite: [string, number] = !sleeping ? [idle.anim, idle.frame]
		: idle.frame < 8 ? ["tired", 0] : ["sleeping", Math.floor(idle.frame / 4)];
	if (idle.frame > (sleeping ? 192 : 9)) {
		idle.anim = null;
		idle.frame = 0;
	} else {
		idle.frame += 1;
	}
	return sprite;
}

/** Drives a neko element at 10 Hz, chasing the mouse. Returns cleanup. */
export function runNeko(el: HTMLElement, sheetUrl: string): () => void {
	let nekoX = 48;
	let nekoY = 48;
	let mouseX = 48;
	let mouseY = 48;
	let frameCount = 0;
	const idle: Idle = { time: 0, anim: null, frame: 0 };

	const paint = (name: string, frame: number) => {
		const frames = SPRITES[name];
		const [sx, sy] = frames[frame % frames.length];
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

		// The cat lives in desktop pixels, which the desktop's zoom can make larger than the screen's.
		const { width, height } = desktopViewport();
		// Close enough to the cursor: idle animations play in place.
		if (dist < 48) {
			paint(...stepIdle(idle, nekoX, nekoY, width, height));
			return;
		}

		idle.anim = null;
		idle.frame = 0;
		// Woken from idling, it looks alert for a few frames before running.
		if (idle.time > 1) {
			paint("alert", 0);
			idle.time = Math.min(idle.time, 7) - 1;
			return;
		}

		paint(moveDir(dx, dy, dist), frameCount);
		nekoX = Math.min(Math.max(16, nekoX - (dx / dist) * SPEED), width - 16);
		nekoY = Math.min(Math.max(16, nekoY - (dy / dist) * SPEED), height - 16);
		place();
	};

	const onMove = (event: MouseEvent) => {
		mouseX = toDesktop(event.clientX);
		mouseY = toDesktop(event.clientY);
	};
	// The timer keeps running; ticks do nothing while the page is hidden.
	const onVisibility = () => {
		if (!document.hidden) tick();
	};

	el.style.backgroundImage = `url(${sheetUrl})`;
	paint("idle", 0);
	place();
	document.addEventListener("mousemove", onMove, { passive: true });
	document.addEventListener("visibilitychange", onVisibility);
	// A fixed 10 Hz, rather than paying for every display refresh.
	const timer = window.setInterval(tick, TICK_MS);

	return () => {
		window.clearInterval(timer);
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("visibilitychange", onVisibility);
	};
}
