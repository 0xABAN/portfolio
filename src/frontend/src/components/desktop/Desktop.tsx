"use client";

import { useState } from "react";
import { GitHubGraph } from "./GitHubGraph";
import { Neko } from "./Neko";
import { Notepad } from "./Notepad";
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

const DESK_ICONS = [
	{
		id: "hollow-knight",
		label: "Hollow Knight",
		src: "/icons/games/hollow-knight.png",
	},
	{ id: "silksong", label: "Silksong", src: "/icons/games/silksong.png" },
	{ id: "terraria", label: "Terraria", src: "/icons/games/terraria.png" },
	{ id: "roblox", label: "Roblox", src: "/icons/games/roblox.png" },
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

	if (w.kind === "github") {
		return <GitHubGraph />;
	}

	if (w.kind === "notepad") {
		return <Notepad segments={w.segments} src={w.src} />;
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
	// page.tsx loads this with ssr:false, so window is available on first paint
	const [windows, setWindows] = useState<DesktopWindow[]>(() =>
		layoutDesktop(window.innerWidth, window.innerHeight),
	);

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
			<ul className="desktop__icons" aria-label="Desktop">
				{DESK_ICONS.map((icon) => (
					<li key={icon.id}>
						<button type="button" className="desk-icon" title={icon.label}>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								className="desk-icon__img"
								src={icon.src}
								alt=""
								width={64}
								height={64}
								draggable={false}
							/>
							<span className="desk-icon__label">{icon.label}</span>
						</button>
					</li>
				))}
			</ul>
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
					onCloseAction={() => closeWindow(w.id)}
					onMoveAction={(nx, ny) => moveWindow(w.id, nx, ny)}
				>
					{windowBody(w, windows, closeWindow)}
				</Window>
			))}
			<Taskbar />
			<Neko />
		</div>
	);
}
