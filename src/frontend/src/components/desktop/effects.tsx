import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import "./effects.css";

export const DESKTOP_REVEAL_MS = 2100;

const REVEAL_SCHEDULE: readonly { id: string; at: number }[] = [
	{ id: "tb:start", at: 40 },
	{ id: "cd-player", at: 230 },
	{ id: "tb:tray", at: 290 },
	{ id: "tb:speaker", at: 340 },
	{ id: "tb:views", at: 390 },
	{ id: "hollow-knight", at: 520 },
	{ id: "silksong", at: 700 },
	{ id: "persona-3-reload", at: 780 },
	{ id: "terraria", at: 860 },
	{ id: "persona-5-royal", at: 940 },
	{ id: "undertale", at: 980 },
	{ id: "roblox", at: 1020 },
	{ id: "cd-player-icon", at: 1100 },
	{ id: "secrets", at: 1120 },
	{ id: "social-github", at: 1140 },
	{ id: "social-linkedin", at: 1170 },
	{ id: "social-twitter", at: 1200 },
	{ id: "recycle-bin", at: 1220 },
	{ id: "me", at: 1380 },
	{ id: "alt", at: 1480 },
	{ id: "new", at: 1580 },
	{ id: "terminal", at: 1680 },
	{ id: "github", at: 1760 },
	{ id: "sysmsg-0", at: 1840 },
	{ id: "sysmsg-1", at: 1900 },
	{ id: "sysmsg-2", at: 1960 },
	{ id: "sysmsg-3", at: 2020 },
	{ id: "sysmsg-4", at: 2060 },
	{ id: "neko", at: DESKTOP_REVEAL_MS },
	{ id: "boot-complete", at: DESKTOP_REVEAL_MS },
];

const SCHEDULED = new Set(REVEAL_SCHEDULE.map(({ id }) => id));

export function useDesktopReveal(): (id: string) => boolean {
	const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());

	useEffect(() => {
		const timers = REVEAL_SCHEDULE.map(({ id, at }) => window.setTimeout(() => {
			setRevealed((prev) => new Set(prev).add(id));
		}, at));
		return () => timers.forEach(window.clearTimeout);
	}, []);

	return useMemo(() => (id: string) => !SCHEDULED.has(id) || revealed.has(id), [revealed]);
}

const INTRO = "/fracture/intro.mp4";
const LOOP = "/fracture/loop.mp4";

export function prefetchFracture() {
	fetch(INTRO).then((response) => response.blob());
}

export const FractureBackground = memo(function FractureBackground({ onShownAction }: { onShownAction: () => void }) {
	const loopRef = useRef<HTMLVideoElement>(null);
	const [intro, setIntro] = useState(true);
	const [loopSrc, setLoopSrc] = useState<string>();

	return (
		<div className="fracture-background" aria-hidden="true">
			<video
				ref={loopRef}
				className="fracture-background__video"
				src={loopSrc}
				muted
				loop
				playsInline
				preload="auto"
				onPlaying={() => setIntro(false)}
			/>
			{intro ? (
				<video
					className="fracture-background__video"
					src={INTRO}
					muted
					autoPlay
					playsInline
					onCanPlayThrough={() => setLoopSrc(LOOP)}
					onPlaying={onShownAction}
					onEnded={() => loopRef.current?.play()}
				/>
			) : null}
		</div>
	);
});

const SHAPES = [
	"8,20 65,0 100,45 70,100 0,65",
	"0,10 100,35 35,100 20,55",
	"25,0 85,15 65,50 100,80 20,100 0,45",
	"10,35 50,0 100,30 75,80 30,100 0,65",
	"0,25 80,0 100,60 55,50 30,100",
].map((points) => {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${points}" fill="black"/></svg>`;
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
});

const round = (value: number) => Number(value.toFixed(2));

const SPARKS = Array.from({ length: 24 }, (_, index) => {
	const heading = index * 137.5 * Math.PI / 180;
	const travel = 12 + (index * 11) % 24;
	const x = Math.cos(heading) * travel;
	const y = Math.sin(heading) * travel - 6;
	const bend = (index * 13) % 9 - 4;
	const angle = (index * 83) % 360;
	const spin = (index * 67) % 540 - 270;

	const pose = (progress: number, dx: number, dy: number, scale: string) =>
		`transform: translate3d(${round(x * progress + dx)}vmin, ${round(y * progress + dy)}vmin, 0) rotate(${round(angle + spin * progress)}deg) scale(${scale});`;

	const name = `desktop-spark-${index}`;
	const keyframes = `@keyframes ${name} {
	0% { ${pose(0, 0, 0, "0")} }
	12% { ${pose(0.12, 0, 0, "1")} }
	45% { ${pose(0.45, bend, -bend, "0.7, 1")} }
	80% { ${pose(0.8, -bend * 0.4, bend * 0.4, "1, 0.7")} }
	100% { ${pose(1, 0, 0, "0")} }
}`;

	return {
		keyframes,
		style: {
			left: `${(index * 37) % 100}%`,
			top: `${(index * 61) % 100}%`,
			width: 5 + (index * 7) % 10,
			height: 4 + (index * 11) % 7,
			backgroundImage: SHAPES[index % SHAPES.length],
			animationDuration: `${3.2 + ((index * 7) % 17) / 5}s`,
			animationDelay: `${-((index * 13) % 41) / 5}s`,
			"--spark-motion": name,
		} as CSSProperties,
	};
});

const KEYFRAMES = SPARKS.map((spark) => spark.keyframes).join("\n");

export const DesktopSparks = memo(function DesktopSparks() {
	return (
		<div className="desktop-sparks" aria-hidden="true">
			<style href="desktop-sparks" precedence="default">{KEYFRAMES}</style>
			{SPARKS.map(({ style }, index) => <span key={index} className="desktop-sparks__spark" style={style} />)}
		</div>
	);
});

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

type Idle = { time: number; anim: string | null; frame: number };

function moveDir(dx: number, dy: number, dist: number) {
	const n = dy / dist > 0.5 ? "N" : "";
	const s = dy / dist < -0.5 ? "S" : "";
	const w = dx / dist > 0.5 ? "W" : "";
	const e = dx / dist < -0.5 ? "E" : "";
	return `${n}${s}${w}${e}` || "idle";
}

function pickIdleAnim(x: number, y: number, vw: number, vh: number) {
	const options = ["sleeping", "scratchSelf"];
	if (x < 32) options.push("scratchWallW");
	if (y < 32) options.push("scratchWallN");
	if (x > vw - 32) options.push("scratchWallE");
	if (y > vh - 32) options.push("scratchWallS");
	return options[Math.floor(Math.random() * options.length)];
}

function stepIdle(idle: Idle, x: number, y: number, vw: number, vh: number): [string, number] {
	idle.time += 1;
	if (idle.time > 10 && Math.floor(Math.random() * 200) === 0 && !idle.anim) {
		idle.anim = pickIdleAnim(x, y, vw, vh);
	}
	if (!idle.anim) return ["idle", 0];

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

function runNeko(el: HTMLElement): () => void {
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

		if (dist < 48) {
			paint(...stepIdle(idle, nekoX, nekoY, innerWidth, innerHeight));
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
		nekoX = Math.min(Math.max(16, nekoX - (dx / dist) * SPEED), innerWidth - 16);
		nekoY = Math.min(Math.max(16, nekoY - (dy / dist) * SPEED), innerHeight - 16);
		place();
	};

	const onMove = (event: MouseEvent) => {
		mouseX = event.clientX;
		mouseY = event.clientY;
	};
	const onVisibility = () => {
		if (!document.hidden) tick();
	};

	el.style.backgroundImage = "url(/desktop/neko.webp)";
	paint("idle", 0);
	place();
	document.addEventListener("mousemove", onMove, { passive: true });
	document.addEventListener("visibilitychange", onVisibility);
	const timer = window.setInterval(tick, TICK_MS);

	return () => {
		window.clearInterval(timer);
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("visibilitychange", onVisibility);
	};
}

export const Neko = memo(function Neko() {
	const elRef = useRef<HTMLDivElement>(null);
	useEffect(() => runNeko(elRef.current!), []);
	return <div ref={elRef} className="neko" aria-hidden />;
});
