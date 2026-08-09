export type DesktopWindow = {
	id: string;
	title: string;
	x: number;
	y: number;
	w: number;
	h: number;
	z: number;
	/** When set, geometry is clamped inside this parent window */
	parentId?: string;
};

export const TASKBAR_H = 36;
export const TITLE_H = 22;

/** pad+border+client margin — keep in sync with window.css */
export const CHROME_X = 12;
export const CHROME_Y = TITLE_H + 12;
const STREET_RATIO = 2725 / 1539;
const MARGIN = 24;
const ALT_SIDE_FRAC = 0.42;

/** Face anchor in me (fractions). Window sits upper-left so face lands BR in overlay. */
const ALT_FACE_CX = 0.56;
const ALT_FACE_CY = 0.32;
const ALT_FACE_IN_BOX_X = 0.72;
const ALT_FACE_IN_BOX_Y = 0.7;

function layoutMeWindow(
	vw: number,
	vh: number,
): Pick<DesktopWindow, "x" | "y" | "w" | "h"> {
	const maxH = vh - TASKBAR_H - MARGIN * 2;
	const maxW = vw - MARGIN * 2;

	let clientH = maxH - CHROME_Y;
	let clientW = clientH / STREET_RATIO;
	if (clientW + CHROME_X > maxW) {
		clientW = maxW - CHROME_X;
		clientH = clientW * STREET_RATIO;
	}

	const w = Math.round(clientW + CHROME_X);
	const h = Math.round(clientH + CHROME_Y);
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
	const x = Math.round(faceX - side * ALT_FACE_IN_BOX_X);
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

export function layoutPhotoStack(vw: number, vh: number): DesktopWindow[] {
	const me = { id: "me", title: "me", z: 2, ...layoutMeWindow(vw, vh) };
	return [
		me,
		{
			id: "alt",
			title: "alt",
			z: 3,
			parentId: "me",
			...layoutAltOnParent(me),
		},
	];
}

export function altCropStyle(
	child: Pick<DesktopWindow, "x" | "y">,
	parent: Pick<DesktopWindow, "x" | "y" | "w" | "h">,
) {
	return {
		width: parent.w - CHROME_X,
		height: parent.h - CHROME_Y,
		left: parent.x - child.x,
		top: parent.y - child.y,
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
