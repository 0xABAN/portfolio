"use client";

import { createContext, useContext, useRef, useState, type DragEvent, type ReactNode } from "react";
import { deleteNodes, entryId, initialShellState, itemOf, moveNodes, parseShellState, purgeEntries, restoreEntries, selectedRoots, STORAGE_KEY, type ShellState } from "./state";

type ShellDialog = { title: string; message: string; accept?: () => void };
type ShellDrag = { kind: "nodes" | "entries"; ids: string[] };
const DRAG_TYPE = "application/x-portfolio-shell";

/** The saved desktop, or a fresh one and the reason when it cannot be read. */
function loadState(): { state: ShellState; error?: string } {
	try {
		return { state: parseShellState(window.localStorage.getItem(STORAGE_KEY)) };
	} catch {
		return { state: initialShellState(), error: "The saved desktop could not be read, so the portfolio starts fresh. Your next change replaces the saved copy." };
	}
}

function useShellController() {
	const [loaded] = useState(loadState);
	const [state, setState] = useState(loaded.state);
	// Event handlers and delayed launches read the latest state, not the one they closed over.
	const current = useRef(state);
	const [dialog, setDialog] = useState<ShellDialog | null>(() => loaded.error ? { title: "Desktop storage", message: loaded.error } : null);
	const drag = useRef<ShellDrag | null>(null);

	function notice(message: string, title = "Recycle Bin") {
		setDialog({ title, message });
	}

	function confirm(message: string, action: () => void, title = "Confirm File Delete") {
		setDialog({ title, message, accept: () => { setDialog(null); action(); } });
	}

	function save(next: ShellState) {
		current.current = next;
		setState(next);
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		} catch {
			notice("The desktop could not be saved, so this change lasts only until you leave the page.", "Desktop storage");
		}
	}

	/** Commands confirm first; drags onto the bin do not. Permanent deletion always asks. */
	function recycle(ids: readonly string[], permanent = false, source: "command" | "drag" = "command") {
		const roots = selectedRoots(current.current, ids);
		if (!roots.length) return;
		const target = roots.length === 1 ? `"${itemOf(roots[0]).name}"` : `these ${roots.length} items`;
		const run = () => save(deleteNodes(current.current, ids, Date.now(), permanent));
		if (permanent) confirm(`Are you sure you want to permanently delete ${target}?`, run);
		else if (source === "command") confirm(`Are you sure you want to send ${target} to the Recycle Bin?`, run);
		else run();
	}

	function purge(ids: readonly string[], title?: string) {
		const count = current.current.entries.filter((entry) => ids.includes(entryId(entry))).length;
		if (!count) return;
		confirm(`Are you sure you want to permanently delete ${count === 1 ? "this item" : `these ${count} items`}?`, () => {
			save(purgeEntries(current.current, ids));
		}, title);
	}

	function restore(ids: readonly string[], destination?: string) {
		save(restoreEntries(current.current, ids, destination));
	}

	function move(ids: readonly string[], destination: string) {
		try {
			save(moveNodes(current.current, ids, destination));
		} catch (error) {
			notice(error instanceof Error ? error.message : "The item could not be moved.");
		}
	}

	function startDrag(event: DragEvent, payload: ShellDrag) {
		drag.current = payload;
		event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload));
		event.dataTransfer.setData("text/plain", payload.ids[0] ?? "");
		event.dataTransfer.effectAllowed = "move";
	}

	/** Only this page's own drags drop; deleted items can leave the bin but not re-enter it. */
	function canDrop(event: DragEvent, destination: string) {
		return Boolean(drag.current && event.dataTransfer.types.includes(DRAG_TYPE) && (destination !== "bin" || drag.current.kind === "nodes"));
	}

	function drop(event: DragEvent, destination: string) {
		if (!canDrop(event, destination) || event.dataTransfer.getData(DRAG_TYPE) !== JSON.stringify(drag.current)) return;
		event.preventDefault();
		event.stopPropagation();
		const payload = drag.current!;
		drag.current = null;
		if (payload.kind === "entries") restore(payload.ids, destination);
		else if (destination === "bin") recycle(payload.ids, event.shiftKey, "drag");
		else move(payload.ids, destination);
	}

	return {
		state, dialog, closeDialog: () => setDialog(null),
		getState: () => current.current, notice, recycle, purge, restore,
		empty: () => purge(current.current.entries.map(entryId), "Confirm Multiple File Delete"),
		reset: () => confirm("Reset all portfolio files? This brings back permanently deleted items. Your icon arrangement will be kept.", () => {
			save(initialShellState());
		}, "Reset portfolio"),
		startDrag, endDrag: () => { drag.current = null; }, canDrop, drop,
	};
}

const ShellContext = createContext<ReturnType<typeof useShellController> | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
	return <ShellContext.Provider value={useShellController()}>{children}</ShellContext.Provider>;
}

export function useShell() {
	const shell = useContext(ShellContext);
	if (!shell) throw new Error("Shell items must be rendered inside ShellProvider.");
	return shell;
}
