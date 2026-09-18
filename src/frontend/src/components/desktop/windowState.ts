import { layoutDesktop, makeBioWindow, makeExperienceWindow, makeExplorerWindow, makeWordWindow, type DesktopWindow } from "./windows";

export type AppId = "me" | "terminal" | "github" | "bio" | "explorer" | "experience" | "cd-player" | "word";

export function isDecoration(w: DesktopWindow) {
	return w.kind === "error" || w.id === "new";
}

/** Start and desktop launchers share one create-or-activate path. */
export function openApp(windows: DesktopWindow[], id: AppId, vw: number, vh: number): DesktopWindow[] {
	let next = windows;
	if (!windows.some((w) => w.id === id)) {
		const z = Math.max(0, ...windows.map((w) => w.z)) + 1;
		const created = id === "bio" ? [makeBioWindow(z, vw, vh)]
			: id === "word" ? [makeWordWindow(z, vw, vh)]
			: id === "experience" ? [makeExperienceWindow(z, vw, vh)]
			: id === "explorer" ? [makeExplorerWindow(z, windows.find((w) => w.id === "me"), vw, vh)]
			: layoutDesktop(vw, vh).filter((w) => w.id === id || w.parentId === id);
		next = [...windows, ...created];
	}
	return activateWindow(next, id).map((w) => w.id === id || w.parentId === id ? { ...w, launched: true } : w);
}

export function restoreDecorations(windows: DesktopWindow[]): DesktopWindow[] {
	let z = Math.max(0, ...windows.map((w) => w.z)) + 1;
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

	const z = Math.max(0, ...windows.map((w) => w.z)) + 1;
	const ranks = new Map(family.map((w, i) => [w.id, z + i]));
	return windows.map((w) => ranks.has(w.id) ? { ...w, minimized: false, z: ranks.get(w.id)! } : w);
}

export function minimizeWindowTree(windows: DesktopWindow[], id: string): DesktopWindow[] {
	const target = windows.find((w) => w.id === id);
	const rootId = target?.parentId ?? id;
	return windows.map((w) => w.id === rootId || w.parentId === rootId ? { ...w, minimized: true } : w);
}
