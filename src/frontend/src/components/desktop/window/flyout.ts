"use client";

import { useEffect, useLayoutEffect, type Dispatch, type SetStateAction } from "react";
import type { DesktopWindow } from "./layout";
import { minimizeWindowTree } from "./state";

/** How far the mouse may stray from a flyout and its task button before the flyout hides, in px. */
const HIDE_DISTANCE = 120;

/** Distance from a point to a rectangle; 0 inside it. */
function distanceTo(rect: DOMRect, x: number, y: number) {
	return Math.hypot(Math.max(rect.left - x, 0, x - rect.right), Math.max(rect.top - y, 0, y - rect.bottom));
}

/**
 * Makes a window a taskbar flyout, like the CD Player. While shown, it sits
 * directly above its task button, and it hides once the mouse strays more
 * than HIDE_DISTANCE from both. Hiding waits until the mouse has come near
 * since the flyout opened, so one launched from across the screen does not
 * vanish on the first move. `taskOrder` changes whenever the task buttons do,
 * so the flyout follows its own.
 */
export function useTaskFlyout(id: string, shown: boolean, taskOrder: string, setWindows: Dispatch<SetStateAction<DesktopWindow[]>>) {
	// Placed before paint, so the flyout never shows where it last was.
	useLayoutEffect(() => {
		if (!shown) return;
		const place = () => {
			const task = document.querySelector(`[data-task-id="${id}"]`);
			const layer = document.querySelector(".desktop__windows");
			if (!task || !layer) return;
			task.scrollIntoView({ block: "nearest", inline: "nearest" });
			const anchor = task.getBoundingClientRect();
			const origin = layer.getBoundingClientRect();
			setWindows((current) => {
				const flyout = current.find((w) => w.id === id);
				if (!flyout) return current;
				const x = Math.max(4, Math.min(anchor.left, window.innerWidth - flyout.w - 4)) - origin.left;
				const y = Math.max(0, anchor.top - flyout.h - 4) - origin.top;
				return x === flyout.x && y === flyout.y ? current : current.map((w) => (w === flyout ? { ...w, x, y } : w));
			});
		};
		place();
		window.addEventListener("resize", place);
		return () => window.removeEventListener("resize", place);
	}, [id, shown, taskOrder, setWindows]);

	useEffect(() => {
		if (!shown) return;
		let armed = false;
		const onPointerMove = (event: PointerEvent) => {
			// Only a free-moving mouse counts: not touch, and not a drag such as moving the volume slider.
			if (event.pointerType !== "mouse" || event.buttons) return;
			const flyout = document.getElementById(`desktop-window-${id}`);
			const task = document.querySelector(`[data-task-id="${id}"]`);
			if (!flyout || !task) return;
			const { clientX: x, clientY: y } = event;
			const distance = Math.min(distanceTo(flyout.getBoundingClientRect(), x, y), distanceTo(task.getBoundingClientRect(), x, y));
			if (distance <= HIDE_DISTANCE) armed = true;
			else if (armed) setWindows((current) => minimizeWindowTree(current, id));
		};
		window.addEventListener("pointermove", onPointerMove, { passive: true });
		return () => window.removeEventListener("pointermove", onPointerMove);
	}, [id, shown, setWindows]);
}
