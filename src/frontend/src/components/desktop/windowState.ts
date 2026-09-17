import type { DesktopWindow } from "./windows";

/** Array order is launch order, independent of activation and minimization. */
export function taskWindows(windows: DesktopWindow[]) {
	return windows.filter((w) => !w.parentId);
}

export function activeWindowId(windows: DesktopWindow[]): string | undefined {
	return taskWindows(windows)
		.filter((w) => !w.minimized)
		.reduce<DesktopWindow | undefined>((front, w) => !front || w.z > front.z ? w : front, undefined)?.id;
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

	const z = Math.max(0, ...windows.map((w) => w.z)) + 1;
	const ranks = new Map(family.map((w, i) => [w.id, z + i]));
	return windows.map((w) => ranks.has(w.id) ? { ...w, minimized: false, z: ranks.get(w.id)! } : w);
}

export function minimizeWindowTree(windows: DesktopWindow[], id: string): DesktopWindow[] {
	const target = windows.find((w) => w.id === id);
	const rootId = target?.parentId ?? id;
	return windows.map((w) => w.id === rootId || w.parentId === rootId ? { ...w, minimized: true } : w);
}
