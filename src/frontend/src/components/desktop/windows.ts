export type DesktopWindow = {
	id: string;
	title: string;
	x: number;
	y: number;
};

export const WIN_W = 420;
export const WIN_H = 280;
export const TASKBAR_H = 36;
export const TITLE_H = 22;

export const initialWindows: DesktopWindow[] = [
	{ id: "new-age", title: "new age", x: 80, y: 64 },
];

export function clampWindowPos(x: number, y: number): { x: number; y: number } {
	if (typeof window === "undefined") return { x, y };
	const minX = 48 - WIN_W;
	const maxX = window.innerWidth - 48;
	const maxY = window.innerHeight - TASKBAR_H - TITLE_H;
	return {
		x: Math.min(maxX, Math.max(minX, x)),
		y: Math.min(maxY, Math.max(0, y)),
	};
}
