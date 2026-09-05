"use client";

import { useEffect, useRef, useState } from "react";
import { BOOT_MS, BOOT_WINDOWS } from "../boot/bootReveal";
import { useBootReveal } from "../boot/useBootReveal";
import { Bio } from "./Bio";
import { FractureBackground } from "./FractureBackground";
import { Explorer } from "./explorer/Explorer";
import type { ExplorerFile } from "./explorer/explorerData";
import { GitHubGraph } from "./GitHubGraph";
import { Neko } from "./Neko";
import { Paint } from "./paint/Paint";
import { Experience } from "./experience/Experience";
import { SystemMessage } from "./SystemMessage";
import { Taskbar } from "./Taskbar";
import { Terminal } from "./Terminal";
import { Window } from "./window/Window";
import {
	altCropStyle,
	clampToParent,
	nestBounds,
	clampWindowPos,
	layoutDesktop,
	reflowDesktop,
	makeBioWindow,
	makeExplorerWindow,
	makeExperienceWindow,
	EXPERIENCE_WINDOW_ID,
	type DesktopWindow,
} from "./windows";
import "./desktop.css";

type DeskIcon = {
	id: string;
	label: string;
	src: string;
	col: number;
	row: number;
	href?: string;
	open?: "explorer";
};

function game(
	id: string,
	label: string,
	col: number,
	row: number,
	href: string,
): DeskIcon {
	return { id, label, src: `/icons/games/${id}.png`, col, row, href };
}

const DESK_ICONS: DeskIcon[] = [
	// col 1 (4 games + bin) · col 2 (personas + secrets)
	game("hollow-knight", "Hollow Knight", 1, 1, "https://store.steampowered.com/app/367520/Hollow_Knight/"),
	game("silksong", "Silksong", 1, 2, "https://store.steampowered.com/app/1030300/Hollow_Knight_Silksong/"),
	game("terraria", "Terraria", 1, 3, "https://store.steampowered.com/app/105600/Terraria/"),
	game("roblox", "Roblox", 1, 4, "https://www.roblox.com/"),
	game("persona-3-reload", "Persona 3 Reload", 2, 1, "https://store.steampowered.com/app/2161700/Persona_3_Reload/"),
	game("persona-5-royal", "Persona 5 Royal", 2, 2, "https://store.steampowered.com/app/1687950/Persona_5_Royal/"),
	{ id: "secrets", label: "secrets", src: "/icons/folder.png", col: 2, row: 3, open: "explorer" },
];

const RECYCLE_BIN = {
	id: "recycle-bin",
	label: "Recycle Bin",
	col: 1,
	row: 5,
} as const;

/** Soft bounce after boot to pull the eye. */
const ATTENTION_IDS = new Set(["secrets"]);
const ATTENTION_DELAY_MS = 1000;

function DeskIconGlyph({ src, label, notification = false }: { src: string; label: string; notification?: boolean }) {
	return (
		<>
			<span className="desk-icon__art">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					className="desk-icon__img"
					src={src}
					alt=""
					width={64}
					height={64}
					draggable={false}
				/>
				{notification && <span className="desk-icon__badge" aria-hidden="true">!</span>}
			</span>
			<span className="desk-icon__label">{label}</span>
		</>
	);
}

function windowBody(
	w: DesktopWindow,
	all: DesktopWindow[],
	onMinimize: (id: string) => void,
	onOpenExplorerFile: (file: ExplorerFile) => void,
) {
	switch (w.kind) {
		case "error":
			return <SystemMessage onOkAction={() => onMinimize(w.id)} />;
		case "paint":
			return w.src ? <Paint src={w.src} /> : null;
		case "github":
			return <GitHubGraph />;
		case "experience":
			return <Experience />;
		case "terminal":
			return <Terminal />;
		case "bio":
			return <Bio />;
		case "explorer":
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

function restoreTree(
	prev: DesktopWindow[],
	id: string,
	z: number,
): DesktopWindow[] {
	return prev.map((w) => {
		if (w.id === id) return { ...w, minimized: false, z };
		if (w.parentId === id) return { ...w, minimized: false };
		return w;
	});
}

export function Desktop() {
	// Boot mounts this client-only, so window is available on first paint
	const [windows, setWindows] = useState<DesktopWindow[]>(() =>
		layoutDesktop(window.innerWidth, window.innerHeight),
	);
	const layoutRef = useRef(windows);
	const [busy, setBusy] = useState(false);
	/** Taskbar tab order — first minimized is leftmost (after CD Player). */
	const [minOrder, setMinOrder] = useState<string[]>([]);
	const [trashed, setTrashed] = useState<ReadonlySet<string>>(() => new Set());
	const [binFull, setBinFull] = useState(false);
	const [binHot, setBinHot] = useState(false);
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const [attention, setAttention] = useState(false);
	const [attentionDone, setAttentionDone] = useState<ReadonlySet<string>>(
		() => new Set(),
	);
	const skipClick = useRef(false);
	const revealed = useBootReveal();

	useEffect(() => {
		const resize = () => {
			const { innerWidth: width, innerHeight: height } = window;
			const previous = layoutRef.current;
			const next = layoutDesktop(width, height);
			layoutRef.current = next;
			setWindows((current) => reflowDesktop(current, previous, next, width, height));
		};
		window.addEventListener("resize", resize);
		return () => window.removeEventListener("resize", resize);
	}, []);

	useEffect(() => {
		const startAt = BOOT_MS + ATTENTION_DELAY_MS;
		const start = window.setTimeout(() => setAttention(true), startAt);
		return () => window.clearTimeout(start);
	}, []);

	function dismissAttention(id: string) {
		if (!ATTENTION_IDS.has(id)) return;
		setAttentionDone((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
	}

	function hasNotification(id: string) {
		return ATTENTION_IDS.has(id) && !attentionDone.has(id);
	}

	function shouldBounce(id: string) {
		if (!attention || !hasNotification(id)) return false;
		// already open → no bounce
		if (id === "secrets" && windows.some((w) => w.id === "explorer")) return false;
		return true;
	}

	function trashIcon(id: string) {
		if (!id || id === RECYCLE_BIN.id) return;
		setBinFull(true);
		setTrashed((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
	}

	function trashWindow(id: string) {
		setBinFull(true);
		setBinHot(false);
		clearMinOrder(id);
		setWindows((prev) => prev.filter((w) => w.id !== id && w.parentId !== id));
	}

	function openDeskIcon(icon: DeskIcon) {
		if (skipClick.current) {
			skipClick.current = false;
			return;
		}
		dismissAttention(icon.id);
		if (icon.open === "explorer") openExplorer();
		else if (icon.href) window.open(icon.href, "_blank", "noopener,noreferrer");
	}

	function isBootVisible(id: string) {
		return !BOOT_WINDOWS.has(id) || revealed.has(id);
	}

	function nextZ(prev: DesktopWindow[]) {
		return prev.reduce((z, w) => Math.max(z, w.z), 0) + 1;
	}

	function clearMinOrder(id: string) {
		setMinOrder((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : prev,
		);
	}

	function minimizeWindow(id: string) {
		setWindows((prev) =>
			prev.map((w) =>
				w.id === id || w.parentId === id ? { ...w, minimized: true } : w,
			),
		);
		setMinOrder((prev) => (prev.includes(id) ? prev : [...prev, id]));
	}

	function restoreWindow(id: string) {
		setWindows((prev) => restoreTree(prev, id, nextZ(prev)));
		clearMinOrder(id);
	}

	function openOrRaise(id: string, make: (z: number) => DesktopWindow) {
		setWindows((prev) => {
			const existing = prev.find((w) => w.id === id);
			if (!existing) return [...prev, make(nextZ(prev))];
			if (existing.minimized) {
				clearMinOrder(id);
				return restoreTree(prev, id, nextZ(prev));
			}
			return prev.map((w) => (w.id === id ? { ...w, z: nextZ(prev) } : w));
		});
	}

	function withBusy(run: () => void) {
		if (busy) return;
		setBusy(true);
		// ponytail: fixed fake load delay — tune if it feels too snappy/slow
		window.setTimeout(() => {
			run();
			setBusy(false);
		}, 1500);
	}

	function openBio() {
		withBusy(() => openOrRaise("bio", makeBioWindow));
	}

	function openExplorer() {
		openOrRaise("explorer", makeExplorerWindow);
	}

	function openExperience() {
		withBusy(() => {
			setWindows((prev) => {
				const rest = prev.filter((w) => w.id !== EXPERIENCE_WINDOW_ID);
				return [...rest, makeExperienceWindow(nextZ(rest))];
			});
		});
	}

	function openExplorerFile(file: ExplorerFile) {
		if (file.action === "bio") openBio();
		else if (file.action === "experience") openExperience();
		else window.open(file.href, "_blank", "noopener,noreferrer");
	}

	function moveWindow(id: string, x: number, y: number) {
		setWindows((prev) => {
			const target = prev.find((w) => w.id === id);
			if (!target) return prev;

			if (target.parentId) {
				const parent = prev.find((w) => w.id === target.parentId);
				if (!parent) return prev;
				const next = clampToParent(
					{ x, y, w: target.w, h: target.h },
					nestBounds(parent),
				);
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
						nestBounds({ ...target, x: next.x, y: next.y }),
					);
					return { ...w, x: moved.x, y: moved.y };
				}
				return w;
			});
		});
	}

	return (
		<div className={busy ? "desktop desktop--busy" : "desktop"}>
			<FractureBackground />
			<ul className="desktop__icons" aria-label="Desktop">
				{DESK_ICONS.filter(
					(icon) => revealed.has(icon.id) && !trashed.has(icon.id),
				).map((icon) => (
					<li
						key={icon.id}
						style={{ gridColumn: icon.col, gridRow: icon.row }}
					>
						<button
							type="button"
							className={
								[
									"desk-icon",
									shouldBounce(icon.id) ? "desk-icon--bounce" : "",
									draggingId === icon.id ? "desk-icon--dragging" : "",
								]
									.filter(Boolean)
									.join(" ")
							}
							title={icon.label}
							aria-label={hasNotification(icon.id) ? `${icon.label}, unopened folder` : undefined}
							draggable
							onDragStart={(e) => {
								skipClick.current = true;
								e.dataTransfer.setData("text/plain", icon.id);
								e.dataTransfer.effectAllowed = "move";
								setDraggingId(icon.id);
							}}
							onDragEnd={() => {
								setDraggingId(null);
								setBinHot(false);
							}}
							onClick={() => openDeskIcon(icon)}
						>
							<DeskIconGlyph src={icon.src} label={icon.label} notification={hasNotification(icon.id)} />
						</button>
					</li>
				))}
				{revealed.has(RECYCLE_BIN.id) ? (
					<li style={{ gridColumn: RECYCLE_BIN.col, gridRow: RECYCLE_BIN.row }}>
						<button
							type="button"
							data-recycle-bin=""
							className={binHot ? "desk-icon desk-icon--drop-hot" : "desk-icon"}
							title={RECYCLE_BIN.label}
							onDragOver={(e) => {
								e.preventDefault();
								e.dataTransfer.dropEffect = "move";
								setBinHot(true);
							}}
							onDragLeave={() => setBinHot(false)}
							onDrop={(e) => {
								e.preventDefault();
								setBinHot(false);
								setDraggingId(null);
								trashIcon(e.dataTransfer.getData("text/plain"));
							}}
						>
							<DeskIconGlyph
								src={
									binFull
										? "/icons/recycle-bin-full.png"
										: "/icons/recycle-bin-empty.png"
								}
								label={RECYCLE_BIN.label}
							/>
						</button>
					</li>
				) : null}
			</ul>
			{windows
				.filter((w) => !w.minimized && isBootVisible(w.id))
				.map((w) => (
					<Window
						key={w.id}
						title={w.title}
						icon={w.icon}
						x={w.x}
						y={w.y}
						w={w.w}
						h={w.h}
						z={w.z}
						variant={w.kind === "github" ? "genesis" : undefined}
						// Nested crop + parent-of-nested need live React geometry while dragging
						liveMove={Boolean(
							w.parentId || windows.some((c) => c.parentId === w.id),
						)}
						minimizable={w.id !== "alt"}
						onMinimizeAction={() => minimizeWindow(w.id)}
						onMoveAction={(nx, ny) => moveWindow(w.id, nx, ny)}
						onTrashHoverAction={setBinHot}
						onTrashAction={() => trashWindow(w.id)}
					>
						{windowBody(w, windows, minimizeWindow, openExplorerFile)}
					</Window>
				))}
			<Taskbar
				minimized={minOrder.flatMap((id) => {
					const w = windows.find((x) => x.id === id);
					return w && w.minimized && !w.parentId && isBootVisible(w.id)
						? [w]
						: [];
				})}
				onRestoreAction={restoreWindow}
				revealed={revealed}
			/>
			{revealed.has("neko") ? <Neko /> : null}
		</div>
	);
}
