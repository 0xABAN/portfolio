import { DESK_ICONS } from "../files/catalog";

export type DesktopWindow = {
	id: string;
	title: string;
	x: number;
	y: number;
	w: number;
	h: number;
	z: number;
	src?: string;
	kind?: "error" | "paint" | "github" | "experience" | "terminal" | "explorer" | "cd-player" | "recycle-bin";
	icon?: string;
	/** When set, geometry is clamped inside this parent window */
	parentId?: string;
	/** Hidden without unmounting. Decorations are restored through Start. */
	minimized?: boolean;
	/** An explicit launch bypasses the initial boot reveal schedule. */
	launched?: boolean;
};

type Rect = Pick<DesktopWindow, "x" | "y" | "w" | "h">;

/** Shared with the desktop CSS variable so bounds and chrome cannot drift. */
export const TASKBAR_H = 32;
const TITLE_H = 22;

/** Window chrome: padding, border and client margin. Keep in sync with window.css. */
const CHROME_X = 12;
const CHROME_Y = TITLE_H + 12;
/** The client area's origin inside the window box. */
const FRAME_X = CHROME_X / 2;
const FRAME_Y = TITLE_H + (CHROME_Y - TITLE_H) / 2;

/** Paint's chrome around its canvas. Keep in sync with the paint.css variables. */
const PAINT_INNER_X = 56;
const PAINT_INNER_Y = 18;
const PAINT_INNER_BOTTOM = 70;

const STREET_RATIO = 1360 / 768; // street.webp
const MARGIN = 24;
/** Space kept clear beside the icon columns and at the right edge when fitting the windows in. */
const FIT_GAP = 16;
/** The smallest Paint window the arrangement shrinks to; below that, the desktop zooms instead. */
const MIN_PAINT_H = 360;

/** Desktop icon cells and the 8px gaps between them; keep in sync with desktop.css. */
export const ICON_W = 96;
export const ICON_H = 112;
export const ICON_STEP_X = ICON_W + 8;
export const ICON_STEP_Y = ICON_H + 8;
/** The icon list's insets in desktop.css: 10px from the left, 12px from the top, 16px above the taskbar. */
const ICONS_LEFT = 10;
const ICONS_INSET_Y = 12 + 16;
/** Every icon the desktop starts with, the Recycle Bin included. */
const START_ICONS = DESK_ICONS.length + 1;

/** The desktop's icon grid, with enough rows for every icon even when the screen is short. */
export function iconGrid(vw: number, vh: number, count: number) {
	const width = Math.max(ICON_W, vw - ICONS_LEFT);
	const height = Math.max(ICON_H, vh - TASKBAR_H - ICONS_INSET_Y);
	const cols = Math.max(1, Math.floor((width - ICON_W) / ICON_STEP_X) + 1);
	const rows = Math.max(1, Math.floor((height - ICON_H) / ICON_STEP_Y) + 1, Math.ceil(count / cols));
	return { cols, rows };
}

function layoutCentered(w: number, h: number, vw: number, vh: number): Rect {
	return { w, h, x: Math.round((vw - w) / 2), y: Math.round((vh - TASKBAR_H - h) / 2) };
}

/** Desktop-space rect of the Paint image (canvas), not the whole adam window. */
function paintImageBounds(parent: Rect): Rect {
	return {
		x: parent.x + FRAME_X + PAINT_INNER_X,
		y: parent.y + FRAME_Y + PAINT_INNER_Y,
		w: parent.w - CHROME_X - PAINT_INNER_X,
		h: parent.h - CHROME_Y - PAINT_INNER_Y - PAINT_INNER_BOTTOM,
	};
}

/** Bounds nested windows clamp to (paint canvas, else full parent). */
export function nestBounds(parent: Rect & Pick<DesktopWindow, "kind">): Rect {
	return parent.kind === "paint" ? paintImageBounds(parent) : parent;
}

export function clampToParent(child: Rect, parent: Rect): Rect {
	return {
		w: child.w,
		h: child.h,
		x: Math.min(Math.max(child.x, parent.x), Math.max(parent.x, parent.x + parent.w - child.w)),
		y: Math.min(Math.max(child.y, parent.y), Math.max(parent.y, parent.y + parent.h - child.h)),
	};
}

/** Keeps a title bar reachable: 48px of the window stay on screen and the title bar above the taskbar. */
export function clampWindowPos(x: number, y: number, w: number, vw: number, vh: number) {
	return {
		x: Math.min(vw - 48, Math.max(48 - w, x)),
		y: Math.min(vh - TASKBAR_H - TITLE_H, Math.max(0, y)),
	};
}

/** The adam Paint window: up to `maxH` tall and centred, its canvas at the photo's ratio. */
function layoutMeWindow(vw: number, vh: number, maxH: number): Rect {
	const chromeX = CHROME_X + PAINT_INNER_X;
	const chromeY = CHROME_Y + PAINT_INNER_Y + PAINT_INNER_BOTTOM;
	let canvasH = maxH - chromeY;
	let canvasW = canvasH / STREET_RATIO;
	if (canvasW + chromeX > vw - MARGIN * 2) {
		canvasW = vw - MARGIN * 2 - chromeX;
		canvasH = canvasW * STREET_RATIO;
	}
	const w = Math.round(canvasW + chromeX);
	const h = Math.round(canvasH + chromeY);
	return { w, h, x: Math.round((vw - w) / 2), y: Math.round(MARGIN + (vh - TASKBAR_H - MARGIN * 2 - h) / 2) };
}

/** The "move me" window sits over the face in the photo, which lands at its lower right. */
function layoutAltOnParent(parent: Rect): Rect {
	const img = paintImageBounds(parent);
	const side = Math.round(Math.min(img.w, img.h) * 0.42);
	const faceX = img.x + img.w * 0.56;
	const faceY = img.y + img.h * 0.32;
	return clampToParent({ x: Math.round(faceX - side * 0.72) + 20, y: Math.round(faceY - side * 0.7), w: side, h: side }, img);
}

/** The beep boop GIF, left of Paint. */
function layoutBeepBoop(anchor: Rect): Rect {
	const w = 96 + CHROME_X;
	const h = 96 + CHROME_Y;
	return { w, h, x: Math.round(anchor.x - w - 70), y: Math.round(anchor.y + anchor.h * 0.18) };
}

const ERR_W = 260;
const ERR_H = 128;
const ERR_COUNT = 5;

/** Five error dialogs right of Paint, snaking right to left along a ︶⁔︶ wave. */
function layoutErrorStack(paint: Rect): DesktopWindow[] {
	const baseX = Math.round(paint.x + paint.w + 72) + (ERR_COUNT - 1) * 24;
	const baseY = Math.round(paint.y + paint.h * 0.86 - ERR_H / 2);
	return Array.from({ length: ERR_COUNT }, (_, i) => ({
		id: `sysmsg-${i}`,
		title: "system message",
		kind: "error" as const,
		x: Math.round(baseX - i * 24),
		y: Math.round(baseY + Math.sin(Math.PI / 2 + (i / (ERR_COUNT - 1)) * Math.PI * 1.5) * 36),
		w: ERR_W,
		h: ERR_H,
		z: 20 + i,
	}));
}

function layoutTerminalWindow(anchor: Rect, vw: number, vh: number): Rect {
	const w = Math.round(anchor.w * 1.3 * 0.85);
	const h = Math.round(anchor.h * 0.7);
	return { w, h, ...clampWindowPos(anchor.x + anchor.w + 50, Math.round(anchor.y + (anchor.h - h) / 2), w, vw, vh) };
}

/** Sized for about five months of the contribution calendar; the rest of the year scrolls. */
function layoutGitHubWindow(anchor: Rect): Rect {
	// Keep in sync with GitHubGraph's ActivityCalendar props and github-graph.css padding.
	const block = 11;
	const gap = 3;
	const pad = 8;
	const w = 28 + 21 * (block + gap) - gap + pad * 2 + CHROME_X;
	const h = 18 + 7 * (block + gap) - gap + pad * 2 + CHROME_Y;
	return { w, h, x: Math.round(anchor.x + anchor.w - w + 18), y: Math.round(anchor.y - h * 0.35) };
}

function makeCdPlayerWindow(z: number, vw: number, vh: number): DesktopWindow {
	// Desktop aligns this to the actual task button when the app is restored.
	return { id: "cd-player", title: "cd player", kind: "cd-player", icon: "/icons/cd.png", z, w: Math.min(360, vw - 16), h: 188, x: 8, y: Math.max(0, vh - TASKBAR_H - 188 - 4) };
}

/** The starting windows, arranged around a Paint window up to `paintH` tall. */
function arrangeDesktop(vw: number, vh: number, paintH: number): DesktopWindow[] {
	const me = { id: "me", title: "adam-paint", z: 2, kind: "paint" as const, src: "/photos/street.webp", icon: "/paint/icon-16.png", ...layoutMeWindow(vw, vh, paintH) };
	const terminal = { id: "terminal", title: "MS-DOS Prompt", z: 12, kind: "terminal" as const, icon: "/icons/terminal.svg", ...layoutTerminalWindow(me, vw, vh) };
	const windows: DesktopWindow[] = [
		me,
		{ id: "alt", title: "move me", z: 3, parentId: "me", ...layoutAltOnParent(me) },
		{ id: "new", title: "beep boop", z: 4, src: "/photos/beep-boop.webp", ...layoutBeepBoop(me) },
		terminal,
		{ id: "github", title: "activity", icon: "/icons/code.svg", z: 13, kind: "github", ...layoutGitHubWindow(terminal) },
		{ ...makeCdPlayerWindow(14, vw, vh), minimized: true },
		...layoutErrorStack(me),
	];
	return windows;
}

/**
 * The starting desktop. Every window is placed around Paint, which stays
 * centred; Paint is as tall as the screen allows while every window that
 * opens at startup still fits between the icon columns and the right edge.
 */
export function layoutDesktop(vw: number, vh: number): DesktopWindow[] {
	// Icons fill each column top to bottom before starting the next.
	const iconColumns = Math.ceil(START_ICONS / iconGrid(vw, vh, START_ICONS).rows);
	const left = ICONS_LEFT + iconColumns * ICON_STEP_X - 8 + FIT_GAP;
	const right = vw - FIT_GAP;
	const fits = (paintH: number) => arrangeDesktop(vw, vh, paintH).every((w) =>
		w.minimized || w.parentId || (w.x >= left && w.x + w.w <= right));

	// The arrangement widens as Paint grows, so search for the tallest Paint that fits.
	let paintH = vh - TASKBAR_H - MARGIN * 2;
	if (!fits(paintH)) {
		// The floor gives way on screens too short for even the smallest Paint.
		let fitting = Math.min(MIN_PAINT_H, paintH);
		let tooTall = paintH;
		while (tooTall - fitting > 1) {
			const middle = Math.floor((fitting + tooTall) / 2);
			if (fits(middle)) fitting = middle;
			else tooTall = middle;
		}
		paintH = fitting;
	}
	return arrangeDesktop(vw, vh, paintH).map((w) => w.parentId ? w : { ...w, ...clampWindowPos(w.x, w.y, w.w, vw, vh) });
}

/**
 * Lays the open windows out for a new viewport. Each keeps its offset from
 * its default place, so user moves survive; windows without a default place
 * follow the adam window. Nested windows keep their place inside their parent.
 */
export function reflowDesktop(current: DesktopWindow[], previous: DesktopWindow[], next: DesktopWindow[], vw: number, vh: number): DesktopWindow[] {
	const oldLayout = new Map(previous.map((w) => [w.id, w]));
	const newLayout = new Map(next.map((w) => [w.id, w]));
	const oldAnchor = oldLayout.get("me");
	const anchor = newLayout.get("me");
	if (!oldAnchor || !anchor) return current;
	const dx = anchor.x + anchor.w / 2 - oldAnchor.x - oldAnchor.w / 2;
	const dy = anchor.y + anchor.h / 2 - oldAnchor.y - oldAnchor.h / 2;

	const resized = current.map((w) => {
		if (w.parentId) return w;
		const old = oldLayout.get(w.id);
		const target = newLayout.get(w.id);
		const width = target?.w ?? w.w;
		const x = old && target ? target.x + w.x - old.x : w.x + dx;
		const y = old && target ? target.y + w.y - old.y : w.y + dy;
		return { ...w, w: width, h: target?.h ?? w.h, ...clampWindowPos(x, y, width, vw, vh) };
	});

	return resized.map((w) => {
		const parent = resized.find((p) => p.id === w.parentId);
		const oldParent = current.find((p) => p.id === w.parentId);
		if (!parent || !oldParent) return w;
		const old = oldLayout.get(w.id);
		const target = newLayout.get(w.id);
		const oldBase = oldLayout.get(parent.id);
		const newBase = newLayout.get(parent.id);
		// The default offset inside the parent can change with the viewport.
		const shift = old && target && oldBase && newBase;
		return {
			...w,
			...clampToParent({
				x: parent.x + w.x - oldParent.x + (shift ? target.x - newBase.x - old.x + oldBase.x : 0),
				y: parent.y + w.y - oldParent.y + (shift ? target.y - newBase.y - old.y + oldBase.y : 0),
				w: target?.w ?? w.w,
				h: target?.h ?? w.h,
			}, nestBounds(parent)),
		};
	});
}

/** The PSP, at its artwork's ratio and as large as the desktop allows. */
export function makeExperienceWindow(z: number, vw: number, vh: number): DesktopWindow {
	const ratio = 1840 / 855;
	const maxW = Math.max(0, Math.min(1350, vw - 16));
	const maxH = Math.max(0, vh - TASKBAR_H - 16);
	const w = Math.max(1, Math.min(maxW, Math.floor(maxH * ratio)));
	const h = Math.max(1, Math.round(w / ratio));
	return { id: "experience", title: "experience", kind: "experience", icon: "/icons/playstation.svg", ...layoutCentered(w, h, vw, vh), z };
}

/** A shell folder window, independent of the items stored inside it. */
export function makeRecycleBinWindow(z: number, vw: number, vh: number): DesktopWindow {
	const w = Math.min(760, Math.max(240, vw - 24));
	const h = Math.min(400, Math.max(200, vh - TASKBAR_H - 48));
	return { id: "recycle-bin", title: "recycle bin", kind: "recycle-bin", icon: "/icons/recycle-bin-empty.png", z, ...layoutCentered(w, h, vw, vh) };
}

/** Explorer opens left of the adam window with their bottoms aligned, or centred if there is no room. */
export function makeExplorerWindow(z: number, anchor: Rect | undefined, vw: number, vh: number): DesktopWindow {
	const gap = 35;
	const leftSpace = anchor ? anchor.x - gap - MARGIN : 0;
	const fitsLeft = leftSpace >= 320;
	const w = Math.min(520, Math.max(1, vw - MARGIN * 2), fitsLeft ? leftSpace : 520);
	const h = Math.min(360, Math.max(1, vh - TASKBAR_H - MARGIN * 2));
	const centered = layoutCentered(w, h, vw, vh);
	const x = anchor && fitsLeft ? anchor.x - w - gap : centered.x;
	const y = anchor ? anchor.y + anchor.h - h : centered.y;
	return {
		id: "explorer", title: "secrets", kind: "explorer", icon: "/icons/folder.png", z, w, h,
		x: Math.max(MARGIN, Math.min(x, vw - MARGIN - w)),
		y: Math.max(MARGIN, Math.min(y, vh - TASKBAR_H - MARGIN - h)),
	};
}

/** Places the overlay photo inside the "move me" window so it lines up with the Paint photo below. */
export function altCropStyle(child: Pick<DesktopWindow, "x" | "y">, parent: Rect) {
	const img = paintImageBounds(parent);
	return { width: img.w, height: img.h, left: img.x - (child.x + FRAME_X), top: img.y - (child.y + FRAME_Y) };
}
