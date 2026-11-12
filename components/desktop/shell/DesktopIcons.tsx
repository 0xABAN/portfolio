import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { TASKBAR_H, desktopScale, desktopSize } from "../windows";
import {
	BIN_ICON,
	byCatalogOrder,
	itemOf,
	type DeskIcon as CatalogIcon,
	type ShellNode,
} from "./files";
import {
	ShellMenu,
	keyboardMenuPosition,
	menuPosition,
	useShell,
	useShellSelection,
	type MenuCommand,
	type MenuPosition,
} from "./Shell";

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

const CELL_W = 96;
const CELL_H = 112;
const STEP_X = CELL_W + 8;
const STEP_Y = CELL_H + 8;

function shellDeskIcons(nodes: readonly ShellNode[]): DeskIcon[] {
	const onDesktop = nodes.filter((node) => node.parentId === "desktop").sort(byCatalogOrder);

	const icons = onDesktop.map((node) => {
		const item = itemOf(node);
		return { id: node.id, label: item.name, src: item.icon, open: item.open, href: item.href };
	});

	return [...icons, RECYCLE_BIN];
}

function gridBounds(vw: number, vh: number, count: number) {
	const width = Math.max(CELL_W, vw - 10);
	const height = Math.max(CELL_H, vh - TASKBAR_H - 28);

	const cols = Math.max(1, Math.floor((width - CELL_W) / STEP_X) + 1);
	const rows = Math.max(1, Math.floor((height - CELL_H) / STEP_Y) + 1, Math.ceil(count / cols));

	return { cols, rows };
}

function columnFirstCell(index: number, rows: number): DeskIconPosition {
	return { col: Math.floor(index / rows), row: index % rows };
}

function normalizeDeskIconPositions(current: DeskIconPositions, vw: number, vh: number, icons: DeskIcon[]): DeskIconPositions {
	const { cols, rows } = gridBounds(vw, vh, icons.length);
	const total = cols * rows;
	const used = new Set<string>();
	const next: DeskIconPositions = {};

	for (const [index, icon] of icons.entries()) {
		const source = current[icon.id] ?? columnFirstCell(index, rows);
		const startCol = Math.min(Math.max(source.col, 0), cols - 1);
		const startRow = Math.min(Math.max(source.row, 0), rows - 1);

		let cell = startCol * rows + startRow;
		while (used.has(`${Math.floor(cell / rows)}:${cell % rows}`)) cell = (cell + 1) % total;

		const position = { col: Math.floor(cell / rows), row: cell % rows };
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
		if (ids.length === 1 && ids[0] === "recycle-bin") {
			return [
				{ label: "Open", action: () => open("recycle-bin") },
				{ label: "Empty Recycle Bin", disabled: !shell.state.entries.length, action: shell.empty },
			];
		}

		if (!ids.length) return [{ label: "Select All", action: selection.all }];

		return [
			{ label: "Open", disabled: ids.length !== 1, action: () => open(ids[0]) },
			{ label: "Delete", disabled: !ids.some((id) => id !== "recycle-bin"), action: () => shell.recycle(ids) },
		];
	}

	function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
		if (event.defaultPrevented || (event.target as HTMLElement).closest('[role="menu"], dialog')) return;

		const ids = selection.selected;
		if (event.key === "Delete") {
			event.preventDefault();
			shell.recycle(ids, event.shiftKey);
		} else if (event.key === "Enter") {
			event.preventDefault();
			if (ids.length === 1) open(ids[0]);
		} else if (event.shiftKey && event.key === "F10") {
			setContext({ position: keyboardMenuPosition(event), ids });
		} else {
			selection.onKeyDown(event);
		}
	}

	function onContextMenu(event: MouseEvent<HTMLElement>, id?: string) {
		event.stopPropagation();
		if (!id) selection.clear();

		setContext({ position: menuPosition(event), ids: id ? selection.forItem(id) : [] });
	}

	const menu = context && (
		<ShellMenu
			label="Desktop context menu"
			commands={commands(context.ids)}
			position={context.position}
			onClose={() => setContext(null)}
		/>
	);

	return { ...selection, onKeyDown, onContextMenu, menu };
}

type GlyphProps = { src: string; label: string; notification?: boolean; bubble?: boolean };

function DeskIconGlyph({ src, label, notification = false, bubble = false }: GlyphProps) {
	return (
		<>
			<span className="desk-icon__art">
				<img className="desk-icon__img" src={src} alt="" width={64} height={64} draggable={false} />

				{notification && <span className="desk-icon__badge" aria-hidden="true">!</span>}

				{bubble && (
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
	const binFull = shell.state.entries.length > 0;

	const [deskIconPositions, setDeskIconPositions] = useState<DeskIconPositions>({});
	const [binHot, setBinHot] = useState(false);
	const [draggingId, setDraggingId] = useState<string | null>(null);

	const hasNotification = (id: string) => id === "secrets" && !secretsOpened;
	const noticeShown = revealed("secrets-notice");
	const bounceSecrets = noticeShown && !secretsOpened && !explorerOpen;

	const deskIcons = shellDeskIcons(shell.state.nodes);
	const visibleDeskIcons = deskIcons.filter((icon) => revealed(icon.id));
	const desktopSelection = useDesktopSelection(visibleDeskIcons, onOpenAction);

	const desktop = desktopSize();
	const positions = normalizeDeskIconPositions(deskIconPositions, desktop.width, desktop.height, deskIcons);

	function markDeskIconInteraction(icon: DeskIcon) {
		if (!secretsOpened && icon.id === "secrets") onSecretsOpenedAction();
	}

	function moveDeskIconToCell(sourceId: string, col: number, row: number) {
		const { cols, rows } = gridBounds(desktop.width, desktop.height, deskIcons.length);
		const cell = { col: Math.min(Math.max(col, 0), cols - 1), row: Math.min(Math.max(row, 0), rows - 1) };

		setDeskIconPositions((current) => {
			const source = current[sourceId] ?? positions[sourceId];
			if (!source) return current;

			const positionOf = (id: string) => current[id] ?? positions[id];
			const target = visibleDeskIcons.find((icon) => {
				const position = positionOf(icon.id);
				return icon.id !== sourceId && position?.col === cell.col && position?.row === cell.row;
			});
			if (target?.id === RECYCLE_BIN.id) return current;

			const next = { ...current, [sourceId]: cell };
			if (target) next[target.id] = source;
			return next;
		});
	}

	function iconClassName(icon: DeskIcon) {
		return [
			"desk-icon shell-desktop-item",
			icon.id === "secrets" && bounceSecrets && "desk-icon--bounce",
			icon.recycle && binHot && "desk-icon--drop-hot",
			draggingId === icon.id && "desk-icon--dragging",
		].filter(Boolean).join(" ");
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
				onContextMenu={(event) => {
					if (event.target === event.currentTarget) desktopSelection.onContextMenu(event);
				}}
				onPointerDown={(event) => {
					if (event.target === event.currentTarget) desktopSelection.clear();
				}}
				onDragOver={(event) => {
					if (!draggingId && !shell.canDrop(event, "desktop")) return;
					event.preventDefault();
					event.dataTransfer.dropEffect = "move";
				}}
				onDrop={(event) => {
					if (!draggingId) {
						shell.drop(event, "desktop");
						return;
					}

					event.preventDefault();

					const bounds = event.currentTarget.getBoundingClientRect();
					const scale = desktopScale();
					const x = (event.clientX - bounds.left) / scale;
					const y = (event.clientY - bounds.top) / scale;
					moveDeskIconToCell(draggingId, Math.round((x - CELL_W / 2) / STEP_X), Math.round((y - CELL_H / 2) / STEP_Y));

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
							className={iconClassName(icon)}
							title={icon.label}
							data-app-id={icon.open}
							data-icon-id={icon.id}
							data-shell-item={icon.id}
							data-shortcut={icon.href || icon.open === "cd-player" ? "" : undefined}
							data-recycle-bin={icon.recycle ? "" : undefined}
							role="option"
							aria-selected={desktopSelection.selected.includes(icon.id)}
							aria-label={hasNotification(icon.id) ? `${icon.label}, unopened folder` : icon.label}
							tabIndex={index === 0 ? 0 : -1}
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

								const folderDrop = icon.open === "explorer" && shell.canDrop(event, icon.id);
								if ((!draggingId && !folderDrop) || draggingId === icon.id) return;

								event.preventDefault();
								event.dataTransfer.dropEffect = "move";
							}}
							onDragLeave={() => {
								if (icon.recycle) setBinHot(false);
							}}
							onDrop={(event) => {
								markDeskIconInteraction(icon);
								event.preventDefault();
								event.stopPropagation();

								const cell = positions[icon.id];
								if (icon.recycle) shell.drop(event, "bin");
								else if (icon.open === "explorer" && draggingId !== RECYCLE_BIN.id) shell.drop(event, icon.id);
								else if (draggingId && draggingId !== icon.id) moveDeskIconToCell(draggingId, cell.col, cell.row);

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
									const ids = desktopSelection.forItem(icon.id).filter((id) => id !== RECYCLE_BIN.id);
									shell.startDrag(event, { kind: "nodes", ids });
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
								bubble={noticeShown && hasNotification(icon.id)}
							/>
						</button>
					</li>
				))}
			</ul>

			{desktopSelection.menu}
		</>
	);
}
