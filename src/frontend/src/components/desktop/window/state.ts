import { clampToParent, clampWindowPos, layoutDesktop, makeExperienceWindow, makeExplorerWindow, makeRecycleBinWindow, nestBounds, type DesktopWindow } from "./layout";

export type AppId = "me" | "terminal" | "github" | "explorer" | "experience" | "cd-player" | "recycle-bin";

export function isDecoration(w: DesktopWindow) {
	return w.kind === "error" || w.id === "new";
}

/** The z-index just above every window. */
function nextZ(windows: DesktopWindow[]) {
	return Math.max(0, ...windows.map((w) => w.z)) + 1;
}

/** Start and desktop launchers share one create-or-activate path. */
export function openApp(windows: DesktopWindow[], id: AppId, vw: number, vh: number): DesktopWindow[] {
	let next = windows;
	if (!windows.some((w) => w.id === id)) {
		const z = nextZ(windows);
		const created = id === "recycle-bin" ? [makeRecycleBinWindow(z, vw, vh)]
			: id === "experience" ? [makeExperienceWindow(z, vw, vh)]
			: id === "explorer" ? [makeExplorerWindow(z, windows.find((w) => w.id === "me"), vw, vh)]
			: layoutDesktop(vw, vh).filter((w) => w.id === id || w.parentId === id);
		next = [...windows, ...created];
	}
	return activateWindow(next, id).map((w) => w.id === id || w.parentId === id ? { ...w, launched: true } : w);
}

export function restoreDecorations(windows: DesktopWindow[]): DesktopWindow[] {
	let z = nextZ(windows);
	return windows.map((w) => isDecoration(w) && w.minimized ? { ...w, minimized: false, launched: true, z: z++ } : w);
}

/** Array order is launch order, independent of activation and minimization. */
export function taskWindows(windows: DesktopWindow[]) {
	return windows.filter((w) => !w.parentId && !isDecoration(w));
}

export function activeWindowId(windows: DesktopWindow[]): string | undefined {
	const front = windows.filter((w) => !w.minimized && !w.parentId)
		.reduce<DesktopWindow | undefined>((front, w) => !front || w.z > front.z ? w : front, undefined);
	return front && !isDecoration(front) ? front.id : undefined;
}

/** Raise an owned window family together without changing its task order. */
export function activateWindow(windows: DesktopWindow[], id: string): DesktopWindow[] {
	const target = windows.find((w) => w.id === id);
	if (!target) return windows;
	const rootId = target.parentId ?? target.id;
	const family = windows.filter((w) => w.id === rootId || w.parentId === rootId)
		.sort((a, b) => a.id === rootId ? -1 : b.id === rootId ? 1 : a.z - b.z);
	const top = Math.max(0, ...windows.filter((w) => w.id !== rootId && w.parentId !== rootId).map((w) => w.z));
	if (family.every((w) => !w.minimized && w.z > top)) return windows;

	const z = nextZ(windows);
	const ranks = new Map(family.map((w, i) => [w.id, z + i]));
	return windows.map((w) => ranks.has(w.id) ? { ...w, minimized: false, z: ranks.get(w.id)! } : w);
}

export function minimizeWindowTree(windows: DesktopWindow[], id: string): DesktopWindow[] {
	const target = windows.find((w) => w.id === id);
	const rootId = target?.parentId ?? id;
	return windows.map((w) => w.id === rootId || w.parentId === rootId ? { ...w, minimized: true } : w);
}

/**
 * Moves a window, clamped to the screen, or to its parent's canvas if it is
 * nested. Windows nested in it move along and stay inside it.
 */
export function moveWindow(windows: DesktopWindow[], id: string, x: number, y: number, vw: number, vh: number): DesktopWindow[] {
	const target = windows.find((w) => w.id === id);
	const parent = windows.find((w) => w.id === target?.parentId);
	if (!target || (target.parentId && !parent)) return windows;
	const moved = parent
		? { ...target, ...clampToParent({ ...target, x, y }, nestBounds(parent)) }
		: { ...target, ...clampWindowPos(x, y, target.w, vw, vh) };
	const dx = moved.x - target.x;
	const dy = moved.y - target.y;
	if (!dx && !dy) return windows;
	return windows.map((w) => w.id === id ? moved
		: w.parentId === id ? { ...w, ...clampToParent({ ...w, x: w.x + dx, y: w.y + dy }, nestBounds(moved)) }
		: w);
}
