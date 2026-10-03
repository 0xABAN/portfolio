"use client";

import { useEffect, useState } from "react";
import { DESKTOP_REVEAL_MS } from "../desktopReveal";
import { BIN_ICON, DESK_ICONS as FILE_ICONS, type DeskIcon as CatalogIcon } from "../recycle-bin/shellCatalog";
import { itemOf, type ShellNode } from "../recycle-bin/recycleBinState";
import { useShell } from "../recycle-bin/ShellProvider";
import { useDesktopSelection } from "../recycle-bin/useDesktopSelection";
import { TASKBAR_H } from "../window/layout";

type DeskIcon = CatalogIcon & { recycle?: boolean; catalogId?: string };
type DeskIconPosition = { col: number; row: number };
type DeskIconPositions = Record<string, DeskIconPosition>;

type Props = {
	onOpenAction: (id: string) => void;
	onSecretsOpenedAction: () => void;
	revealed: ReadonlySet<string>;
	secretsOpened: boolean;
	explorerOpen: boolean;
};

const RECYCLE_BIN: DeskIcon = {
	id: "recycle-bin",
	label: "Recycle Bin",
	src: BIN_ICON.empty,
	recycle: true,
};

const DESK_ICONS: DeskIcon[] = [...FILE_ICONS, RECYCLE_BIN];
const DESK_ICON_CELL_W = 96;
const DESK_ICON_CELL_H = 112;
const DESK_ICON_GAP_X = 8;
const DESK_ICON_GAP_Y = 8;
const DESK_ICON_STEP_X = DESK_ICON_CELL_W + DESK_ICON_GAP_X;
const DESK_ICON_STEP_Y = DESK_ICON_CELL_H + DESK_ICON_GAP_Y;
const ATTENTION_DELAY_MS = 1000;

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

function DeskIconGlyph({ src, label, notification = false }: { src: string; label: string; notification?: boolean }) {
	return (
		<>
			<span className="desk-icon__art">
				{/* eslint-disable-next-line @next/next/no-img-element */}
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
	const { getSnapshot } = shell;
	const [deskIconPositions, setDeskIconPositions] = useState(() =>
		defaultDeskIconPositions(window.innerWidth, window.innerHeight),
	);
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
				...normalizeDeskIconPositions(current, width, height, shellDeskIcons(getSnapshot().state.nodes)),
			}));
		};
		window.addEventListener("resize", resize);
		return () => window.removeEventListener("resize", resize);
	}, [getSnapshot]);

	const hasNotification = (id: string) =>
		shell.state.nodes.find((node) => node.id === id)?.catalogId === "secrets" && !secretsOpened;
	const bounceSecrets = attention && !secretsOpened && !explorerOpen;
	const deskIcons = shellDeskIcons(shell.state.nodes);
	const visibleDeskIcons = deskIcons.filter((icon) =>
		!DESK_ICONS.some((original) => original.id === (icon.catalogId ?? icon.id))
		|| revealed.has(icon.catalogId ?? icon.id),
	);
	const positions = normalizeDeskIconPositions(deskIconPositions, window.innerWidth, window.innerHeight, deskIcons);
	const desktopSelection = useDesktopSelection(visibleDeskIcons, onOpenAction);

	function markDeskIconInteraction(icon: DeskIcon) {
		if ((icon.catalogId ?? icon.id) === "secrets") onSecretsOpenedAction();
	}

	function swapDeskIcons(sourceId: string, targetId: string) {
		if (!sourceId || sourceId === targetId) return;
		setDeskIconPositions((current) => {
			const source = current[sourceId] ?? positions[sourceId];
			const target = current[targetId] ?? positions[targetId];
			if (!source || !target) return current;
			return { ...current, [sourceId]: target, [targetId]: source };
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
					moveDeskIconAtPoint(draggingId, event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
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
							className={[
								"desk-icon shell-desktop-item",
								(icon.catalogId ?? icon.id) === "secrets" && bounceSecrets ? "desk-icon--bounce" : "",
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
								else if (draggingId) swapDeskIcons(draggingId, icon.id);
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
