"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { entryId, itemOf, type RecycledEntry } from "../../files/state";
import { MenuButton, ShellMenu, keyboardMenuPosition, menuPosition, menuShortcut, useShellSelection, type MenuCommand, type MenuPosition } from "../../shell/ShellControls";
import { useShell } from "../../files/ShellProvider";
import "./recycle-bin.css";

const VIEWS = ["Large Icons", "Small Icons", "List", "Details"] as const;
const COLUMNS = ["Name", "Original Location", "Date Deleted", "Type"] as const;
type Column = typeof COLUMNS[number];

function value(entry: RecycledEntry, column: Column) {
	const item = itemOf(entry.nodes[0]);
	switch (column) {
		case "Name": return item.name;
		case "Original Location": return entry.location;
		case "Date Deleted": return entry.deletedAt;
		case "Type": return item.type;
	}
}

export function RecycleBin({ onCloseAction }: { onCloseAction: () => void }) {
	const shell = useShell();
	const columns = useRef<HTMLDivElement>(null);
	const [view, setView] = useState<typeof VIEWS[number]>("Details");
	const [sort, setSort] = useState<{ column: Column; direction: number }>({ column: "Name", direction: 1 });
	const [toolbar, setToolbar] = useState(false);
	const [status, setStatus] = useState(true);
	const [context, setContext] = useState<{ position: MenuPosition; ids: string[] } | null>(null);
	const entries = [...shell.state.entries].sort((a, b) => {
		const av = value(a, sort.column);
		const bv = value(b, sort.column);
		return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" })) * sort.direction;
	});
	const selection = useShellSelection(entries.map(entryId), entries.map((entry) => itemOf(entry.nodes[0]).name));
	const selected = selection.selected;

	function itemCommands(ids: string[]): MenuCommand[] {
		return [
			{ label: "Restore", disabled: !ids.length, action: () => shell.restore(ids) },
			{ label: "Delete", disabled: !ids.length, action: () => shell.purge(ids) },
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
		else if (event.shiftKey && event.key === "F10") setContext({ position: keyboardMenuPosition(event), ids: selected });
		else selection.onKeyDown(event);
	}

	return <div className="shell-browser recycle-bin" data-shell-surface="" onKeyDown={onKey}>
		<div className="shell-menubar" role="menubar" aria-label="Recycle Bin menus">
			<MenuButton label="File" commands={[
				...itemCommands(selected), "separator",
				{ label: "Empty Recycle Bin", disabled: !entries.length, action: shell.empty },
				{ label: "Close", action: onCloseAction },
			]} />
			<MenuButton label="Edit" commands={[
				{ label: "Select All", disabled: !entries.length, action: selection.all },
				{ label: "Invert Selection", disabled: !entries.length, action: selection.invert },
			]} />
			<MenuButton label="View" commands={viewCommands} />
			<MenuButton label="Help" commands={[{ label: "About Recycle Bin", action: () => shell.notice("Deleted files stay here until you restore them or empty the bin. Select an item and choose File → Restore, or drag it back out.", "about recycle bin") }]} />
		</div>
		{toolbar && <div className="shell-toolbar" role="toolbar" aria-label="Recycle Bin">
			<button type="button" disabled={!selected.length} onClick={() => shell.restore(selected)}>Restore</button>
			<button type="button" disabled={!selected.length} onClick={() => shell.purge(selected)}>Delete</button>
			<button type="button" disabled={!entries.length} onClick={shell.empty}>Empty Recycle Bin</button>
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
				const id = entryId(entry);
				const item = itemOf(entry.nodes[0]);
				return <button key={id} type="button" role="option" aria-selected={selected.includes(id)} aria-label={item.name} data-shell-item={id}
					className="shell-item recycle-bin__item" tabIndex={index === 0 ? 0 : -1}
					onClick={(event) => selection.select(id, event)}
					onContextMenu={(event) => { event.stopPropagation(); setContext({ position: menuPosition(event), ids: selection.forItem(id) }); }}
					draggable onDragStart={(event) => shell.startDrag(event, { kind: "entries", ids: selection.forItem(id) })} onDragEnd={shell.endDrag}>
					<span className="shell-item__name">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={item.icon} alt="" width={16} height={16} draggable={false} /><span>{item.name}</span>
					</span>
					{view === "Details" && <><span>{entry.location}</span><span>{new Date(entry.deletedAt).toLocaleString()}</span><span>{item.type}</span></>}
				</button>;
			})}
		</div>
		{status && <div className="shell-status" aria-live="polite"><span>{selected.length ? `${selected.length} object(s) selected` : `${entries.length} object(s)`}</span></div>}
		{context && <ShellMenu label="Recycle Bin context menu" position={context.position} commands={context.ids.length ? itemCommands(context.ids) : [
			{ label: "Empty Recycle Bin", disabled: !entries.length, action: shell.empty }, "separator", ...viewCommands,
		]} onClose={() => setContext(null)} />}
	</div>;
}
