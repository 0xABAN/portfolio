"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { ShellMenu, menuPosition, useShellSelection, type MenuCommand, type MenuPosition } from "./ShellControls";
import { useShell } from "./ShellProvider";

/** Desktop layout is owned by Desktop; this hook only owns shell selection/actions. */
export function useDesktopSelection(icons: { id: string; label: string }[], open: (id: string) => void) {
	const shell = useShell();
	const selection = useShellSelection(icons.map((icon) => icon.id), icons.map((icon) => icon.label));
	const [context, setContext] = useState<{ position: MenuPosition; ids: string[] } | null>(null);
	function properties(ids: string[]) {
		if (ids.length === 1 && ids[0] === "recycle-bin") shell.properties();
		else shell.itemProperties(ids.filter((id) => id !== "recycle-bin"));
	}
	function commands(ids: string[]): MenuCommand[] {
		if (ids.length === 1 && ids[0] === "recycle-bin") return [
			{ label: "Open", action: () => open("recycle-bin") },
			{ label: "Empty Recycle Bin", disabled: !shell.state.entries.length, action: shell.empty }, "separator",
			{ label: "Properties", action: shell.properties },
		];
		if (!ids.length) return [
			{ label: "Undo Delete", disabled: !shell.canUndo, action: shell.undo },
			{ label: "Select All", action: selection.all },
		];
		return [
			{ label: "Open", disabled: ids.length !== 1, action: () => open(ids[0]) },
			{ label: "Delete", disabled: !ids.some((id) => id !== "recycle-bin"), action: () => shell.recycle(ids) }, "separator",
			{ label: "Properties", action: () => properties(ids) },
		];
	}
	function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
		if (event.defaultPrevented || (event.target as HTMLElement).closest('[role="menu"], dialog')) return;
		const ids = selection.selected;
		if (event.key === "Delete") { event.preventDefault(); shell.recycle(ids, event.shiftKey); }
		else if (event.key === "Enter") {
			event.preventDefault();
			if (event.altKey) properties(ids);
			else if (ids.length === 1) open(ids[0]);
		} else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); shell.undo(); }
		else if (event.shiftKey && event.key === "F10") {
			event.preventDefault();
			const rect = (event.target as HTMLElement).getBoundingClientRect();
			setContext({ position: { x: rect.left, y: rect.bottom }, ids });
		} else selection.onKeyDown(event);
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
