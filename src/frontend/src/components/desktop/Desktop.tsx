"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { DesktopSparks, FractureBackground, Neko, useDesktopReveal } from "./effects";
import { useCdPlayerAudio } from "./apps/CdPlayer";
import { BIN_ICON, itemOf } from "./shell/files";
import { ShellDialogs, ShellProvider, useShell } from "./shell/Shell";
import { DesktopIcons } from "./shell/DesktopIcons";
import { Taskbar } from "./shell/Taskbar";
import { WindowContent } from "./apps/WindowContent";
import { useTaskFlyout, Window } from "./Window";
import { TASKBAR_H, activateWindow, activeWindowId, altCropStyle, isDecoration, layoutDesktop, minimizeWindowTree, moveWindow, openApp, reflowDesktop, restoreDecorations, taskWindows, type AppId, type DesktopWindow } from "./windows";
import "./desktop.css";

const APP_FILES: Partial<Record<AppId, string>> = { explorer: "secrets", experience: "experience" };
const FILE_NOT_FOUND = "The file or folder could not be found. Restore it from the Recycle Bin before opening it.";

const FOLDER_LOAD_MS = 500;
const APP_LOAD_MS = 1500;

function isDesktopSurface(target: EventTarget) {
	return !(target as HTMLElement).closest(".win, .taskbar, dialog");
}

export function Desktop() {
	return <ShellProvider><DesktopWorkspace /></ShellProvider>;
}

function DesktopWorkspace() {
	const shell = useShell();
	const { getState, notice } = shell;
	const [explorerFolder, setExplorerFolder] = useState("secrets");
	const [windows, setWindows] = useState<DesktopWindow[]>(() => layoutDesktop(window.innerWidth, window.innerHeight));
	const layoutRef = useRef(windows);
	const [busy, setBusy] = useState(false);
	const launchTimer = useRef<number | null>(null);
	const binFull = shell.state.entries.length > 0;
	const [secretsOpened, setSecretsOpened] = useState(false);
	const revealed = useDesktopReveal();
	const [wallpaperShown, setWallpaperShown] = useState(false);
	const showWallpaper = useCallback(() => setWallpaperShown(true), []);
	const cdWindow = windows.find((w) => w.id === "cd-player");
	const audio = useCdPlayerAudio(revealed("boot-complete"), Boolean(cdWindow));

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
			flushSync(() => {
				setWindows((current) => activateWindow(current, "terminal"));
			});
			if (!input.readOnly) input.focus({ preventScroll: true });
		}

		window.addEventListener("keydown", onTyping);
		return () => window.removeEventListener("keydown", onTyping);
	}, []);

	const closeWindow = useCallback((id: string) => {
		setWindows((prev) => {
			const next = prev.filter((w) => w.id !== id && w.parentId !== id);
			const front = activeWindowId(next);
			requestAnimationFrame(() => {
				if (front) document.getElementById(`desktop-window-${front}`)?.focus({ preventScroll: true });
			});
			return next;
		});
	}, []);

	function isBootVisible(w: DesktopWindow) {
		return w.launched || revealed(w.id);
	}

	const activate = useCallback((id: string) => {
		setWindows((prev) => activateWindow(prev, id));
	}, []);

	const minimizeWindow = useCallback((id: string) => {
		setWindows((prev) => minimizeWindowTree(prev, id));
	}, []);

	const focusWindow = useCallback((id: string) => {
		requestAnimationFrame(() => {
			const root = document.getElementById(`desktop-window-${id}`);
			if (!root || root.dataset.active !== "true" || root.hasAttribute("inert")) return;
			root.focus({ preventScroll: true });
			if (document.activeElement === root) root.querySelector<HTMLElement>('.shell-list[role="listbox"], [data-window-focus]')?.focus({ preventScroll: true });
		});
	}, []);

	const restoreWindow = useCallback((id: string) => {
		setWindows((prev) => activateWindow(prev, id));
		focusWindow(id);
	}, [focusWindow]);

	const launchApp = useCallback((id: AppId, sourceId?: string) => {
		if (launchTimer.current !== null) return;
		const required = sourceId ?? APP_FILES[id];
		const missing = () => required !== undefined && required !== "desktop" && !getState().nodes.some((node) => node.id === required);

		if (missing()) {
			notice(FILE_NOT_FOUND, "file not found");
			return;
		}
		if (id === "explorer") setExplorerFolder(required ?? "desktop");
		setBusy(true);
		launchTimer.current = window.setTimeout(() => {
			launchTimer.current = null;
			if (missing()) {
				setBusy(false);
				notice("The file was deleted while opening. Restore it from the Recycle Bin first.", "file not found");
				return;
			}
			const { innerWidth, innerHeight } = window;
			if (id === "explorer") setSecretsOpened(true);
			setWindows((prev) => openApp(prev, id, innerWidth, innerHeight));
			setBusy(false);
			focusWindow(id);
		}, id === "explorer" || id === "recycle-bin" ? FOLDER_LOAD_MS : APP_LOAD_MS);
	}, [focusWindow, getState, notice]);

	const openShell = useCallback((id: string) => {
		if (id === "desktop") { launchApp("explorer", "desktop"); return; }
		if (id === "recycle-bin") { launchApp("recycle-bin"); return; }
		const node = getState().nodes.find((node) => node.id === id);
		if (!node) { notice("This item is no longer available.", "file not found"); return; }
		const item = itemOf(node);
		if (item.open) launchApp(item.open, node.id);
		else if (item.href) window.open(item.href, "_blank", "noopener,noreferrer");
	}, [launchApp, getState, notice]);

	const openFile = useCallback((id: string) => {
		if (getState().nodes.some((node) => node.id === id)) openShell(id);
		else notice(FILE_NOT_FOUND, "file not found");
	}, [openShell, getState, notice]);

	const move = useCallback((id: string, x: number, y: number) => {
		setWindows((prev) => moveWindow(prev, id, x, y, window.innerWidth, window.innerHeight));
	}, []);

	const explorerNode = shell.state.nodes.find((node) => node.id === explorerFolder);
	const visibleWindows = windows.filter(isBootVisible).map((w) => {
		if (w.kind === "recycle-bin") return { ...w, icon: binFull ? BIN_ICON.full : BIN_ICON.empty };
		if (w.kind === "explorer") return { ...w, title: explorerFolder === "desktop" ? "desktop" : explorerNode ? itemOf(explorerNode).name : w.title };
		return w;
	});
	const activeId = activeWindowId(visibleWindows);
	const tasks = taskWindows(visibleWindows);
	useTaskFlyout("cd-player", visibleWindows.some((w) => w.id === "cd-player" && !w.minimized), tasks.map((w) => w.id).join(), setWindows);
	const renderWindow = (w: DesktopWindow) => {
		const parent = windows.find((p) => p.id === w.parentId);
		return <Window
			key={w.id} id={w.id} title={w.title} icon={w.icon} x={w.x} y={w.y} w={w.w} h={w.h} z={w.z}
			active={(w.parentId ?? w.id) === activeId}
			minimized={Boolean(w.minimized)}
			variant={w.kind === "terminal" ? "dos" : w.kind === "error" ? "error" : undefined}
			liveMove={Boolean(w.parentId || windows.some((c) => c.parentId === w.id))}
			minimizable={w.id !== "alt"}
			frameless={w.kind === "experience"}
			dragAnywhere={w.id === "alt"}
			onActivateAction={activate}
			onMinimizeAction={minimizeWindow}
			onCloseAction={!w.parentId && !isDecoration(w) ? closeWindow : undefined}
			onMoveAction={w.id === "cd-player" ? undefined : move}
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
				if (isDesktopSurface(event.target) && shell.canDrop(event, "desktop")) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }
			}}
			onDrop={(event) => {
				if (isDesktopSurface(event.target)) shell.drop(event, "desktop");
			}}>

			<FractureBackground onShownAction={showWallpaper} />
			<DesktopIcons onOpenAction={openShell} onSecretsOpenedAction={() => setSecretsOpened(true)}
				revealed={revealed} secretsOpened={secretsOpened} explorerOpen={windows.some((w) => w.id === "explorer")} />
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
			{wallpaperShown ? <DesktopSparks /> : null}
			<Taskbar
				muted={audio.muted}
				onToggleMuteAction={audio.toggleMute}
				trackLabel={audio.trackLabel}
				bindElapsed={audio.bindElapsed}
				tasks={tasks}
				activeId={activeId}
				onActivateAction={restoreWindow}
				onLaunchAction={launchApp}
				onOpenFileAction={openFile}
				onRestoreDecorationsAction={() => setWindows(restoreDecorations)}
				onResetAction={shell.reset}
				canRestoreDecorations={windows.some((w) => isDecoration(w) && w.minimized)}
				revealed={revealed}
			/>
			{revealed("neko") ? <Neko /> : null}
			<ShellDialogs />
		</div>
	);
}
