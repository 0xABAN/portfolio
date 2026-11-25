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
	parentId?: string;
	minimized?: boolean;
	launched?: boolean;
};

type Rect = Pick<DesktopWindow, "x" | "y" | "w" | "h">;

export const TASKBAR_H = 28;
export const TITLE_H = 18;

const DESIGN_W = 1710;
const DESIGN_H = 900;
const MIN_SCALE = 0.5;

export function desktopScale() {
	return Math.max(MIN_SCALE, Math.min(innerWidth / DESIGN_W, innerHeight / DESIGN_H));
}

export function desktopSize() {
	const scale = desktopScale();
	return { width: innerWidth / scale, height: innerHeight / scale };
}

const FRAME = 4;
const CLIENT_EDGE = 2;
const FRAME_X = FRAME + CLIENT_EDGE;
const FRAME_Y = FRAME + TITLE_H + 1 + CLIENT_EDGE;
const CHROME_X = FRAME_X * 2;
const CHROME_Y = FRAME_Y + FRAME_X;

const PAINT_INNER_X = 56;
const PAINT_INNER_Y = 19 + 2;
const PAINT_INNER_RIGHT = 2;
const PAINT_INNER_BOTTOM = 2 + 48 + 20;

const STREET_RATIO = 1360 / 768;
const MARGIN = 24;

function layoutCentered(w: number, h: number, vw: number, vh: number): Rect {
	return { w, h, x: Math.round((vw - w) / 2), y: Math.round((vh - TASKBAR_H - h) / 2) };
}

function paintImageBounds(parent: Rect): Rect {
	return {
		x: parent.x + FRAME_X + PAINT_INNER_X,
		y: parent.y + FRAME_Y + PAINT_INNER_Y,
		w: parent.w - CHROME_X - PAINT_INNER_X - PAINT_INNER_RIGHT,
		h: parent.h - CHROME_Y - PAINT_INNER_Y - PAINT_INNER_BOTTOM,
	};
}

export function nestBounds(parent: Rect & Pick<DesktopWindow, "kind">): Rect {
	return parent.kind === "paint" ? paintImageBounds(parent) : parent;
}

function clampToParent(child: Rect, parent: Rect): Rect {
	const maxX = Math.max(parent.x, parent.x + parent.w - child.w);
	const maxY = Math.max(parent.y, parent.y + parent.h - child.h);

	return {
		w: child.w,
		h: child.h,
		x: Math.min(Math.max(child.x, parent.x), maxX),
		y: Math.min(Math.max(child.y, parent.y), maxY),
	};
}

export function clampWindowPos(x: number, y: number, w: number, vw: number, vh: number) {
	return {
		x: Math.min(vw - 48, Math.max(48 - w, x)),
		y: Math.min(vh - TASKBAR_H - TITLE_H, Math.max(0, y)),
	};
}

function layoutMeWindow(vw: number, vh: number): Rect {
	const chromeX = CHROME_X + PAINT_INNER_X + PAINT_INNER_RIGHT;
	const chromeY = CHROME_Y + PAINT_INNER_Y + PAINT_INNER_BOTTOM;
	const availableW = vw - MARGIN * 2;
	const availableH = vh - TASKBAR_H - MARGIN * 2;

	let canvasH = Math.min(vh, DESIGN_H) - TASKBAR_H - MARGIN * 2 - chromeY;
	let canvasW = canvasH / STREET_RATIO;
	if (canvasW + chromeX > availableW) {
		canvasW = availableW - chromeX;
		canvasH = canvasW * STREET_RATIO;
	}

	const w = Math.round(canvasW + chromeX);
	const h = Math.round(canvasH + chromeY);
	return { w, h, x: Math.round((vw - w) / 2), y: Math.round(MARGIN + (availableH - h) / 2) };
}

function layoutAltOnParent(parent: Rect): Rect {
	const img = paintImageBounds(parent);
	const side = Math.round(Math.min(img.w, img.h) * 0.42);
	const faceX = img.x + img.w * 0.56;
	const faceY = img.y + img.h * 0.32;

	const crop = { x: Math.round(faceX - side * 0.72) + 20, y: Math.round(faceY - side * 0.7), w: side, h: side };
	return clampToParent(crop, img);
}

function layoutBeepBoop(anchor: Rect): Rect {
	const w = 96 + CHROME_X;
	const h = 96 + CHROME_Y;
	return { w, h, x: Math.round(anchor.x - w - 70), y: Math.round(anchor.y + anchor.h * 0.18) };
}

const ERR_W = 260;
const ERR_H = 128;
const ERR_COUNT = 5;

function layoutErrorStack(paint: Rect): DesktopWindow[] {
	const baseX = Math.round(paint.x + paint.w + 72) + (ERR_COUNT - 1) * 24;
	const baseY = Math.round(paint.y + paint.h * 0.86 - ERR_H / 2);

	return Array.from({ length: ERR_COUNT }, (_, i) => {
		const wave = Math.sin(Math.PI / 2 + (i / (ERR_COUNT - 1)) * Math.PI * 1.5);

		return {
			id: `sysmsg-${i}`,
			title: "system message",
			kind: "error" as const,
			x: Math.round(baseX - i * 24),
			y: Math.round(baseY + wave * 36),
			w: ERR_W,
			h: ERR_H,
			z: 20 + i,
		};
	});
}

function layoutTerminalWindow(anchor: Rect, vw: number, vh: number): Rect {
	const w = Math.round(anchor.w * 1.3 * 0.85);
	const h = Math.round(anchor.h * 0.7);

	const x = anchor.x + anchor.w + 50;
	const y = Math.round(anchor.y + (anchor.h - h) / 2);
	return { w, h, ...clampWindowPos(x, y, w, vw, vh) };
}

function layoutGitHubWindow(anchor: Rect): Rect {
	const block = 11;
	const gap = 3;
	const pad = 8;

	const w = 28 + 21 * (block + gap) - gap + pad * 2 + CHROME_X;
	const h = 18 + 7 * (block + gap) - gap + pad * 2 + CHROME_Y;

	return { w, h, x: Math.round(anchor.x + anchor.w - w + 18), y: Math.round(anchor.y - h * 0.35) };
}

function layoutExplorerWindow(anchor: Rect, vw: number, vh: number): Rect {
	const w = Math.min(252, vw - MARGIN * 2);
	const h = Math.min(190, vh - TASKBAR_H - MARGIN * 2);

	const x = Math.round(anchor.x + anchor.w * 0.11 - 150);
	const y = Math.round(anchor.y + anchor.h * 0.75 - h / 2);

	return {
		w,
		h,
		x: Math.max(MARGIN, Math.min(x, vw - MARGIN - w)),
		y: Math.max(MARGIN, Math.min(y, vh - TASKBAR_H - MARGIN - h)),
	};
}

function makeCdPlayerWindow(z: number, vw: number, vh: number): DesktopWindow {
	const h = 188;
	return {
		id: "cd-player",
		title: "cd player",
		kind: "cd-player",
		icon: "/icons/cd.webp",
		z,
		w: Math.min(360, vw - 16),
		h,
		x: 8,
		y: Math.max(0, vh - TASKBAR_H - h - 4),
	};
}

export function layoutDesktop(vw: number, vh: number): DesktopWindow[] {
	const me = {
		id: "me",
		title: "adam-paint",
		z: 2,
		kind: "paint" as const,
		src: "/desktop/street.webp",
		icon: "/icons/paint.webp",
		...layoutMeWindow(vw, vh),
	};

	const terminal = {
		id: "terminal",
		title: "MS-DOS Prompt",
		z: 12,
		kind: "terminal" as const,
		icon: "/icons/terminal.svg",
		...layoutTerminalWindow(me, vw, vh),
	};
	const windows: DesktopWindow[] = [
		me,
		{ id: "alt", title: "move me", z: 3, parentId: "me", ...layoutAltOnParent(me) },
		{ id: "new", title: "beep boop", z: 4, src: "/desktop/beep-boop.webp", ...layoutBeepBoop(me) },
		terminal,
		{ id: "github", title: "activity", icon: "/icons/code.svg", z: 13, kind: "github", ...layoutGitHubWindow(terminal) },
		{ ...makeCdPlayerWindow(14, vw, vh), minimized: true },
		{ id: "explorer", title: "secrets", z: 5, kind: "explorer", icon: "/icons/folder.webp", ...layoutExplorerWindow(me, vw, vh) },
		...layoutErrorStack(me),
	];
	return windows.map((w) => w.parentId ? w : { ...w, ...clampWindowPos(w.x, w.y, w.w, vw, vh) });
}

export function reflowDesktop(
	current: DesktopWindow[],
	previous: DesktopWindow[],
	next: DesktopWindow[],
	vw: number,
	vh: number,
): DesktopWindow[] {
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
		const shift = old && target && oldBase && newBase;

		const shiftX = shift ? target.x - newBase.x - old.x + oldBase.x : 0;
		const shiftY = shift ? target.y - newBase.y - old.y + oldBase.y : 0;
		const child = {
			x: parent.x + w.x - oldParent.x + shiftX,
			y: parent.y + w.y - oldParent.y + shiftY,
			w: target?.w ?? w.w,
			h: target?.h ?? w.h,
		};

		return { ...w, ...clampToParent(child, nestBounds(parent)) };
	});
}

export function makeExperienceWindow(z: number, vw: number, vh: number): DesktopWindow {
	const ratio = 1840 / 855;
	const maxW = Math.max(0, Math.min(1350, vw - 16));
	const maxH = Math.max(0, vh - TASKBAR_H - 16);

	const w = Math.max(1, Math.min(maxW, Math.floor(maxH * ratio)));
	const h = Math.max(1, Math.round(w / ratio));

	return {
		id: "experience",
		title: "experience",
		kind: "experience",
		icon: "/icons/playstation.svg",
		...layoutCentered(w, h, vw, vh),
		z,
	};
}

function makeRecycleBinWindow(z: number, vw: number, vh: number): DesktopWindow {
	const w = Math.min(760, Math.max(240, vw - 24));
	const h = Math.min(400, Math.max(200, vh - TASKBAR_H - 48));

	return {
		id: "recycle-bin",
		title: "recycle bin",
		kind: "recycle-bin",
		icon: "/icons/recycle-bin-empty.webp",
		z,
		...layoutCentered(w, h, vw, vh),
	};
}

export function altCropStyle(child: Pick<DesktopWindow, "x" | "y">, parent: Rect) {
	const img = paintImageBounds(parent);

	return {
		width: img.w,
		height: img.h,
		left: img.x - (child.x + FRAME_X),
		top: img.y - (child.y + FRAME_Y),
	};
}

export type AppId = "me" | "terminal" | "github" | "explorer" | "experience" | "cd-player" | "recycle-bin";

export function isDecoration(w: DesktopWindow) {
	return w.kind === "error" || w.id === "new";
}

function nextZ(windows: DesktopWindow[]) {
	return Math.max(0, ...windows.map((w) => w.z)) + 1;
}

function createAppWindows(windows: DesktopWindow[], id: AppId, vw: number, vh: number): DesktopWindow[] {
	const z = nextZ(windows);

	if (id === "recycle-bin") return [makeRecycleBinWindow(z, vw, vh)];
	if (id === "experience") return [makeExperienceWindow(z, vw, vh)];

	return layoutDesktop(vw, vh).filter((w) => w.id === id || w.parentId === id);
}

export function openApp(windows: DesktopWindow[], id: AppId, vw: number, vh: number): DesktopWindow[] {
	const isOpen = windows.some((w) => w.id === id);
	const next = isOpen ? windows : [...windows, ...createAppWindows(windows, id, vw, vh)];

	return activateWindow(next, id).map((w) => {
		if (w.id !== id && w.parentId !== id) return w;
		return { ...w, launched: true };
	});
}

export function restoreDecorations(windows: DesktopWindow[]): DesktopWindow[] {
	let z = nextZ(windows);

	return windows.map((w) => {
		if (!isDecoration(w) || !w.minimized) return w;
		return { ...w, minimized: false, launched: true, z: z++ };
	});
}

export function taskWindows(windows: DesktopWindow[]) {
	return windows.filter((w) => !w.parentId && !isDecoration(w));
}

export function activeWindowId(windows: DesktopWindow[]): string | undefined {
	const candidates = windows.filter((w) => !w.minimized && !w.parentId);
	const front = candidates.reduce<DesktopWindow | undefined>((top, w) => (!top || w.z > top.z ? w : top), undefined);

	return front && !isDecoration(front) ? front.id : undefined;
}

export function activateWindow(windows: DesktopWindow[], id: string): DesktopWindow[] {
	const target = windows.find((w) => w.id === id);
	if (!target) return windows;

	const rootId = target.parentId ?? target.id;
	const inFamily = (w: DesktopWindow) => w.id === rootId || w.parentId === rootId;

	const family = windows.filter(inFamily).sort((a, b) => {
		if (a.id === rootId) return -1;
		if (b.id === rootId) return 1;
		return a.z - b.z;
	});

	const top = Math.max(0, ...windows.filter((w) => !inFamily(w)).map((w) => w.z));
	if (family.every((w) => !w.minimized && w.z > top)) return windows;

	const z = nextZ(windows);
	const ranks = new Map(family.map((w, i) => [w.id, z + i]));

	return windows.map((w) => {
		const rank = ranks.get(w.id);
		return rank === undefined ? w : { ...w, minimized: false, z: rank };
	});
}

export function minimizeWindowTree(windows: DesktopWindow[], id: string): DesktopWindow[] {
	const target = windows.find((w) => w.id === id);
	const rootId = target?.parentId ?? id;

	return windows.map((w) => (w.id === rootId || w.parentId === rootId ? { ...w, minimized: true } : w));
}

export function moveWindow(
	windows: DesktopWindow[],
	id: string,
	x: number,
	y: number,
	vw: number,
	vh: number,
): DesktopWindow[] {
	const target = windows.find((w) => w.id === id);
	const parent = windows.find((w) => w.id === target?.parentId);
	if (!target || (target.parentId && !parent)) return windows;

	const moved = parent
		? { ...target, ...clampToParent({ ...target, x, y }, nestBounds(parent)) }
		: { ...target, ...clampWindowPos(x, y, target.w, vw, vh) };

	const dx = moved.x - target.x;
	const dy = moved.y - target.y;
	if (!dx && !dy) return windows;

	return windows.map((w) => {
		if (w.id === id) return moved;
		if (w.parentId !== id) return w;

		const shifted = { ...w, x: w.x + dx, y: w.y + dy };
		return { ...w, ...clampToParent(shifted, nestBounds(moved)) };
	});
}
