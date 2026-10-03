"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { DESKTOP_REVEAL_WINDOWS } from "./desktopReveal";
import { useDesktopReveal } from "./useDesktopReveal";
import { useCdPlayerAudio } from "./useCdPlayerAudio";
import { DesktopSparks } from "./DesktopSparks";
import { FractureBackground } from "./FractureBackground";
import { BIN_ICON } from "./recycle-bin/shellCatalog";
import { itemOf } from "./recycle-bin/recycleBinState";
import { ShellProvider, useShell } from "./recycle-bin/ShellProvider";
import { ShellDialogs } from "./recycle-bin/ShellDialogs";
import { DesktopIcons } from "./files/DesktopIcons";
import { Neko } from "./Neko";
import { Taskbar } from "./Taskbar";
import { WindowContent } from "./apps/WindowContent";
import { Window } from "./window/Window";
import { activateWindow, activeWindowId, isDecoration, minimizeWindowTree, openApp, restoreDecorations, taskWindows, toggleMaximizeWindow, type AppId } from "./window/state";
import {
	TASKBAR_H,
	altCropStyle,
	clampToParent,
	nestBounds,
	clampWindowPos,
	layoutDesktop,
	reflowDesktop,
	type DesktopWindow,
} from "./window/layout";
import "./desktop.css";

export function Desktop() {
	return <ShellProvider><DesktopWorkspace /></ShellProvider>;
}

function DesktopWorkspace() {
	const shell = useShell();
	const { getSnapshot, notice } = shell;
	const [explorerFolder, setExplorerFolder] = useState("secrets");
	// Boot mounts this client-only, so window is available on first paint
	const [windows, setWindows] = useState<DesktopWindow[]>(() =>
		layoutDesktop(window.innerWidth, window.innerHeight),
	);
	const layoutRef = useRef(windows);
	const [busy, setBusy] = useState(false);
	const launchTimer = useRef<number | null>(null);
	const binFull = shell.state.entries.length > 0;
	const [secretsOpened, setSecretsOpened] = useState(false);
	const cdDragged = useRef(false);
	const revealed = useDesktopReveal();
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
			if (target !== input && (ownsInput || target.closest('[data-shell-surface], dialog'))) return;
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

	const closeWindow = useCallback((id: string) => {
		if (id === "cd-player") {
			audio.quit();
			cdDragged.current = false;
		}
		setWindows((prev) => {
			const next = prev.filter((w) => w.id !== id && w.parentId !== id);
			const front = activeWindowId(next);
			requestAnimationFrame(() => {
				if (front) document.getElementById(`desktop-window-${front}`)?.focus({ preventScroll: true });
			});
			return next;
		});
	}, [audio]);

	function isBootVisible(w: DesktopWindow) {
		return w.launched || !DESKTOP_REVEAL_WINDOWS.has(w.id) || revealed.has(w.id);
	}

	const activate = useCallback((id: string) => {
		setWindows((prev) => activateWindow(prev, id));
	}, []);

	const minimizeWindow = useCallback((id: string) => {
		setWindows((prev) => minimizeWindowTree(prev, id));
	}, []);

	const maximizeWindow = useCallback((id: string) => {
		setWindows((prev) => toggleMaximizeWindow(prev, id, window.innerWidth, window.innerHeight));
	}, []);

	/** Measure after the task exists, including launches after a full quit. */
	const focusWindow = useCallback((id: string) => {
		requestAnimationFrame(() => {
			const root = document.getElementById(`desktop-window-${id}`);
			// Typing or another activation can win before this scheduled focus runs.
			if (!root || root.dataset.active !== "true" || root.hasAttribute("inert")) return;
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
			root.focus({ preventScroll: true });
			if (document.activeElement === root) root.querySelector<HTMLElement>('.shell-list[role="listbox"], [data-window-focus]')?.focus({ preventScroll: true });
		});
	}, []);

	const restoreWindow = useCallback((id: string) => {
		setWindows((prev) => activateWindow(prev, id));
		focusWindow(id);
	}, [focusWindow]);

	/** All launchers share the wait; taskbar restores deliberately bypass it. */
	const launchApp = useCallback((id: AppId, sourceId?: string) => {
		if (launchTimer.current !== null) return;
		const catalogId = id === "explorer" ? "secrets" : id === "word" ? "resume" : id === "bio" || id === "experience" ? id : undefined;
		const required = sourceId ?? (catalogId ? getSnapshot().state.nodes.find((node) => node.catalogId === catalogId)?.id : undefined);
		if (catalogId && !required || required && required !== "desktop" && !getSnapshot().state.nodes.some((node) => node.id === required)) {
			notice("The file or folder could not be found. Restore it from the Recycle Bin before opening it.", "File not found");
			return;
		}
		if (id === "explorer") setExplorerFolder(required ?? "desktop");
		setBusy(true);
		// ponytail: fixed fake load delay — tune if it feels too snappy/slow
		launchTimer.current = window.setTimeout(() => {
			launchTimer.current = null;
			if (required && required !== "desktop" && !getSnapshot().state.nodes.some((node) => node.id === required)) {
				setBusy(false);
				notice("The file was deleted while opening. Restore it from the Recycle Bin first.", "File not found");
				return;
			}
			const { innerWidth, innerHeight } = window;
			if (id === "explorer") setSecretsOpened(true);
			setWindows((prev) => openApp(prev, id, innerWidth, innerHeight));
			setBusy(false);
			focusWindow(id);
		}, id === "explorer" || id === "recycle-bin" ? 500 : 1500);
	}, [focusWindow, getSnapshot, notice]);

	const openShell = useCallback((id: string) => {
		if (id === "desktop") { launchApp("explorer", "desktop"); return; }
		if (id === "recycle-bin") { launchApp("recycle-bin"); return; }
		const node = getSnapshot().state.nodes.find((node) => node.id === id);
		if (!node) { notice("This item is no longer available.", "File not found"); return; }
		const item = itemOf(node);
		if (item.open) launchApp(item.open, node.id);
		else if (item.href) window.open(item.href, "_blank", "noopener,noreferrer");
	}, [launchApp, getSnapshot, notice]);

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

	const explorerNode = shell.state.nodes.find((node) => node.id === explorerFolder);
	const visibleWindows = windows.filter(isBootVisible).map((w) => {
		if (w.kind === "recycle-bin") return { ...w, icon: binFull ? BIN_ICON.full : BIN_ICON.empty };
		if (w.kind === "explorer") return { ...w, title: explorerFolder === "desktop" ? "Desktop" : explorerNode ? itemOf(explorerNode).name : w.title };
		return w;
	});
	const activeId = activeWindowId(visibleWindows);
	const renderWindow = (w: DesktopWindow) => {
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
			variant={w.kind === "terminal" ? "dos" : w.kind === "error" ? "error" : undefined}
			// Nested crop + parent-of-nested need live React geometry while dragging
			liveMove={Boolean(
				w.parentId || windows.some((c) => c.parentId === w.id),
			)}
			minimizable={w.id !== "alt"}
			onMinimizeAction={minimizeWindow}
			onCloseAction={!w.parentId && !isDecoration(w) ? closeWindow : undefined}
			onMaximizeAction={w.kind === "word" ? maximizeWindow : undefined}
			maximized={Boolean(w.restoreBounds)}
			frameless={w.kind === "experience"}
			onMoveAction={moveWindow}
		>
			<WindowContent id={w.id} kind={w.kind} src={w.src} active={w.id === activeId}
				audio={w.kind === "cd-player" ? audio : undefined}
				cropStyle={w.id === "alt" && parent ? altCropStyle(w, parent) : undefined}
				onMinimize={minimizeWindow} onClose={closeWindow} onOpenShell={openShell} folderId={explorerFolder} />
		</Window>;
	};
	const pspWindow = visibleWindows.find((w) => w.kind === "experience");
	const pspIsActive = activeId === "experience";

	return (
		<div className={busy ? "desktop desktop--busy" : "desktop"} style={{ "--taskbar-height": `${TASKBAR_H}px` } as CSSProperties}
			onDragOver={(event) => {
				if ((event.target as HTMLElement).closest(".win, .taskbar, dialog")) return;
				if (shell.canDrop(event, "desktop")) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }
			}}
			onDrop={(event) => {
				if (!(event.target as HTMLElement).closest(".win, .taskbar, dialog")) shell.drop(event, "desktop");
			}}>

			<FractureBackground active={revealed.has("fracture")} />
			<DesktopIcons
				onOpenAction={openShell}
				onSecretsOpenedAction={() => setSecretsOpened(true)}
				revealed={revealed}
				secretsOpened={secretsOpened}
				explorerOpen={windows.some((w) => w.id === "explorer")}
			/>
			<div className="desktop__windows">
				<div
					className={pspIsActive ? "desktop__psp-dimmer desktop__psp-dimmer--active" : "desktop__psp-dimmer"}
					style={{
						zIndex: pspWindow ? pspWindow.z + (pspIsActive ? 0 : 1) : 0,
						"--psp-dimmer-x": pspWindow ? `${((pspWindow.x + pspWindow.w / 2) / window.innerWidth) * 100}%` : undefined,
						"--psp-dimmer-y": pspWindow ? `${((pspWindow.y + pspWindow.h / 2) / window.innerHeight) * 100}%` : undefined,
					} as CSSProperties}
					aria-hidden="true"
				/>
				{visibleWindows.map(renderWindow)}
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
			<ShellDialogs />
		</div>
	);
}
