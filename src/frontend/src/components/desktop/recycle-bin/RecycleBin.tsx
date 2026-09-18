"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { binBytes, entryRoot, itemOf, nodeBytes, originalLocation, type RecycledEntry } from "./recycleBinState";
import { formatBytes } from "./shellCatalog";
import { MenuButton, ShellMenu, menuPosition, menuShortcut, useShellSelection, type MenuCommand, type MenuPosition } from "./ShellControls";
import { useShell } from "./ShellProvider";

const VIEWS = ["Large Icons", "Small Icons", "List", "Details"] as const;
const COLUMNS = ["Name", "Original Location", "Date Deleted", "Type", "Size"] as const;
type Column = typeof COLUMNS[number];

function value(entry: RecycledEntry, column: Column) {
	const item = itemOf(entryRoot(entry));
	switch (column) {
		case "Name": return item.name;
		case "Original Location": return originalLocation(entry);
		case "Date Deleted": return entry.deletedAt;
		case "Type": return item.type;
		case "Size": return nodeBytes(entry.nodes);
	}
}

export function RecycleBin({ onCloseAction }: { onCloseAction: () => void }) {
	const shell = useShell();
	const columns = useRef<HTMLDivElement>(null);
	const [view, setView] = useState<typeof VIEWS[number]>("Details");
	const [sort, setSort] = useState<{ column: Column; direction: number }>({ column: "Name", direction: 1 });
	const [toolbar, setToolbar] = useState(false);
	const [status, setStatus] = useState(true);
	const [context, setContext] = useState<{ position: MenuPosition; ids: number[] } | null>(null);
	const entries = [...shell.state.entries].sort((a, b) => {
		const av = value(a, sort.column);
		const bv = value(b, sort.column);
		return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" })) * sort.direction || a.id - b.id;
	});
	const selection = useShellSelection(entries.map((entry) => String(entry.id)), entries.map((entry) => itemOf(entryRoot(entry)).name));
	const selected = selection.selected.map(Number);
	const selectedBytes = entries.filter((entry) => selected.includes(entry.id)).reduce((sum, entry) => sum + nodeBytes(entry.nodes), 0);

	function itemCommands(ids: number[]): MenuCommand[] {
		return [
			{ label: "Restore", disabled: !ids.length, action: () => shell.restore(ids) },
			{ label: "Delete", disabled: !ids.length, action: () => shell.purge(ids) },
			"separator",
			{ label: "Properties", disabled: !ids.length, action: () => shell.itemProperties(undefined, ids) },
		];
	}
	const viewCommands: MenuCommand[] = [
		...VIEWS.map((label) => ({ label, checked: view === label, radio: true, action: () => setView(label) })),
		"separator",
		{ label: "Toolbar", checked: toolbar, action: () => setToolbar(!toolbar) },
		{ label: "Status Bar", checked: status, action: () => setStatus(!status) },
	];

	function onKey(event: KeyboardEvent<HTMLDivElement>) {
		if (event.defaultPrevented || (event.target as HTMLElement).closest('[role="menu"], dialog')) return;
		if (menuShortcut(event)) return;
		if (event.key === "Delete") { event.preventDefault(); shell.purge(selected); }
		else if (event.key === "Enter" && (event.target as HTMLElement).dataset.shellItem) { event.preventDefault(); shell.itemProperties(undefined, selected); }
		else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); shell.undo(); }
		else if (event.shiftKey && event.key === "F10") {
			event.preventDefault();
			const rect = (event.target as HTMLElement).getBoundingClientRect();
			setContext({ position: { x: rect.left, y: rect.bottom }, ids: selected });
		} else selection.onKeyDown(event);
	}

	return <div className="shell-browser recycle-bin" data-shell-surface="" onKeyDown={onKey}>
		<div className="shell-menubar" role="menubar" aria-label="Recycle Bin menus">
			<MenuButton label="File" commands={[
				...itemCommands(selected), "separator",
				{ label: "Empty Recycle Bin", disabled: !entries.length, action: shell.empty },
				{ label: "Close", action: onCloseAction },
			]} />
			<MenuButton label="Edit" commands={[
				{ label: "Undo Delete", disabled: !shell.canUndo, action: shell.undo }, "separator",
				{ label: "Select All", disabled: !entries.length, action: selection.all },
				{ label: "Invert Selection", disabled: !entries.length, action: selection.invert },
			]} />
			<MenuButton label="View" commands={viewCommands} />
			<MenuButton label="Help" commands={[{ label: "About Recycle Bin", action: () => shell.notice("Deleted files stay here until you restore them, empty the bin, or C: needs room for newer deleted files. Select an item and choose File → Restore. Double-click an item for its properties. C: and all file sizes are simulated.", "About Recycle Bin") }]} />
		</div>
		{toolbar && <div className="shell-toolbar" role="toolbar" aria-label="Recycle Bin">
			<button type="button" disabled={!selected.length} onClick={() => shell.restore(selected)}>Restore</button>
			<button type="button" disabled={!selected.length} onClick={() => shell.purge(selected)}>Delete</button>
			<button type="button" disabled={!entries.length} onClick={shell.empty}>Empty Recycle Bin</button>
			<button type="button" onClick={shell.properties}>Properties</button>
		</div>}
		{view === "Details" && <div ref={columns} className="recycle-bin__columns">
			{COLUMNS.map((column) => <button key={column} type="button" className="chrome-raised" aria-label={`Sort by ${column}`} aria-pressed={sort.column === column}
				onClick={() => setSort({ column, direction: sort.column === column ? -sort.direction : 1 })}>{column}{sort.column === column ? sort.direction === 1 ? " ▴" : " ▾" : ""}</button>)}
		</div>}
		<div className={`shell-list recycle-bin__list recycle-bin__list--${view.toLowerCase().replace(" ", "-")}`} role="listbox" aria-label="Deleted items" aria-multiselectable="true" tabIndex={entries.length ? -1 : 0}
			onScroll={(event) => { if (columns.current) columns.current.scrollLeft = event.currentTarget.scrollLeft; }}
			onClick={(event) => { if (event.target === event.currentTarget) selection.clear(); }}
			onContextMenu={(event) => { if (!(event.target as HTMLElement).closest("[data-shell-item]")) { selection.clear(); setContext({ position: menuPosition(event), ids: [] }); } }}
			onDragOver={(event) => { if (shell.canDrop(event, "bin")) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }} onDrop={(event) => shell.drop(event, "bin")}>
			{entries.map((entry, index) => {
				const item = itemOf(entryRoot(entry));
				return <button key={entry.id} type="button" role="option" aria-selected={selected.includes(entry.id)} aria-label={item.name} data-shell-item={String(entry.id)} data-entry-id={entry.id}
					className="shell-item recycle-bin__item" tabIndex={index === 0 ? 0 : -1}
					onClick={(event) => selection.select(String(entry.id), event)} onDoubleClick={() => shell.itemProperties(undefined, [entry.id])}
					onContextMenu={(event) => { event.stopPropagation(); setContext({ position: menuPosition(event), ids: selection.forItem(String(entry.id)).map(Number) }); }}
					draggable onDragStart={(event) => shell.startDrag(event, { kind: "entries", ids: selection.forItem(String(entry.id)).map(Number) })} onDragEnd={shell.endDrag}>
					<span className="shell-item__name">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={item.icon} alt="" width={16} height={16} draggable={false} /><span>{item.name}</span>
					</span>
					{view === "Details" && <><span>{originalLocation(entry)}</span><span>{new Date(entry.deletedAt).toLocaleString()}</span><span>{item.type}</span><span>{formatBytes(nodeBytes(entry.nodes))}</span></>}
				</button>;
			})}
		</div>
		{status && <div className="shell-status" aria-live="polite"><span>{selected.length ? `${selected.length} object(s) selected` : `${entries.length} object(s)`}</span><span>{formatBytes(selected.length ? selectedBytes : binBytes(shell.state))}</span></div>}
		{context && <ShellMenu label="Recycle Bin context menu" position={context.position} commands={context.ids.length ? itemCommands(context.ids) : [
			{ label: "Empty Recycle Bin", disabled: !entries.length, action: shell.empty }, "separator", ...viewCommands, "separator", { label: "Properties", action: shell.properties },
		]} onClose={() => setContext(null)} />}
	</div>;
}
