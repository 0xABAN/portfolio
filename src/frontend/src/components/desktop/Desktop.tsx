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
import { RecycleBin } from "./recycle-bin/RecycleBin";
import { BIN_ICON, DESK_ICONS as FILE_ICONS, type DeskIcon as CatalogIcon } from "./recycle-bin/shellCatalog";
import { itemOf, type ShellNode } from "./recycle-bin/recycleBinState";
import { ShellProvider, useShell } from "./recycle-bin/ShellProvider";
import { ShellDialogs } from "./recycle-bin/ShellDialogs";
import { useDesktopSelection } from "./recycle-bin/useDesktopSelection";
import { GitHubGraph } from "./GitHubGraph";
import { Neko } from "./Neko";
import { Paint } from "./paint/Paint";
import { Experience } from "./experience/Experience";
import { SystemMessage } from "./SystemMessage";
import { Taskbar } from "./Taskbar";
import { Terminal } from "./Terminal";
import { Word } from "./word/Word";
import { Window } from "./window/Window";
import { activateWindow, activeWindowId, isDecoration, minimizeWindowTree, openApp, restoreDecorations, taskWindows, toggleMaximizeWindow, type AppId } from "./windowState";
import {
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

type DeskIcon = CatalogIcon & { recycle?: boolean; catalogId?: string };

const RECYCLE_BIN: DeskIcon = {
	id: "recycle-bin",
	label: "Recycle Bin",
	src: "/icons/recycle-bin-empty.png",
	recycle: true,
};

const DESK_ICONS: DeskIcon[] = [...FILE_ICONS, RECYCLE_BIN];

function shellDeskIcons(nodes: readonly ShellNode[]): DeskIcon[] {
	const order = (node: ShellNode) => {
		const index = FILE_ICONS.findIndex((icon) => icon.id === node.catalogId);
		return index < 0 ? FILE_ICONS.length : index;
	};
	return [...nodes.filter((node) => node.parentId === "desktop").sort((a, b) => order(a) - order(b)).map((node) => {
		const item = itemOf(node);
		return { id: node.id, catalogId: node.catalogId, label: item.name, src: item.icon, open: item.open, href: item.href };
	}), RECYCLE_BIN];
}

const DESK_ICON_CELL_W = 96;
const DESK_ICON_CELL_H = 112;
const DESK_ICON_GAP_X = 8;
const DESK_ICON_GAP_Y = 8;
const DESK_ICON_STEP_X = DESK_ICON_CELL_W + DESK_ICON_GAP_X;
const DESK_ICON_STEP_Y = DESK_ICON_CELL_H + DESK_ICON_GAP_Y;

type DeskIconPosition = { col: number; row: number };
type DeskIconPositions = Record<string, DeskIconPosition>;

function gridBounds(vw: number, vh: number, count = DESK_ICONS.length) {
	const width = Math.max(DESK_ICON_CELL_W, vw - 10);
	const height = Math.max(DESK_ICON_CELL_H, vh - TASKBAR_H - 28);
	const cols = Math.max(1, Math.floor((width - DESK_ICON_CELL_W) / DESK_ICON_STEP_X) + 1);
	const rows = Math.max(
		Math.max(1, Math.floor((height - DESK_ICON_CELL_H) / DESK_ICON_STEP_Y) + 1),
		Math.ceil(count / cols),
	);
	return { cols, rows };
}

function defaultDeskIconPositions(vw: number, vh: number): DeskIconPositions {
	const { rows } = gridBounds(vw, vh);
	return Object.fromEntries(DESK_ICONS.map((icon, index) => [icon.id, {
		col: Math.floor(index / rows),
		row: index % rows,
	}])) as DeskIconPositions;
}

function normalizeDeskIconPositions(current: DeskIconPositions, vw: number, vh: number, icons = DESK_ICONS): DeskIconPositions {
	const { cols, rows } = gridBounds(vw, vh, icons.length);
	const used = new Set<string>();
	const next: DeskIconPositions = {};
	const total = cols * rows;

	for (const [index, icon] of icons.entries()) {
		const fallback = { col: Math.floor(index / rows), row: index % rows };
		const source = current[icon.id] ?? current[icon.catalogId ?? icon.id] ?? fallback;
		const startCol = Math.min(Math.max(source.col, 0), cols - 1);
		const startRow = Math.min(Math.max(source.row, 0), rows - 1);
		let cell = startRow * cols + startCol;
		while (used.has(`${cell % cols}:${Math.floor(cell / cols)}`)) cell = (cell + 1) % total;
		const position = { col: cell % cols, row: Math.floor(cell / cols) };
		next[icon.id] = position;
		used.add(`${position.col}:${position.row}`);
	}
	return next;
}

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
				{notification && (
					<span className="desk-icon__bubble" aria-hidden="true">
						<span className="desk-icon__bubble-x">
							<span className="desk-icon__bubble-y">
								<span className="desk-icon__bubble-body">
									<span className="desk-icon__bubble-text">don&apos;t click me!</span>
								</span>
							</span>
						</span>
					</span>
				)}
			</span>
			<span className="desk-icon__label">{label}</span>
		</>
	);
}

/** Content does not depend on window position, except for the magnifier crop. */
const WindowContent = memo(function WindowContent({ id, kind, src, active, cropStyle, audio, onMinimize, onClose, onOpenShell, folderId }: {
	id: string;
	kind: DesktopWindow["kind"];
	src?: string;
	active: boolean;
	cropStyle?: CSSProperties;
	audio?: ReturnType<typeof useCdPlayerAudio>;
	onMinimize: (id: string) => void;
	onClose: (id: string) => void;
	onOpenShell: (id: string) => void;
	folderId: string;
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
			return <Experience onClose={() => onClose(id)} />;
		case "terminal":
			return <Terminal />;
		case "bio":
			return <Bio />;
		case "word":
			return <Word onCloseAction={() => onClose(id)} onMinimizeAction={() => onMinimize(id)} />;
		case "recycle-bin":
			return <RecycleBin onCloseAction={() => onClose(id)} />;
		case "explorer":
			return <Explorer folderId={folderId} onOpenAction={onOpenShell} />;
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
	const [deskIconPositions, setDeskIconPositions] = useState(() =>
		defaultDeskIconPositions(window.innerWidth, window.innerHeight),
	);
	const layoutRef = useRef(windows);
	const [busy, setBusy] = useState(false);
	const launchTimer = useRef<number | null>(null);
	const binFull = shell.state.entries.length > 0;
	const [binHot, setBinHot] = useState(false);
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const [attention, setAttention] = useState(false);
	const [secretsOpened, setSecretsOpened] = useState(false);
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
			setDeskIconPositions((current) => ({ ...current, ...normalizeDeskIconPositions(current, width, height, shellDeskIcons(getSnapshot().state.nodes)) }));
		};
		window.addEventListener("resize", resize);
		return () => window.removeEventListener("resize", resize);
	}, [getSnapshot]);

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

	function hasNotification(id: string) {
		return shell.state.nodes.find((node) => node.id === id)?.catalogId === "secrets" && !secretsOpened;
	}

	const bounceSecrets = attention && !secretsOpened && !windows.some((w) => w.id === "explorer");

	function markDeskIconInteraction(icon: DeskIcon) {
		if ((icon.catalogId ?? icon.id) === "secrets") setSecretsOpened(true);
	}

	function swapDeskIcons(sourceId: string, targetId: string) {
		if (!sourceId || sourceId === targetId) return;
		setDeskIconPositions((current) => {
			const source = current[sourceId] ?? positions[sourceId];
			const target = current[targetId] ?? positions[targetId];
			if (!source || !target) return current;

			return {
				...current,
				[sourceId]: target,
				[targetId]: source,
			};
		});
	}

	function moveDeskIconToCell(sourceId: string, col: number, row: number) {
		const { cols, rows } = gridBounds(window.innerWidth, window.innerHeight, deskIcons.length);
		const cell = {
			col: Math.min(Math.max(col, 0), cols - 1),
			row: Math.min(Math.max(row, 0), rows - 1),
		};
		setDeskIconPositions((current) => {
			const source = current[sourceId] ?? positions[sourceId];
			if (!source) return current;
			const target = visibleDeskIcons.find((icon) => icon.id !== sourceId
				&& (current[icon.id] ?? positions[icon.id])?.col === cell.col
				&& (current[icon.id] ?? positions[icon.id])?.row === cell.row);
			if (target?.id === RECYCLE_BIN.id) return current;

			const next = { ...current, [sourceId]: cell };
			if (target) next[target.id] = source;
			return next;
		});
	}

	function moveDeskIconAtPoint(sourceId: string, clientX: number, clientY: number, bounds: DOMRect) {
		moveDeskIconToCell(
			sourceId,
			Math.round((clientX - bounds.left - DESK_ICON_CELL_W / 2) / DESK_ICON_STEP_X),
			Math.round((clientY - bounds.top - DESK_ICON_CELL_H / 2) / DESK_ICON_STEP_Y),
		);
	}

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
		return w.launched || !BOOT_WINDOWS.has(w.id) || revealed.has(w.id);
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
	const deskIcons = shellDeskIcons(shell.state.nodes);
	const visibleDeskIcons = deskIcons.filter((icon) => !DESK_ICONS.some((original) => original.id === (icon.catalogId ?? icon.id)) || revealed.has(icon.catalogId ?? icon.id));
	const positions = normalizeDeskIconPositions(deskIconPositions, window.innerWidth, window.innerHeight, deskIcons);
	const desktopSelection = useDesktopSelection(visibleDeskIcons, openShell);

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
			<ul
				className="desktop__icons"
				aria-label="Desktop"
				role="listbox"
				aria-multiselectable="true"
				data-shell-surface=""
				onKeyDown={desktopSelection.onKeyDown}
				onContextMenu={(e) => { if (e.target === e.currentTarget) desktopSelection.onContextMenu(e); }}
				onPointerDown={(e) => { if (e.target === e.currentTarget) desktopSelection.clear(); }}
				onDragOver={(e) => {
					if (!draggingId && !shell.canDrop(e, "desktop")) return;
					e.preventDefault();
					e.dataTransfer.dropEffect = "move";
				}}
				onDrop={(e) => {
					if (!draggingId) { shell.drop(e, "desktop"); return; }
					e.preventDefault();
					moveDeskIconAtPoint(draggingId, e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
					shell.endDrag();
					setDraggingId(null);
				}}
			>
				{visibleDeskIcons.map((icon, index) => (
					<li
						key={icon.id}
						role="presentation"
						style={{
							left: `${positions[icon.id].col * DESK_ICON_STEP_X}px`,
							top: `${positions[icon.id].row * DESK_ICON_STEP_Y}px`,
						}}
					>
						<button
							type="button"
							className={
								[
									"desk-icon shell-desktop-item",
									(icon.catalogId ?? icon.id) === "secrets" && bounceSecrets ? "desk-icon--bounce" : "",
									icon.recycle && binHot ? "desk-icon--drop-hot" : "",
									draggingId === icon.id ? "desk-icon--dragging" : "",
								]
									.filter(Boolean)
									.join(" ")
							}
							title={icon.label}
							data-app-id={icon.open}
							data-icon-id={icon.id}
							data-shell-item={icon.id}
							data-shortcut={icon.href || icon.open === "cd-player" ? "" : undefined}
							role="option"
							aria-selected={desktopSelection.selected.includes(icon.id)}
							tabIndex={index === 0 ? 0 : -1}
							data-recycle-bin={icon.recycle ? "" : undefined}
							aria-label={hasNotification(icon.id) ? `${icon.label}, unopened folder` : icon.label}
							draggable
							onPointerDown={() => markDeskIconInteraction(icon)}
							onFocus={() => markDeskIconInteraction(icon)}
							onDragOver={(e) => {
								markDeskIconInteraction(icon);
								if (icon.recycle) {
									if (!shell.canDrop(e, "bin")) return;
									e.preventDefault();
									e.dataTransfer.dropEffect = "move";
									setBinHot(true);
									return;
								}
								if ((!draggingId && !(icon.open === "explorer" && shell.canDrop(e, icon.id))) || draggingId === icon.id) return;
								e.preventDefault();
								e.dataTransfer.dropEffect = "move";
							}}
							onDragLeave={() => {
								if (icon.recycle) setBinHot(false);
							}}
							onDrop={(e) => {
								markDeskIconInteraction(icon);
								e.preventDefault();
								e.stopPropagation();
								if (icon.recycle) shell.drop(e, "bin");
								else if (icon.open === "explorer" && draggingId !== RECYCLE_BIN.id) shell.drop(e, icon.id);
								else if (draggingId) swapDeskIcons(draggingId, icon.id);
								shell.endDrag();
								setBinHot(false);
								setDraggingId(null);
							}}
							onDragStart={(e) => {
								markDeskIconInteraction(icon);
								if (icon.recycle) {
									e.dataTransfer.setData("text/plain", icon.id);
									e.dataTransfer.effectAllowed = "move";
								} else shell.startDrag(e, { kind: "nodes", ids: desktopSelection.forItem(icon.id).filter((id) => id !== RECYCLE_BIN.id) });
								setDraggingId(icon.id);
							}}
							onDragEnd={() => {
								shell.endDrag();
								setDraggingId(null);
								setBinHot(false);
							}}
							onClick={(e) => {
								markDeskIconInteraction(icon);
								desktopSelection.select(icon.id, e);
							}}
							onDoubleClick={() => openShell(icon.id)}
							onContextMenu={(e) => desktopSelection.onContextMenu(e, icon.id)}
						>
							<DeskIconGlyph
								src={icon.recycle ? (binFull ? "/icons/recycle-bin-full.png" : "/icons/recycle-bin-empty.png") : icon.src}
								label={icon.label}
								notification={hasNotification(icon.id)}
							/>
						</button>
					</li>
				))}
			</ul>
			<div className="desktop__windows">
				<div
					className={pspIsActive ? "desktop__psp-dimmer desktop__psp-dimmer--active" : "desktop__psp-dimmer"}
					style={{
						zIndex: pspWindow ? pspWindow.z + (pspIsActive ? -1 : 1) : 0,
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
			{desktopSelection.menu}
		</div>
	);
}
