export const GITHUB_USER = "0xABAN";
export const GITHUB_URL = `https://github.com/${GITHUB_USER}`;

export type NoteSegment = { t: string; href?: string };

export type DesktopWindow = {
	id: string;
	title: string;
	x: number;
	y: number;
	w: number;
	h: number;
	z: number;
	src?: string;
	segments?: readonly NoteSegment[];
	kind?: "error" | "paint" | "github" | "notepad" | "terminal" | "bio";
	icon?: string;
	/** When set, geometry is clamped inside this parent window */
	parentId?: string;
};

const TASKBAR_H = 36;
const TITLE_H = 22;

/** pad+border+client margin — keep in sync with window.css */
const CHROME_X = 12;
const CHROME_Y = TITLE_H + 12;

/** Paint chrome inside client — keep in sync with paint.css vars */
const PAINT_INNER_X = 56;
const PAINT_INNER_Y = 18;
const PAINT_INNER_BOTTOM = 70;

const STREET_RATIO = 2725 / 1539;
const MARGIN = 24;
const ALT_SIDE_FRAC = 0.42;

/** Face anchor in me (fractions). Window sits upper-left so face lands BR in overlay. */
const ALT_FACE_CX = 0.56;
const ALT_FACE_CY = 0.32;
const ALT_FACE_IN_BOX_X = 0.72;
const ALT_FACE_IN_BOX_Y = 0.7;

function paintCanvasSize(parent: Pick<DesktopWindow, "w" | "h">) {
	return {
		w: parent.w - CHROME_X - PAINT_INNER_X,
		h: parent.h - CHROME_Y - PAINT_INNER_Y - PAINT_INNER_BOTTOM,
		insetX: PAINT_INNER_X,
		insetY: PAINT_INNER_Y,
	};
}

function layoutMeWindow(
	vw: number,
	vh: number,
): Pick<DesktopWindow, "x" | "y" | "w" | "h"> {
	const maxH = vh - TASKBAR_H - MARGIN * 2;
	const maxW = vw - MARGIN * 2;

	const chromeY = CHROME_Y + PAINT_INNER_Y + PAINT_INNER_BOTTOM;
	const chromeX = CHROME_X + PAINT_INNER_X;
	let canvasH = maxH - chromeY;
	let canvasW = canvasH / STREET_RATIO;
	if (canvasW + chromeX > maxW) {
		canvasW = maxW - chromeX;
		canvasH = canvasW * STREET_RATIO;
	}

	const w = Math.round(canvasW + chromeX);
	const h = Math.round(canvasH + chromeY);
	const x = Math.round((vw - w) / 2);
	const y = Math.round(MARGIN + (vh - TASKBAR_H - MARGIN * 2 - h) / 2);

	return { x, y, w, h };
}

function layoutAltOnParent(
	parent: Pick<DesktopWindow, "x" | "y" | "w" | "h">,
): Pick<DesktopWindow, "x" | "y" | "w" | "h"> {
	const side = Math.round(Math.min(parent.w, parent.h) * ALT_SIDE_FRAC);
	const faceX = parent.x + parent.w * ALT_FACE_CX;
	const faceY = parent.y + parent.h * ALT_FACE_CY;
	const x = Math.round(faceX - side * ALT_FACE_IN_BOX_X) + 40;
	const y = Math.round(faceY - side * ALT_FACE_IN_BOX_Y);
	return clampToParent({ x, y, w: side, h: side }, parent);
}

export function clampToParent(
	child: Pick<DesktopWindow, "x" | "y" | "w" | "h">,
	parent: Pick<DesktopWindow, "x" | "y" | "w" | "h">,
): Pick<DesktopWindow, "x" | "y" | "w" | "h"> {
	const maxX = parent.x + parent.w - child.w;
	const maxY = parent.y + parent.h - child.h;
	return {
		w: child.w,
		h: child.h,
		x: Math.min(Math.max(child.x, parent.x), Math.max(parent.x, maxX)),
		y: Math.min(Math.max(child.y, parent.y), Math.max(parent.y, maxY)),
	};
}

function layoutBeepBoop(
	anchor: Pick<DesktopWindow, "x" | "y" | "w" | "h">,
): Pick<DesktopWindow, "x" | "y" | "w" | "h"> {
	const client = 96;
	const w = client + CHROME_X;
	const h = client + CHROME_Y;
	// Left of Paint (toolbox clear), sits above notepad stack
	return {
		w,
		h,
		x: Math.round(anchor.x - w - 14),
		y: Math.round(anchor.y + anchor.h * 0.3 + 40),
	};
}

const ERR_W = 260;
const ERR_H = 128;
const ERR_CASCADE = 16;
const ERR_COUNT = 7;

function layoutErrorStack(
	anchor: Pick<DesktopWindow, "x" | "y" | "w" | "h">,
	vh: number,
): DesktopWindow[] {
	// Inside terminal horizontally; last dialog half-tucked under taskbar (z < 10)
	const baseX = anchor.x + Math.round(anchor.w * 0.42);
	const lastY = (ERR_COUNT - 1) * ERR_CASCADE;
	const baseY = Math.round(vh - TASKBAR_H - ERR_H / 2 - lastY - 28);
	return Array.from({ length: ERR_COUNT }, (_, i) => ({
		id: `sysmsg-${i}`,
		title: "System message",
		kind: "error" as const,
		x: baseX - i * ERR_CASCADE,
		y: baseY + i * ERR_CASCADE,
		w: ERR_W,
		h: ERR_H,
		z: 20 + i,
	}));
}

export function layoutDesktop(vw: number, vh: number): DesktopWindow[] {
	const me = {
		id: "me",
		title: "adam",
		z: 2,
		kind: "paint" as const,
		src: "/photos/street.jpg",
		icon: "/paint/icon-16.png",
		...layoutMeWindow(vw, vh),
	};
	const terminal = {
		id: "terminal",
		title: "pi — Command Prompt",
		z: 12,
		kind: "terminal" as const,
		icon: "/icons/terminal.svg",
		...layoutTerminalWindow(me),
	};
	return [
		me,
		{
			id: "alt",
			title: "alt",
			z: 3,
			parentId: "me",
			...layoutAltOnParent(me),
		},
		{
			id: "new",
			title: "beep boop",
			z: 4,
			src: "/photos/beep-boop.gif",
			...layoutBeepBoop(me),
		},
		terminal,
		{
			id: "github",
			title: `github - ${GITHUB_USER}`,
			z: 13,
			kind: "github" as const,
			...layoutGitHubWindow(terminal),
		},
		...layoutNotepadStack(me, vh),
		...layoutErrorStack(terminal, vh),
	];
}

const NOTE_W = 260;
const NOTE_H = 280;
/** Zig-zag offsets + content (left → right → left while stepping down) */
const NOTES = [
	{
		title: "amazon.md",
		src: "/photos/amazon.png",
		segments: [{ t: "swe intern @ 'zon summer 2026" }],
		x: 0,
		y: 0,
	},
	{
		title: "ibm.md",
		src: "/photos/ibm.png",
		segments: [{ t: "ai eng co-op 2025-2026" }],
		x: 72,
		y: 88,
	},
	{
		title: "copycat.md",
		segments: [
			{ t: "mcp", href: `${GITHUB_URL}/copycat` },
			{
				t: " to copy sites' visuals as DESIGN.md's for later use. very useful :)",
			},
		],
		x: 12,
		y: 176,
	},
	{
		title: "definitive_multiplayer.md",
		src: "/photos/definitive-multiplayer.png",
		segments: [
			{
				t: "terraria multiplayer add-on",
				href: `${GITHUB_URL}/DefinitiveMultiplayer`,
			},
			{ t: " i built in a week, 1k+ downloads" },
		],
		x: 84,
		y: 264,
	},
] as const;

function layoutNotepadStack(
	anchor: Pick<DesktopWindow, "x" | "y" | "w" | "h">,
	vh: number,
): DesktopWindow[] {
	// Dangle into Paint from the left; last pad half-tucked under the taskbar
	const last = NOTES.at(-1);
	if (!last) return [];
	const baseX = Math.round(anchor.x - NOTE_W);
	const baseY = Math.round(vh - TASKBAR_H - NOTE_H / 2 - last.y);
	return NOTES.map((note, i) => ({
		id: `notepad-${i}`,
		title: note.title,
		segments: note.segments,
		src: "src" in note ? note.src : undefined,
		kind: "notepad" as const,
		icon: "/icons/notepad.svg",
		x: baseX + note.x,
		y: baseY + note.y,
		w: NOTE_W,
		h: NOTE_H,
		z: 6 + i,
	}));
}

const BIO_W = 572;
const BIO_H = 420;

/** Centered bio.txt window (opened from desk icon, not on load). */
export function layoutBioWindow(
	vw = typeof window !== "undefined" ? window.innerWidth : 1440,
	vh = typeof window !== "undefined" ? window.innerHeight : 900,
): Pick<DesktopWindow, "x" | "y" | "w" | "h"> {
	return {
		w: BIO_W,
		h: BIO_H,
		x: Math.round((vw - BIO_W) / 2),
		y: Math.round((vh - TASKBAR_H - BIO_H) / 2),
	};
}

export function makeBioWindow(z: number): DesktopWindow {
	return {
		id: "bio",
		title: "bio.txt",
		kind: "bio",
		icon: "/icons/notepad.svg",
		z,
		...layoutBioWindow(),
	};
}

function layoutTerminalWindow(
	anchor: Pick<DesktopWindow, "x" | "y" | "w" | "h">,
): Pick<DesktopWindow, "x" | "y" | "w" | "h"> {
	const w = Math.round(anchor.w * 1.3 * 0.85);
	const h = Math.round(anchor.h * 0.7);
	const { x, y } = clampWindowPos(
		anchor.x + anchor.w,
		Math.round(anchor.y + (anchor.h - h) / 2),
		w,
	);
	return { x, y, w, h };
}

function layoutGitHubWindow(
	anchor: Pick<DesktopWindow, "x" | "y" | "w" | "h">,
): Pick<DesktopWindow, "x" | "y" | "w" | "h"> {
	// ~13 weeks visible; full year scrolls horizontally
	const w = 320;
	const h = 200;
	// Upper-right of terminal: right-aligned, hangs off the top edge
	const x = Math.round(anchor.x + anchor.w - w - 12 - 20);
	const y = Math.round(anchor.y - h * 0.4 - 20);
	return { w, h, x, y };
}

export function altCropStyle(
	child: Pick<DesktopWindow, "x" | "y">,
	parent: Pick<DesktopWindow, "x" | "y" | "w" | "h">,
) {
	const { w, h, insetX, insetY } = paintCanvasSize(parent);
	return {
		width: w,
		height: h,
		left: parent.x - child.x + insetX,
		top: parent.y - child.y + insetY,
	};
}

export function clampWindowPos(
	x: number,
	y: number,
	w: number,
): { x: number; y: number } {
	if (typeof window === "undefined") return { x, y };
	const minX = 48 - w;
	const maxX = window.innerWidth - 48;
	const maxY = window.innerHeight - TASKBAR_H - TITLE_H;
	return {
		x: Math.min(maxX, Math.max(minX, x)),
		y: Math.min(maxY, Math.max(0, y)),
	};
}
