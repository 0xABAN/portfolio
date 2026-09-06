export const GITHUB_USER = "0xABAN";
export const GITHUB_URL = `https://github.com/${GITHUB_USER}`;

export type DesktopWindow = {
	id: string;
	title: string;
	x: number;
	y: number;
	w: number;
	h: number;
	z: number;
	src?: string;
	kind?:
		| "error"
		| "paint"
		| "github"
		| "experience"
		| "terminal"
		| "bio"
		| "explorer";
	icon?: string;
	/** When set, geometry is clamped inside this parent window */
	parentId?: string;
	/** Hidden from desktop; shown as a taskbar tab until restored */
	minimized?: boolean;
};

const TASKBAR_H = 36;
const TITLE_H = 22;

/** pad+border+client margin — keep in sync with window.css */
const CHROME_X = 12;
const CHROME_Y = TITLE_H + 12;

/** Client origin inside window box (border+pad each side). */
const FRAME_X = CHROME_X / 2;
const FRAME_Y = TITLE_H + (CHROME_Y - TITLE_H) / 2;

/** Paint chrome inside client — keep in sync with paint.css vars */
const PAINT_INNER_X = 56;
const PAINT_INNER_Y = 18;
const PAINT_INNER_BOTTOM = 70;

const STREET_RATIO = 1360 / 768; // street.png
const MARGIN = 24;
const ALT_SIDE_FRAC = 0.42;

/** Face anchor in me (fractions). Window sits upper-left so face lands BR in overlay. */
const ALT_FACE_CX = 0.56;
const ALT_FACE_CY = 0.32;
const ALT_FACE_IN_BOX_X = 0.72;
const ALT_FACE_IN_BOX_Y = 0.7;

type Rect = Pick<DesktopWindow, "x" | "y" | "w" | "h">;

function viewport(vw?: number, vh?: number) {
	if (vw != null && vh != null) return { vw, vh };
	if (typeof window !== "undefined") {
		return { vw: window.innerWidth, vh: window.innerHeight };
	}
	return { vw: 1440, vh: 900 };
}

function layoutCentered(w: number, h: number, vw?: number, vh?: number): Rect {
	const { vw: W, vh: H } = viewport(vw, vh);
	return {
		w,
		h,
		x: Math.round((W - w) / 2),
		y: Math.round((H - TASKBAR_H - h) / 2),
	};
}

function paintCanvasSize(parent: Pick<DesktopWindow, "w" | "h">) {
	return {
		w: parent.w - CHROME_X - PAINT_INNER_X,
		h: parent.h - CHROME_Y - PAINT_INNER_Y - PAINT_INNER_BOTTOM,
		insetX: PAINT_INNER_X,
		insetY: PAINT_INNER_Y,
	};
}

/** Desktop-space rect of the Paint image (canvas), not the whole adam window. */
export function paintImageBounds(parent: Rect): Rect {
	const { w, h, insetX, insetY } = paintCanvasSize(parent);
	return {
		x: parent.x + FRAME_X + insetX,
		y: parent.y + FRAME_Y + insetY,
		w,
		h,
	};
}

/** Bounds nested windows clamp to (paint canvas, else full parent). */
export function nestBounds(
	parent: Rect & Pick<DesktopWindow, "kind">,
): Rect {
	return parent.kind === "paint" ? paintImageBounds(parent) : parent;
}

function layoutMeWindow(vw: number, vh: number): Rect {
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
	return {
		w,
		h,
		x: Math.round((vw - w) / 2),
		y: Math.round(MARGIN + (vh - TASKBAR_H - MARGIN * 2 - h) / 2),
	};
}

function layoutAltOnParent(parent: Rect): Rect {
	const img = paintImageBounds(parent);
	const side = Math.round(Math.min(img.w, img.h) * ALT_SIDE_FRAC);
	const faceX = img.x + img.w * ALT_FACE_CX;
	const faceY = img.y + img.h * ALT_FACE_CY;
	return clampToParent(
		{
			x: Math.round(faceX - side * ALT_FACE_IN_BOX_X) + 20,
			y: Math.round(faceY - side * ALT_FACE_IN_BOX_Y),
			w: side,
			h: side,
		},
		img,
	);
}

export function clampToParent(child: Rect, parent: Rect): Rect {
	const maxX = parent.x + parent.w - child.w;
	const maxY = parent.y + parent.h - child.h;
	return {
		w: child.w,
		h: child.h,
		x: Math.min(Math.max(child.x, parent.x), Math.max(parent.x, maxX)),
		y: Math.min(Math.max(child.y, parent.y), Math.max(parent.y, maxY)),
	};
}

const BEEP_Y_FRAC = 0.18;
/** Left of paint, right-aligned where the old notepad column sat. */
const PAINT_LEFT_GAP = 70;

function layoutBeepBoop(anchor: Rect): Rect {
	const client = 96;
	const w = client + CHROME_X;
	const h = client + CHROME_Y;
	return {
		w,
		h,
		x: Math.round(anchor.x - w - PAINT_LEFT_GAP),
		y: Math.round(anchor.y + anchor.h * BEEP_Y_FRAC),
	};
}

const ERR_W = 260;
const ERR_H = 128;
const ERR_COUNT = 5;
const ERR_STEP_X = 24;
const ERR_WAVE_Y = 36;
/** Gap past Paint’s right edge before the leftmost error dialog. */
const ERR_PAINT_GAP = 72; // +50px right

/** Error snake right→left with a vertical ︶⁔︶ wave. */
function layoutErrorStack(paint: Rect): DesktopWindow[] {
	const leftX = Math.round(paint.x + paint.w + ERR_PAINT_GAP);
	const baseX = leftX + (ERR_COUNT - 1) * ERR_STEP_X;
	const baseY = Math.round(paint.y + paint.h * 0.86 - ERR_H / 2);

	return Array.from({ length: ERR_COUNT }, (_, i) => {
		const t = i / (ERR_COUNT - 1);
		const wave = Math.sin(Math.PI / 2 + t * Math.PI * 1.5);
		return {
			id: `sysmsg-${i}`,
			title: "System message",
			kind: "error" as const,
			x: Math.round(baseX - i * ERR_STEP_X),
			y: Math.round(baseY + wave * ERR_WAVE_Y),
			w: ERR_W,
			h: ERR_H,
			z: 20 + i,
		};
	});
}

export function layoutDesktop(vw: number, vh: number): DesktopWindow[] {
	const me = {
		id: "me",
		title: "adam",
		z: 2,
		kind: "paint" as const,
		src: "/photos/street.png",
		icon: "/paint/icon-16.png",
		...layoutMeWindow(vw, vh),
	};
	const terminal = {
		id: "terminal",
		title: "Command Prompt",
		z: 12,
		kind: "terminal" as const,
		icon: "/icons/terminal.svg",
		...layoutTerminalWindow(me, vw, vh),
	};
	const windows: DesktopWindow[] = [
		me,
		{
			id: "alt",
			title: "magnifying glass",
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
			title: "",
			z: 13,
			kind: "github" as const,
			...layoutGitHubWindow(terminal),
		},
		...layoutErrorStack(me),
	];
	return windows.map((w) => w.parentId ? w : {
		...w,
		...clampWindowPos(w.x, w.y, w.w, vw, vh),
	});
}

/** Reflow existing windows, retaining user offsets rather than restoring closed apps. */
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
		if (!w.parentId) return w;
		const parent = resized.find((p) => p.id === w.parentId);
		const oldParent = current.find((p) => p.id === w.parentId);
		if (!parent || !oldParent) return w;
		const old = oldLayout.get(w.id);
		const target = newLayout.get(w.id);
		const oldBase = oldLayout.get(w.parentId);
		const newBase = newLayout.get(w.parentId);
		const shiftX = old && target && oldBase && newBase ? target.x - newBase.x - old.x + oldBase.x : 0;
		const shiftY = old && target && oldBase && newBase ? target.y - newBase.y - old.y + oldBase.y : 0;
		return {
			...w,
			...clampToParent({
				x: parent.x + w.x - oldParent.x + shiftX,
				y: parent.y + w.y - oldParent.y + shiftY,
				w: target?.w ?? w.w,
				h: target?.h ?? w.h,
			}, nestBounds(parent)),
		};
	});
}

export const EXPERIENCE_WINDOW_ID = "experience";

/** Work + projects browser (Figma-style shell). */
export function makeExperienceWindow(
	baseZ: number,
	vw?: number,
	vh?: number,
): DesktopWindow {
	const { vw: W, vh: H } = viewport(vw, vh);
	const w = 760;
	const h = 520;
	const x = Math.round((W - w) / 2) - 300;
	const y = Math.round((H - TASKBAR_H - h) / 2) + 300;
	return {
		id: EXPERIENCE_WINDOW_ID,
		title: "experience",
		kind: "experience",
		icon: "/icons/exe.png",
		x: Math.max(0, Math.min(x, W - w)),
		y: Math.max(0, Math.min(y, H - TASKBAR_H - h)),
		w,
		h,
		z: baseZ,
	};
}

const BIO_W = 572;
const BIO_H = 420;

/** Centered bio.txt window (opened from desk icon, not on load). */
export function makeBioWindow(z: number): DesktopWindow {
	return {
		id: "bio",
		title: "bio.txt",
		kind: "bio",
		icon: "/icons/notepad.svg",
		z,
		...layoutCentered(BIO_W, BIO_H),
	};
}

const EXPLORER_W = 520;
const EXPLORER_H = 360;
const EXPLORER_MIN_W = 320;
const EXPLORER_LEFT_GAP = 35;

export function makeExplorerWindow(z: number, anchor?: Rect, vw?: number, vh?: number): DesktopWindow {
	const { vw: W, vh: H } = viewport(vw, vh);
	const leftSpace = anchor ? anchor.x - EXPLORER_LEFT_GAP - MARGIN : 0;
	const fitsLeft = leftSpace >= EXPLORER_MIN_W;
	const w = Math.min(EXPLORER_W, Math.max(1, W - MARGIN * 2), fitsLeft ? leftSpace : EXPLORER_W);
	const h = Math.min(EXPLORER_H, Math.max(1, H - TASKBAR_H - MARGIN * 2));
	const centered = layoutCentered(w, h, W, H);
	const x = anchor && fitsLeft ? anchor.x - w - EXPLORER_LEFT_GAP : centered.x;
	const y = anchor ? anchor.y + anchor.h - h : centered.y;
	return {
		id: "explorer",
		title: "secrets",
		kind: "explorer",
		icon: "/icons/folder.png",
		z,
		w,
		h,
		x: Math.max(MARGIN, Math.min(x, W - MARGIN - w)),
		y: Math.max(MARGIN, Math.min(y, H - TASKBAR_H - MARGIN - h)),
	};
}

function layoutTerminalWindow(anchor: Rect, vw: number, vh: number): Rect {
	const w = Math.round(anchor.w * 1.3 * 0.85);
	const h = Math.round(anchor.h * 0.7);
	const { x, y } = clampWindowPos(
		anchor.x + anchor.w + 50,
		Math.round(anchor.y + (anchor.h - h) / 2),
		w,
		vw,
		vh,
	);
	return { x, y, w, h };
}

function layoutGitHubWindow(anchor: Rect): Rect {
	// Native cell size; viewport ~3 months, full year scrolls
	// keep in sync with GitHubGraph ActivityCalendar props / github-graph.css pad
	const block = 11;
	const gap = 3;
	const pad = 8;
	const labelW = 28;
	const labelH = 18;
	const weeks = 21; // ~5 months visible
	const graphW = labelW + weeks * (block + gap) - gap + pad * 2;
	const graphH = labelH + 7 * (block + gap) - gap + pad * 2;
	const w = graphW + CHROME_X;
	const h = graphH + CHROME_Y;
	return {
		w,
		h,
		x: Math.round(anchor.x + anchor.w - w - 12 - 20) + 50,
		y: Math.round(anchor.y - h * 0.35),
	};
}

export function altCropStyle(
	child: Pick<DesktopWindow, "x" | "y">,
	parent: Rect,
) {
	const img = paintImageBounds(parent);
	// Position relative to alt's win__client (same frame offsets as paintImageBounds)
	return {
		width: img.w,
		height: img.h,
		left: img.x - (child.x + FRAME_X),
		top: img.y - (child.y + FRAME_Y),
	};
}

export function clampWindowPos(
	x: number,
	y: number,
	w: number,
	vw?: number,
	vh?: number,
): { x: number; y: number } {
	if ((vw == null || vh == null) && typeof window === "undefined") return { x, y };
	const { vw: width, vh: height } = viewport(vw, vh);
	const minX = 48 - w;
	const maxX = width - 48;
	const maxY = height - TASKBAR_H - TITLE_H;
	return {
		x: Math.min(maxX, Math.max(minX, x)),
		y: Math.min(maxY, Math.max(0, y)),
	};
}
