"use client";

import { useState } from "react";
import { Taskbar } from "./Taskbar";
import { Window } from "./window/Window";
import { clampWindowPos, initialWindows, type DesktopWindow } from "./windows";
import "./desktop.css";

export function Desktop() {
	const [windows, setWindows] = useState<DesktopWindow[]>(initialWindows);

	function closeWindow(id: string) {
		setWindows((prev) => prev.filter((w) => w.id !== id));
	}

	function moveWindow(id: string, x: number, y: number) {
		const next = clampWindowPos(x, y);
		setWindows((prev) =>
			prev.map((w) => (w.id === id ? { ...w, x: next.x, y: next.y } : w)),
		);
	}

	return (
		<div className="desktop">
			{windows.map((w) => (
				<Window
					key={w.id}
					title={w.title}
					x={w.x}
					y={w.y}
					onClose={() => closeWindow(w.id)}
					onMove={(x, y) => moveWindow(w.id, x, y)}
				/>
			))}
			<Taskbar
				tasks={windows.map((w) => ({
					id: w.id,
					label: w.title,
					active: true,
				}))}
			/>
		</div>
	);
}
