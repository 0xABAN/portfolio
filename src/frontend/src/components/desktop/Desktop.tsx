"use client";

import { useLayoutEffect, useState } from "react";
import { Paint } from "./paint/Paint";
import { SystemMessage } from "./SystemMessage";
import { Taskbar } from "./Taskbar";
import { Window } from "./window/Window";
import {
	altCropStyle,
	clampToParent,
	clampWindowPos,
	layoutDesktop,
	type DesktopWindow,
} from "./windows";
import "./desktop.css";

const DECOS = [
	{ className: "desktop__deco desktop__branch", src: "/photos/branch.png" },
	{ className: "desktop__deco desktop__thorn", src: "/photos/thorn.png" },
] as const;

function windowBody(
	w: DesktopWindow,
	all: DesktopWindow[],
	onClose: (id: string) => void,
) {
	if (w.kind === "error") {
		return <SystemMessage onOk={() => onClose(w.id)} />;
	}

	if (w.kind === "paint" && w.src) {
		return <Paint src={w.src} />;
	}

	if (w.src) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img className="win-fill" src={w.src} alt="" draggable={false} />
		);
	}

	if (w.id === "alt") {
		const parent = all.find((p) => p.id === w.parentId);
		if (!parent) return null;
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				className="win-fill-crop"
				src="/photos/overlay.png"
				alt=""
				draggable={false}
				style={altCropStyle(w, parent)}
			/>
		);
	}

	return null;
}

export function Desktop() {
	const [windows, setWindows] = useState<DesktopWindow[]>(() =>
		layoutDesktop(1440, 900),
	);

	useLayoutEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- measure window
		setWindows(layoutDesktop(window.innerWidth, window.innerHeight));
	}, []);

	function closeWindow(id: string) {
		setWindows((prev) => prev.filter((w) => w.id !== id && w.parentId !== id));
	}

	function moveWindow(id: string, x: number, y: number) {
		setWindows((prev) => {
			const target = prev.find((w) => w.id === id);
			if (!target) return prev;

			if (target.parentId) {
				const parent = prev.find((w) => w.id === target.parentId);
				if (!parent) return prev;
				const next = clampToParent({ x, y, w: target.w, h: target.h }, parent);
				if (next.x === target.x && next.y === target.y) return prev;
				return prev.map((w) =>
					w.id === id ? { ...w, x: next.x, y: next.y } : w,
				);
			}

			const next = clampWindowPos(x, y, target.w);
			const dx = next.x - target.x;
			const dy = next.y - target.y;
			if (dx === 0 && dy === 0) return prev;

			return prev.map((w) => {
				if (w.id === id) return { ...w, x: next.x, y: next.y };
				if (w.parentId === id) {
					const moved = clampToParent(
						{ x: w.x + dx, y: w.y + dy, w: w.w, h: w.h },
						{ ...target, x: next.x, y: next.y },
					);
					return { ...w, x: moved.x, y: moved.y };
				}
				return w;
			});
		});
	}

	return (
		<div className="desktop">
			{DECOS.map((d) => (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					key={d.src}
					className={d.className}
					src={d.src}
					alt=""
					draggable={false}
				/>
			))}
			{windows.map((w) => (
				<Window
					key={w.id}
					title={w.title}
					icon={w.icon}
					x={w.x}
					y={w.y}
					w={w.w}
					h={w.h}
					z={w.z}
					onClose={() => closeWindow(w.id)}
					onMove={(nx, ny) => moveWindow(w.id, nx, ny)}
				>
					{windowBody(w, windows, closeWindow)}
				</Window>
			))}
			<Taskbar />
		</div>
	);
}
