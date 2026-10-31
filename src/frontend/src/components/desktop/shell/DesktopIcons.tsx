"use client";

import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { DESKTOP_REVEAL_MS } from "../effects";
import { TASKBAR_H } from "../windows";
import { BIN_ICON, DESK_ICONS as FILE_ICONS, byCatalogOrder, itemOf, type DeskIcon as CatalogIcon, type ShellNode } from "./files";
import { ShellMenu, keyboardMenuPosition, menuPosition, useShell, useShellSelection, type MenuCommand, type MenuPosition } from "./Shell";

type DeskIcon = CatalogIcon & { recycle?: boolean };
type DeskIconPosition = { col: number; row: number };
type DeskIconPositions = Record<string, DeskIconPosition>;

type Props = {
	onOpenAction: (id: string) => void;
	onSecretsOpenedAction: () => void;
	revealed: (id: string) => boolean;
	secretsOpened: boolean;
	explorerOpen: boolean;
};

const RECYCLE_BIN: DeskIcon = { id: "recycle-bin", label: "Recycle Bin", src: BIN_ICON.empty, recycle: true };
const DESK_ICONS: CatalogIcon[] = [...FILE_ICONS, RECYCLE_BIN];

const CELL_W = 96;
const CELL_H = 112;
const STEP_X = CELL_W + 8;
const STEP_Y = CELL_H + 8;
const ATTENTION_DELAY_MS = 1000;

function shellDeskIcons(nodes: readonly ShellNode[]): DeskIcon[] {
	return [...nodes.filter((node) => node.parentId === "desktop").sort(byCatalogOrder).map((node) => {
		const item = itemOf(node);
		return { id: node.id, label: item.name, src: item.icon, open: item.open, href: item.href };
	}), RECYCLE_BIN];
}

function gridBounds(vw: number, vh: number, count = DESK_ICONS.length) {
	const width = Math.max(CELL_W, vw - 10);
	const height = Math.max(CELL_H, vh - TASKBAR_H - 28);
	const cols = Math.max(1, Math.floor((width - CELL_W) / STEP_X) + 1);
	const rows = Math.max(1, Math.floor((height - CELL_H) / STEP_Y) + 1, Math.ceil(count / cols));
	return { cols, rows };
}

function defaultDeskIconPositions(vw: number, vh: number): DeskIconPositions {
	const { rows } = gridBounds(vw, vh);
	return Object.fromEntries(DESK_ICONS.map((icon, index) => [icon.id, { col: Math.floor(index / rows), row: index % rows }]));
}

function normalizeDeskIconPositions(current: DeskIconPositions, vw: number, vh: number, icons: DeskIcon[]): DeskIconPositions {
	const { cols, rows } = gridBounds(vw, vh, icons.length);
	const used = new Set<string>();
	const next: DeskIconPositions = {};
	const total = cols * rows;

	for (const [index, icon] of icons.entries()) {
		const fallback = { col: Math.floor(index / rows), row: index % rows };
		const source = current[icon.id] ?? fallback;
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

function useDesktopSelection(icons: { id: string; label: string }[], open: (id: string) => void) {
	const shell = useShell();
	const selection = useShellSelection(icons.map((icon) => icon.id), icons.map((icon) => icon.label));
	const [context, setContext] = useState<{ position: MenuPosition; ids: string[] } | null>(null);

	function commands(ids: string[]): MenuCommand[] {
		if (ids.length === 1 && ids[0] === "recycle-bin") return [
			{ label: "Open", action: () => open("recycle-bin") },
			{ label: "Empty Recycle Bin", disabled: !shell.state.entries.length, action: shell.empty },
		];
		if (!ids.length) return [{ label: "Select All", action: selection.all }];
		return [
			{ label: "Open", disabled: ids.length !== 1, action: () => open(ids[0]) },
			{ label: "Delete", disabled: !ids.some((id) => id !== "recycle-bin"), action: () => shell.recycle(ids) },
		];
	}

	function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
		if (event.defaultPrevented || (event.target as HTMLElement).closest('[role="menu"], dialog')) return;
		const ids = selection.selected;
		if (event.key === "Delete") { event.preventDefault(); shell.recycle(ids, event.shiftKey); }
		else if (event.key === "Enter") { event.preventDefault(); if (ids.length === 1) open(ids[0]); }
		else if (event.shiftKey && event.key === "F10") setContext({ position: keyboardMenuPosition(event), ids });
		else selection.onKeyDown(event);
	}

	function onContextMenu(event: MouseEvent<HTMLElement>, id?: string) {
		event.stopPropagation();
		if (!id) selection.clear();
		setContext({ position: menuPosition(event), ids: id ? selection.forItem(id) : [] });
	}

	return {
		...selection, onKeyDown, onContextMenu,
		menu: context && <ShellMenu label="Desktop context menu" commands={commands(context.ids)} position={context.position} onClose={() => setContext(null)} />,
	};
}

function DeskIconGlyph({ src, label, notification = false }: { src: string; label: string; notification?: boolean }) {
	return (
		<>
			<span className="desk-icon__art">
				<img className="desk-icon__img" src={src} alt="" width={64} height={64} draggable={false} />
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

export function DesktopIcons({ onOpenAction, onSecretsOpenedAction, revealed, secretsOpened, explorerOpen }: Props) {
	const shell = useShell();
	const { getState } = shell;
	const [deskIconPositions, setDeskIconPositions] = useState(() => defaultDeskIconPositions(window.innerWidth, window.innerHeight));
	const [binHot, setBinHot] = useState(false);
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const [attention, setAttention] = useState(false);
	const binFull = shell.state.entries.length > 0;

	useEffect(() => {
		const start = window.setTimeout(() => setAttention(true), DESKTOP_REVEAL_MS + ATTENTION_DELAY_MS);
		return () => window.clearTimeout(start);
	}, []);

	useEffect(() => {
		const resize = () => {
			const { innerWidth: width, innerHeight: height } = window;
			setDeskIconPositions((current) => ({
				...current,
				...normalizeDeskIconPositions(current, width, height, shellDeskIcons(getState().nodes)),
			}));
		};
		window.addEventListener("resize", resize);
		return () => window.removeEventListener("resize", resize);
	}, [getState]);

	const hasNotification = (id: string) => id === "secrets" && !secretsOpened;
	const bounceSecrets = attention && !secretsOpened && !explorerOpen;
	const deskIcons = shellDeskIcons(shell.state.nodes);
	const visibleDeskIcons = deskIcons.filter((icon) => revealed(icon.id));
	const positions = normalizeDeskIconPositions(deskIconPositions, window.innerWidth, window.innerHeight, deskIcons);
	const desktopSelection = useDesktopSelection(visibleDeskIcons, onOpenAction);

	function markDeskIconInteraction(icon: DeskIcon) {
		if (!secretsOpened && icon.id === "secrets") onSecretsOpenedAction();
	}

	function moveDeskIconToCell(sourceId: string, col: number, row: number) {
		const { cols, rows } = gridBounds(window.innerWidth, window.innerHeight, deskIcons.length);
		const cell = { col: Math.min(Math.max(col, 0), cols - 1), row: Math.min(Math.max(row, 0), rows - 1) };
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

	return (
		<>
			<ul
				className="desktop__icons"
				aria-label="Desktop"
				role="listbox"
				aria-multiselectable="true"
				data-shell-surface=""
				onKeyDown={desktopSelection.onKeyDown}
				onContextMenu={(event) => { if (event.target === event.currentTarget) desktopSelection.onContextMenu(event); }}
				onPointerDown={(event) => { if (event.target === event.currentTarget) desktopSelection.clear(); }}
				onDragOver={(event) => {
					if (!draggingId && !shell.canDrop(event, "desktop")) return;
					event.preventDefault();
					event.dataTransfer.dropEffect = "move";
				}}
				onDrop={(event) => {
					if (!draggingId) { shell.drop(event, "desktop"); return; }
					event.preventDefault();
					const bounds = event.currentTarget.getBoundingClientRect();
					moveDeskIconToCell(draggingId, Math.round((event.clientX - bounds.left - CELL_W / 2) / STEP_X), Math.round((event.clientY - bounds.top - CELL_H / 2) / STEP_Y));
					shell.endDrag();
					setDraggingId(null);
				}}
			>
				{visibleDeskIcons.map((icon, index) => (
					<li
						key={icon.id}
						role="presentation"
						style={{ left: `${positions[icon.id].col * STEP_X}px`, top: `${positions[icon.id].row * STEP_Y}px` }}
					>
						<button
							type="button"
							className={[
								"desk-icon shell-desktop-item",
								icon.id === "secrets" && bounceSecrets ? "desk-icon--bounce" : "",
								icon.recycle && binHot ? "desk-icon--drop-hot" : "",
								draggingId === icon.id ? "desk-icon--dragging" : "",
							].filter(Boolean).join(" ")}
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
							onDragOver={(event) => {
								markDeskIconInteraction(icon);
								if (icon.recycle) {
									if (!shell.canDrop(event, "bin")) return;
									event.preventDefault();
									event.dataTransfer.dropEffect = "move";
									setBinHot(true);
									return;
								}
								if ((!draggingId && !(icon.open === "explorer" && shell.canDrop(event, icon.id))) || draggingId === icon.id) return;
								event.preventDefault();
								event.dataTransfer.dropEffect = "move";
							}}
							onDragLeave={() => { if (icon.recycle) setBinHot(false); }}
							onDrop={(event) => {
								markDeskIconInteraction(icon);
								event.preventDefault();
								event.stopPropagation();
								if (icon.recycle) shell.drop(event, "bin");
								else if (icon.open === "explorer" && draggingId !== RECYCLE_BIN.id) shell.drop(event, icon.id);
								else if (draggingId && draggingId !== icon.id) moveDeskIconToCell(draggingId, positions[icon.id].col, positions[icon.id].row);
								shell.endDrag();
								setBinHot(false);
								setDraggingId(null);
							}}
							onDragStart={(event) => {
								markDeskIconInteraction(icon);
								if (icon.recycle) {
									event.dataTransfer.setData("text/plain", icon.id);
									event.dataTransfer.effectAllowed = "move";
								} else {
									shell.startDrag(event, { kind: "nodes", ids: desktopSelection.forItem(icon.id).filter((id) => id !== RECYCLE_BIN.id) });
								}
								setDraggingId(icon.id);
							}}
							onDragEnd={() => {
								shell.endDrag();
								setDraggingId(null);
								setBinHot(false);
							}}
							onClick={(event) => {
								markDeskIconInteraction(icon);
								desktopSelection.select(icon.id, event);
							}}
							onDoubleClick={() => onOpenAction(icon.id)}
							onContextMenu={(event) => desktopSelection.onContextMenu(event, icon.id)}
						>
							<DeskIconGlyph
								src={icon.recycle ? (binFull ? BIN_ICON.full : BIN_ICON.empty) : icon.src}
								label={icon.label}
								notification={hasNotification(icon.id)}
							/>
						</button>
					</li>
				))}
			</ul>
			{desktopSelection.menu}
		</>
	);
}
