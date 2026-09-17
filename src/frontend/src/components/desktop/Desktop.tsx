"use client";

import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { BOOT_MS, BOOT_WINDOWS } from "../boot/bootReveal";
import { useBootReveal } from "../boot/useBootReveal";
import { Bio } from "./Bio";
import { CdPlayer } from "./CdPlayer";
import { useCdPlayerAudio } from "./useCdPlayerAudio";
import { DesktopSparks } from "./DesktopSparks";
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
import { activateWindow, activeWindowId, isDecoration, minimizeWindowTree, openApp, restoreDecorations, taskWindows, type AppId } from "./windowState";
import {
	GITHUB_URL,
	TASKBAR_H,
	altCropStyle,
	clampToParent,
	nestBounds,
	clampWindowPos,
	layoutDesktop,
	reflowDesktop,
	type DesktopWindow,
} from "./windows";
import "./desktop.css";

type DeskIcon = {
	id: string;
	label: string;
	src: string;
	href?: string;
	open?: AppId;
};

function game(
	id: string,
	label: string,
	href: string,
): DeskIcon {
	return { id, label, src: `/icons/games/${id}.png`, href };
}

const DESK_ICONS: DeskIcon[] = [
	// Apps precede folders; Recycle Bin is rendered last.
	game("hollow-knight", "Hollow Knight", "https://store.steampowered.com/app/367520/Hollow_Knight/"),
	game("silksong", "Silksong", "https://store.steampowered.com/app/1030300/Hollow_Knight_Silksong/"),
	game("terraria", "Terraria", "https://store.steampowered.com/app/105600/Terraria/"),
	game("roblox", "Roblox", "https://www.roblox.com/"),
	game("persona-3-reload", "Persona 3 Reload", "https://store.steampowered.com/app/2161700/Persona_3_Reload/"),
	game("persona-5-royal", "Persona 5 Royal", "https://store.steampowered.com/app/1687950/Persona_5_Royal/"),
	game("undertale", "Undertale", "https://store.steampowered.com/app/391540/Undertale/"),
	{ id: "social-github", label: "GitHub", src: "/icons/social/github.svg", href: GITHUB_URL },
	{ id: "social-linkedin", label: "LinkedIn", src: "/icons/social/linkedin.svg", href: "https://www.linkedin.com/in/adam-torres-encarnacion/" },
	{ id: "social-twitter", label: "Twitter", src: "/icons/social/twitter.svg", href: "https://x.com/0xABANN" },
	{ id: "cd-player-icon", label: "CD Player", src: "/icons/cd.png", open: "cd-player" },
	{ id: "secrets", label: "secrets", src: "/icons/folder.png", open: "explorer" },
];

const RECYCLE_BIN = {
	id: "recycle-bin",
	label: "Recycle Bin",
} as const;

/** Soft bounce after boot to pull the eye. */
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

/** Content does not depend on window position, except for the magnifier crop. */
const WindowContent = memo(function WindowContent({ id, kind, src, active, cropStyle, audio, onMinimize, onOpenExplorerFile }: {
	id: string;
	kind: DesktopWindow["kind"];
	src?: string;
	active: boolean;
	cropStyle?: CSSProperties;
	audio?: ReturnType<typeof useCdPlayerAudio>;
	onMinimize: (id: string) => void;
	onOpenExplorerFile: (file: ExplorerFile) => void;
}) {
	switch (kind) {
		case "cd-player":
			return audio ? <CdPlayer {...audio} /> : null;
		case "error":
			return <SystemMessage onOkAction={() => onMinimize(id)} />;
		case "paint":
			return src ? <Paint src={src} active={active} /> : null;
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

	if (src) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img className="win-fill" src={src} alt="" draggable={false} />
		);
	}

	if (cropStyle) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				className="win-fill-crop"
				src="/photos/overlay.png"
				alt=""
				draggable={false}
				style={cropStyle}
			/>
		);
	}

	return null;
});

export function Desktop() {
	// Boot mounts this client-only, so window is available on first paint
	const [windows, setWindows] = useState<DesktopWindow[]>(() =>
		layoutDesktop(window.innerWidth, window.innerHeight),
	);
	const layoutRef = useRef(windows);
	const [busy, setBusy] = useState(false);
	const launchTimer = useRef<number | null>(null);
	const [trashed, setTrashed] = useState<ReadonlySet<string>>(() => new Set());
	const [binFull, setBinFull] = useState(false);
	const [binHot, setBinHot] = useState(false);
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const [attention, setAttention] = useState(false);
	const [secretsOpened, setSecretsOpened] = useState(false);
	const skipClick = useRef(false);
	const cdDragged = useRef(false);
	const revealed = useBootReveal();
	const cdWindow = windows.find((w) => w.id === "cd-player");
	const audio = useCdPlayerAudio(revealed.has("fracture"), Boolean(cdWindow));

	useEffect(() => () => {
		if (launchTimer.current !== null) window.clearTimeout(launchTimer.current);
		launchTimer.current = null;
	}, []);

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

	useEffect(() => {
		const desktop = document.querySelector(".desktop");

		function onTyping(event: KeyboardEvent) {
			if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
			if (event.key.length !== 1 && event.key !== "Dead") return;

			const target = event.target;
			if (!(target instanceof HTMLElement) || (!desktop?.contains(target) && target !== document.body)) return;
			const input = desktop?.querySelector<HTMLInputElement>(".term__input");
			// Keep startup and deliberately removed Terminal windows unchanged.
			if (!input) return;
			const ownsInput = target.isContentEditable || target.closest(
				'input, textarea, select, [role="textbox"], [role="combobox"], [role="slider"], [role="spinbutton"]',
			);
			if (target !== input && ownsInput) return;
			if (event.key === " " && target.closest('button, a[href], summary, [role="button"], [role="menuitem"]')) return;

			if (target === input) {
				setWindows((current) => activateWindow(current, "terminal"));
				return;
			}

			target.closest<HTMLElement>("[popover]")?.hidePopover();
			// Restore visibility before the browser inserts this first character.
			// Native insertion preserves selection, editing and React's onChange.
			flushSync(() => {
				setWindows((current) => activateWindow(current, "terminal"));
			});
			if (!input.readOnly) input.focus({ preventScroll: true });
		}

		window.addEventListener("keydown", onTyping);
		return () => window.removeEventListener("keydown", onTyping);
	}, []);

	function hasNotification(id: string) {
		return id === "secrets" && !secretsOpened;
	}

	const bounceSecrets = attention && !secretsOpened && !windows.some((w) => w.id === "explorer");

	function trashIcon(id: string) {
		if (!id || id === RECYCLE_BIN.id) return;
		setBinFull(true);
		setTrashed((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
	}

	const closeWindow = useCallback((id: string) => {
		if (id === "cd-player") {
			audio.quit();
			cdDragged.current = false;
			requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-app-id="cd-player"]')?.focus());
		}
		setWindows((prev) => prev.filter((w) => w.id !== id && w.parentId !== id));
	}, [audio]);

	const trashWindow = useCallback((id: string) => {
		setBinFull(true);
		setBinHot(false);
		closeWindow(id);
	}, [closeWindow]);

	function isBootVisible(w: DesktopWindow) {
		return w.launched || !BOOT_WINDOWS.has(w.id) || revealed.has(w.id);
	}

	const activate = useCallback((id: string) => {
		setWindows((prev) => activateWindow(prev, id));
	}, []);

	const minimizeWindow = useCallback((id: string) => {
		setWindows((prev) => minimizeWindowTree(prev, id));
	}, []);

	/** Measure after the task exists, including launches after a full quit. */
	const focusWindow = useCallback((id: string) => {
		requestAnimationFrame(() => {
			if (id === "cd-player" && !cdDragged.current) {
				const task = document.querySelector(`[data-task-id="${id}"]`);
				const layer = document.querySelector(".desktop__windows");
				if (task && layer) {
					task.scrollIntoView({ block: "nearest", inline: "nearest" });
					const anchor = task.getBoundingClientRect();
					const origin = layer.getBoundingClientRect();
					// Account for incidental desktop scrolling while keeping the app above its task.
					flushSync(() => setWindows((current) => current.map((w) => w.id === id ? {
						...w,
						x: Math.max(4, Math.min(anchor.left, window.innerWidth - w.w - 4)) - origin.left,
						y: Math.max(0, anchor.top - w.h - 4) - origin.top,
					} : w)));
				}
			}
			// Only explicit launches/restores may move keyboard focus.
			document.getElementById(`desktop-window-${id}`)?.focus({ preventScroll: true });
		});
	}, []);

	const restoreWindow = useCallback((id: string) => {
		setWindows((prev) => activateWindow(prev, id));
		focusWindow(id);
	}, [focusWindow]);

	/** All launchers share the wait; taskbar restores deliberately bypass it. */
	const launchApp = useCallback((id: AppId) => {
		if (launchTimer.current !== null) return;
		setBusy(true);
		// ponytail: fixed fake load delay — tune if it feels too snappy/slow
		launchTimer.current = window.setTimeout(() => {
			launchTimer.current = null;
			const { innerWidth, innerHeight } = window;
			if (id === "explorer") setSecretsOpened(true);
			setWindows((prev) => openApp(prev, id, innerWidth, innerHeight));
			setBusy(false);
			focusWindow(id);
		}, id === "explorer" ? 500 : 1500);
	}, [focusWindow]);

	const openExplorerFile = useCallback((file: ExplorerFile) => {
		if (file.action === "bio" || file.action === "experience") launchApp(file.action);
		else window.open(file.href, "_blank", "noopener,noreferrer");
	}, [launchApp]);

	const moveWindow = useCallback((id: string, x: number, y: number) => {
		if (id === "cd-player" && cdWindow && (cdWindow.x !== x || cdWindow.y !== y)) cdDragged.current = true;
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
	}, [cdWindow]);

	function openDeskIcon(icon: DeskIcon) {
		if (skipClick.current) {
			skipClick.current = false;
			return;
		}
		if (icon.open) launchApp(icon.open);
		else if (icon.href) window.open(icon.href, "_blank", "noopener,noreferrer");
	}

	const visibleWindows = windows.filter(isBootVisible);
	const activeId = activeWindowId(visibleWindows);

	return (
		<div className={busy ? "desktop desktop--busy" : "desktop"} style={{ "--taskbar-height": `${TASKBAR_H}px` } as CSSProperties}>
			<FractureBackground active={revealed.has("fracture")} />
			<ul className="desktop__icons" aria-label="Desktop">
				{DESK_ICONS.filter(
					(icon) => revealed.has(icon.id) && !trashed.has(icon.id),
				).map((icon) => (
					<li key={icon.id}>
						<button
							type="button"
							className={
								[
									"desk-icon",
									icon.href ? "desk-icon--app" : "",
									icon.id === "secrets" && bounceSecrets ? "desk-icon--bounce" : "",
									draggingId === icon.id ? "desk-icon--dragging" : "",
								]
									.filter(Boolean)
									.join(" ")
							}
							title={icon.label}
							data-app-id={icon.open}
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
					<li>
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
			<div className="desktop__windows">
				{visibleWindows.map((w) => {
					const parent = windows.find((p) => p.id === w.parentId);
					return <Window
						key={w.id}
						id={w.id}
						active={(w.parentId ?? w.id) === activeId}
						minimized={Boolean(w.minimized)}
						onActivateAction={activate}
						title={w.title}
						icon={w.icon}
						x={w.x}
						y={w.y}
						w={w.w}
						h={w.h}
						z={w.z}
						variant={w.kind === "terminal" ? "dos" : undefined}
						// Nested crop + parent-of-nested need live React geometry while dragging
						liveMove={Boolean(
							w.parentId || windows.some((c) => c.parentId === w.id),
						)}
						minimizable={w.id !== "alt"}
						onMinimizeAction={minimizeWindow}
						onCloseAction={w.kind === "cd-player" ? closeWindow : undefined}
						onMoveAction={moveWindow}
						onTrashHoverAction={setBinHot}
						onTrashAction={trashWindow}
					>
						<WindowContent id={w.id} kind={w.kind} src={w.src} active={w.id === activeId}
							audio={w.kind === "cd-player" ? audio : undefined}
							cropStyle={w.id === "alt" && parent ? altCropStyle(w, parent) : undefined}
							onMinimize={minimizeWindow} onOpenExplorerFile={openExplorerFile} />
					</Window>;
				})}
			</div>
			{revealed.has("fracture") ? <DesktopSparks /> : null}
			<Taskbar
				muted={audio.muted}
				onToggleMuteAction={audio.toggleMute}
				trackLabel={audio.trackLabel}
				bindElapsed={audio.bindElapsed}
				tasks={taskWindows(visibleWindows)}
				activeId={activeId}
				onActivateAction={restoreWindow}
				onLaunchAction={launchApp}
				onRestoreDecorationsAction={() => setWindows(restoreDecorations)}
				canRestoreDecorations={windows.some((w) => isDecoration(w) && w.minimized)}
				revealed={revealed}
			/>
			{revealed.has("neko") ? <Neko /> : null}
		</div>
	);
}
