"use client";

import { useState, type KeyboardEvent } from "react";
import { ancestorsOf, itemOf, nodeBytes } from "../recycle-bin/recycleBinState";
import { DESKTOP_PATH, formatBytes } from "../recycle-bin/shellCatalog";
import { MenuButton, ShellMenu, menuPosition, menuShortcut, useShellSelection, type MenuCommand, type MenuPosition } from "../recycle-bin/ShellControls";
import { useShell } from "../recycle-bin/ShellProvider";

type Props = {
	folderId: string;
	onOpenAction: (id: string) => void;
};

export function Explorer({ folderId, onOpenAction }: Props) {
	const shell = useShell();
	const folder = shell.state.nodes.find((node) => node.id === folderId);
	const missing = folderId !== "desktop" && !folder;
	const files = missing ? [] : shell.state.nodes.filter((node) => node.parentId === folderId);
	const selection = useShellSelection(files.map((node) => node.id), files.map((node) => itemOf(node).name));
	const [context, setContext] = useState<{ position: MenuPosition; ids: string[] } | null>(null);
	const path = folder ? [DESKTOP_PATH, ...ancestorsOf(shell.state.nodes, folder).map((node) => itemOf(node).name), itemOf(folder).name].join("\\") : DESKTOP_PATH;
	const selected = selection.selected;
	const up = () => onOpenAction(folder?.parentId ?? "desktop");

	function commands(ids: string[]): MenuCommand[] {
		return [
			{ label: "Open", disabled: ids.length !== 1, action: () => onOpenAction(ids[0]) },
			{ label: "Delete", disabled: !ids.length, action: () => shell.recycle(ids) }, "separator",
			{ label: "Properties", disabled: !ids.length, action: () => shell.itemProperties(ids) },
		];
	}
	function onKey(event: KeyboardEvent<HTMLDivElement>) {
		if (event.defaultPrevented || (event.target as HTMLElement).closest('[role="menu"], dialog')) return;
		if (menuShortcut(event)) return;
		if (event.key === "Delete") { event.preventDefault(); shell.recycle(selected, event.shiftKey); }
		else if (event.key === "Enter" && (event.target as HTMLElement).dataset.shellItem) {
			event.preventDefault();
			if (event.altKey) shell.itemProperties(selected);
			else if (selected.length === 1) onOpenAction(selected[0]);
		} else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); shell.undo(); }
		else if (event.key === "Backspace") { event.preventDefault(); up(); }
		else if (event.shiftKey && event.key === "F10") {
			event.preventDefault();
			const rect = (event.target as HTMLElement).getBoundingClientRect();
			setContext({ position: { x: rect.left, y: rect.bottom }, ids: selected });
		} else selection.onKeyDown(event);
	}

	return <div className="shell-browser" aria-label="File explorer" data-shell-surface="" onKeyDown={onKey}>
		<div className="shell-menubar" role="menubar" aria-label="Explorer menus">
			<MenuButton label="File" commands={commands(selected)} />
			<MenuButton label="Edit" commands={[
				{ label: "Undo Delete", disabled: !shell.canUndo, action: shell.undo }, "separator",
				{ label: "Select All", disabled: !files.length, action: selection.all },
				{ label: "Invert Selection", disabled: !files.length, action: selection.invert },
			]} />
			<MenuButton label="View" commands={[{ label: "Up One Level", disabled: folderId === "desktop", action: up }]} />
			<MenuButton label="Help" commands={[{ label: "About Explorer", action: () => shell.notice("Single-click to select, double-click or press Enter to open. Use Delete to recycle, Shift+Delete to delete permanently, and Ctrl+Z to undo a deletion. Drag deleted items out of the Recycle Bin to recover them here.", "About Explorer") }]} />
		</div>
		<div className="shell-toolbar" role="toolbar" aria-label="Explorer">
			<button type="button" disabled={folderId === "desktop"} onClick={up}>Up</button>
			<button type="button" disabled={!shell.canUndo} onClick={shell.undo}>Undo</button>
			<button type="button" disabled={!selected.length} onClick={() => shell.recycle(selected)}>Delete</button>
			<button type="button" disabled={!selected.length} onClick={() => shell.itemProperties(selected)}>Properties</button>
			<span className="shell-path" title={path}>{path}</span>
		</div>
		<div className="shell-list" role="listbox" aria-label="Files" aria-multiselectable="true" tabIndex={files.length ? -1 : 0}
			onClick={(event) => { if (event.target === event.currentTarget) selection.clear(); }}
			onContextMenu={(event) => { if (!(event.target as HTMLElement).closest("[data-shell-item]")) { selection.clear(); setContext({ position: menuPosition(event), ids: [] }); } }}
			onDragOver={(event) => { if (!missing && shell.canDrop(event, folderId)) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }}
			onDrop={(event) => { if (!missing) shell.drop(event, folderId); }}>
			{missing && <div className="shell-missing"><p>This folder has been deleted or moved to the Recycle Bin.</p><button type="button" className="chrome-raised" onClick={() => onOpenAction("recycle-bin")}>Open Recycle Bin</button></div>}
			{files.map((node, index) => {
				const item = itemOf(node);
				return <button key={node.id} type="button" role="option" className="shell-item" aria-selected={selected.includes(node.id)} aria-label={item.name} data-shell-item={node.id} tabIndex={index === 0 ? 0 : -1}
					onClick={(event) => selection.select(node.id, event)} onDoubleClick={() => onOpenAction(node.id)}
					onContextMenu={(event) => { event.stopPropagation(); setContext({ position: menuPosition(event), ids: selection.forItem(node.id) }); }}
					draggable onDragStart={(event) => shell.startDrag(event, { kind: "nodes", ids: selection.forItem(node.id) })} onDragEnd={shell.endDrag}
					onDragOver={(event) => { if (item.kind === "folder" && shell.canDrop(event, node.id)) { event.preventDefault(); event.stopPropagation(); } }}
					onDrop={(event) => { if (item.kind === "folder") shell.drop(event, node.id); }}>
					<span className="shell-item__name">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={item.icon} alt="" width={16} height={16} draggable={false} /><span>{item.name}</span>
					</span>
				</button>;
			})}
		</div>
		<div className="shell-status" aria-live="polite"><span>{selected.length ? `${selected.length} object(s) selected` : `${files.length} object(s)`}</span><span>{formatBytes(nodeBytes(selected.length ? files.filter((node) => selected.includes(node.id)) : files))}</span></div>
		{context && <ShellMenu label="File context menu" position={context.position} commands={context.ids.length ? commands(context.ids) : [{ label: "Undo Delete", disabled: !shell.canUndo, action: shell.undo }, { label: "Select All", disabled: !files.length, action: selection.all }]} onClose={() => setContext(null)} />}
	</div>;
}
