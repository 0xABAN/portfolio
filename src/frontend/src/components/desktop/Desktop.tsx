"use client";

import { useState } from "react";
import { Bio } from "./Bio";
import { Explorer } from "./explorer/Explorer";
import type { ExplorerFile } from "./explorer/explorerData";
import { GitHubGraph } from "./GitHubGraph";
import { Neko } from "./Neko";
import { Notepad } from "./Notepad";
import { Paint } from "./paint/Paint";
import { SystemMessage } from "./SystemMessage";
import { Taskbar } from "./Taskbar";
import { Terminal } from "./Terminal";
import { Window } from "./window/Window";
import {
	altCropStyle,
	clampToParent,
	paintImageBounds,
	clampWindowPos,
	layoutDesktop,
	makeBioWindow,
	makeExplorerWindow,
	type DesktopWindow,
} from "./windows";
import "./desktop.css";

const DECOS = [
	{
		id: "branch",
		className: "desktop__deco desktop__branch",
		src: "/photos/branch.png",
	},
	{
		id: "thorn-tl",
		className: "desktop__deco desktop__thorn",
		src: "/photos/thorn.png",
	},
	{
		id: "thorn-br",
		className: "desktop__deco desktop__thorn-br",
		src: "/photos/thorn.png",
	},
] as const;

const DESK_ICONS = [
	// col 1 (4) · col 2 (2 personas beside HK / Silksong)
	{
		id: "hollow-knight",
		label: "Hollow Knight",
		src: "/icons/games/hollow-knight.png",
		cell: "desk-icon-cell--c1r1",
		href: "https://store.steampowered.com/app/367520/Hollow_Knight/",
	},
	{
		id: "silksong",
		label: "Silksong",
		src: "/icons/games/silksong.png",
		cell: "desk-icon-cell--c1r2",
		href: "https://store.steampowered.com/app/1030300/Hollow_Knight_Silksong/",
	},
	{
		id: "terraria",
		label: "Terraria",
		src: "/icons/games/terraria.png",
		cell: "desk-icon-cell--c1r3",
		href: "https://store.steampowered.com/app/105600/Terraria/",
	},
	{
		id: "roblox",
		label: "Roblox",
		src: "/icons/games/roblox.png",
		cell: "desk-icon-cell--c1r4",
		href: "https://www.roblox.com/",
	},
	{
		id: "persona-3-reload",
		label: "Persona 3 Reload",
		src: "/icons/games/persona-3-reload.png",
		cell: "desk-icon-cell--c2r1",
		href: "https://store.steampowered.com/app/2161700/Persona_3_Reload/",
	},
	{
		id: "persona-5-royal",
		label: "Persona 5 Royal",
		src: "/icons/games/persona-5-royal.png",
		cell: "desk-icon-cell--c2r2",
		href: "https://store.steampowered.com/app/1687950/Persona_5_Royal/",
	},
	{
		id: "homework",
		label: "homework",
		src: "/icons/folder.png",
		cell: "desk-icon-cell--c2r3",
	},
	{
		id: "sunglasses",
		label: "😎",
		src: "/icons/folder-sunglasses.png",
		cell: "desk-icon-cell--c3r1",
		open: "explorer" as const,
	},
] as const;

function windowBody(
	w: DesktopWindow,
	all: DesktopWindow[],
	onClose: (id: string) => void,
	onOpenExplorerFile: (file: ExplorerFile) => void,
) {
	if (w.kind === "error") {
		return <SystemMessage onOkAction={() => onClose(w.id)} />;
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

	if (w.kind === "terminal") {
		return <Terminal />;
	}

	if (w.kind === "bio") {
		return <Bio />;
	}

	if (w.kind === "explorer") {
		return <Explorer onOpenFileAction={onOpenExplorerFile} />;
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

	function nextZ(prev: DesktopWindow[]) {
		return prev.reduce((z, w) => Math.max(z, w.z), 0) + 1;
	}

	function openOrRaise(id: string, make: (z: number) => DesktopWindow) {
		setWindows((prev) => {
			const z = nextZ(prev);
			if (prev.some((w) => w.id === id)) {
				return prev.map((w) => (w.id === id ? make(z) : w));
			}
			return [...prev, make(z)];
		});
	}

	function openBio() {
		openOrRaise("bio", makeBioWindow);
	}

	function openExplorer() {
		openOrRaise("explorer", makeExplorerWindow);
	}

	function openExplorerFile(file: ExplorerFile) {
		if (file.action === "bio") openBio();
		else window.open(file.href, "_blank", "noopener,noreferrer");
	}

	function moveWindow(id: string, x: number, y: number) {
		setWindows((prev) => {
			const target = prev.find((w) => w.id === id);
			if (!target) return prev;

			if (target.parentId) {
				const parent = prev.find((w) => w.id === target.parentId);
				if (!parent) return prev;
				// Nested alt stays over the Paint image, not the whole window chrome
				const bounds =
					parent.kind === "paint" ? paintImageBounds(parent) : parent;
				const next = clampToParent({ x, y, w: target.w, h: target.h }, bounds);
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
					const movedParent = { ...target, x: next.x, y: next.y };
					const bounds =
						target.kind === "paint"
							? paintImageBounds(movedParent)
							: movedParent;
					const moved = clampToParent(
						{ x: w.x + dx, y: w.y + dy, w: w.w, h: w.h },
						bounds,
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
					key={d.id}
					className={d.className}
					src={d.src}
					alt=""
					draggable={false}
				/>
			))}
			<ul className="desktop__icons" aria-label="Desktop">
				{DESK_ICONS.map((icon) => (
					<li key={icon.id} className={icon.cell}>
						<button
							type="button"
							className="desk-icon"
							title={icon.label}
							onClick={() => {
								if ("open" in icon && icon.open === "explorer") openExplorer();
								else if ("href" in icon && icon.href) {
									window.open(icon.href, "_blank", "noopener,noreferrer");
								}
							}}
						>
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
					// Nested crop + parent-of-nested need live React geometry while dragging
					liveMove={Boolean(
						w.parentId || windows.some((c) => c.parentId === w.id),
					)}
					onCloseAction={() => closeWindow(w.id)}
					onMoveAction={(nx, ny) => moveWindow(w.id, nx, ny)}
				>
					{windowBody(w, windows, closeWindow, openExplorerFile)}
				</Window>
			))}
			<Taskbar />
			<Neko />
		</div>
	);
}
