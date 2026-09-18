"use client";

import { createContext, useContext, useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
	deleteNodes, driveSettings, initialShellState, moveNodes, oversizedRoots,
	parseShellState, purgeEntries, restoreEntries, RestoreConflict, saveShellState,
	selectedRoots, STORAGE_KEY, itemOf, type ShellState,
} from "./recycleBinState";

export type ShellSnapshot = { state: ShellState; raw: string | null; error?: string };
export type ShellDialog =
	| { kind: "message"; title: string; message: string; accept?: () => void }
	| { kind: "settings"; snapshot: ShellSnapshot }
	| { kind: "items"; nodes?: string[]; entries?: number[]; state: ShellState };

type ShellDrag = { kind: "nodes"; ids: string[] } | { kind: "entries"; ids: number[] };
const DRAG_TYPE = "application/x-portfolio-shell";

function loadSnapshot(): ShellSnapshot {
	let raw: string | null = null;
	try {
		raw = window.localStorage.getItem(STORAGE_KEY);
		return { raw, state: parseShellState(raw) };
	} catch {
		return { raw, state: initialShellState(), error: "The saved desktop could not be read. Changes are disabled until you reset the portfolio or allow browser storage. Your saved data has not been overwritten." };
	}
}

function useShellController() {
	const [snapshot, setSnapshot] = useState(loadSnapshot);
	const current = useRef(snapshot);
	const [dialog, setDialog] = useState<ShellDialog | null>(() => snapshot.error ? { kind: "message", title: "Desktop storage", message: snapshot.error } : null);
	const [saving, setSaving] = useState(false);
	const [undoIds, setUndoIds] = useState<number[]>([]);
	const drag = useRef<ShellDrag | null>(null);

	function publish(next: ShellSnapshot) {
		current.current = next;
		setSnapshot(next);
	}

	useEffect(() => {
		const refresh = (event: StorageEvent) => {
			if (event.key !== STORAGE_KEY && event.key !== null) return;
			const loaded = loadSnapshot();
			// A damaged cross-tab update must not replace the last good desktop.
			const next = loaded.error ? { ...loaded, state: current.current.state } : loaded;
			current.current = next;
			setSnapshot(next);
			setUndoIds([]);
			if (next.error) setDialog({ kind: "message", title: "Desktop storage", message: next.error });
		};
		window.addEventListener("storage", refresh);
		return () => window.removeEventListener("storage", refresh);
	}, []);

	function notice(message: string, title = "Recycle Bin") {
		setDialog({ kind: "message", title, message });
	}

	function confirm(message: string, action: () => void, title = "Confirm File Delete") {
		setDialog({ kind: "message", title, message, accept: () => { setDialog(null); action(); } });
	}

	async function commit(next: ShellState, expected: ShellSnapshot, undo?: number[], reset = false) {
		setSaving(true);
		try {
			if (expected.error && !reset) throw new Error(expected.error);
			const write = () => {
				const raw = saveShellState(window.localStorage, expected.raw, next);
				publish({ state: next, raw });
				if (undo) setUndoIds(undo);
			};
			// Serialize compare-and-write across tabs when the native Web Locks API is available.
			if (navigator.locks) await navigator.locks.request(STORAGE_KEY, write);
			else write();
			return true;
		} catch (error) {
			const latest = loadSnapshot();
			if (!latest.error) publish(latest);
			notice(`${error instanceof Error ? error.message : "The desktop could not be saved."} No changes from this operation were saved.`, "Desktop storage");
			return false;
		} finally {
			setSaving(false);
		}
	}

	function recycle(ids: readonly string[], permanent = false, source: "command" | "drag" = "command") {
		const base = current.current;
		const roots = selectedRoots(base.state, ids);
		if (!roots.length) return;
		const bypass = permanent || driveSettings(base.state).bypass;
		const oversized = !bypass && oversizedRoots(base.state, ids).length > 0;
		const target = roots.length === 1 ? `"${itemOf(roots[0]).name}"` : `these ${roots.length} items`;
		const run = () => {
			const result = deleteNodes(base.state, ids, Date.now(), permanent, Boolean(oversized));
			void commit(result.state, base, result.recycled);
		};
		if (oversized) confirm(`One or more selected items are too large for the Recycle Bin. Permanently delete those items and recycle the rest?`, run);
		else if (bypass) confirm(`Are you sure you want to permanently delete ${target}?`, run);
		else if (base.state.settings.confirm && source === "command") confirm(`Are you sure you want to send ${target} to the Recycle Bin?`, run);
		else run();
	}

	function purge(ids: readonly number[], empty = false) {
		const base = current.current;
		const selected = base.state.entries.filter((entry) => ids.includes(entry.id));
		if (!selected.length) return;
		confirm(`Are you sure you want to permanently delete ${selected.length === 1 ? "this item" : `these ${selected.length} items`}?`, () => {
			void commit(purgeEntries(base.state, ids), base);
		}, empty ? "Confirm Multiple File Delete" : "Confirm File Delete");
	}

	function restore(ids: readonly number[], destination?: string) {
		const base = current.current;
		const attempt = (merge = false) => {
			try {
				const next = restoreEntries(base.state, ids, destination, merge);
				const recreated = next.nodes.some((node) => node.id.startsWith("restored-") && !base.state.nodes.some((old) => old.id === node.id));
				if (recreated) confirm("The original folder no longer exists. Do you want to recreate it?", () => { void commit(next, base); }, "Restore File");
				else void commit(next, base);
			} catch (error) {
				if (error instanceof RestoreConflict && error.folder) confirm(error.message, () => attempt(true), "Confirm Folder Replace");
				else notice(error instanceof Error ? error.message : "The item could not be restored.");
			}
		};
		attempt();
	}

	function move(ids: readonly string[], destination: string) {
		const base = current.current;
		try { void commit(moveNodes(base.state, ids, destination), base); }
		catch (error) { notice(error instanceof Error ? error.message : "The item could not be moved."); }
	}

	function startDrag(event: DragEvent, payload: ShellDrag) {
		drag.current = payload;
		event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload));
		event.dataTransfer.setData("text/plain", String(payload.ids[0] ?? ""));
		event.dataTransfer.effectAllowed = "move";
	}

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
		state: snapshot.state, dialog, saving, closeDialog: () => setDialog(null),
		getSnapshot: () => current.current, commit, notice, recycle, purge, restore, move,
		canUndo: undoIds.some((id) => snapshot.state.entries.some((entry) => entry.id === id)),
		undo: () => restore(undoIds),
		empty: () => purge(current.current.state.entries.map((entry) => entry.id), true),
		properties: () => setDialog({ kind: "settings", snapshot: current.current }),
		itemProperties: (nodes?: string[], entries?: number[]) => setDialog({ kind: "items", nodes, entries, state: current.current.state }),
		reset: () => confirm("Reset all portfolio files and Recycle Bin settings? This brings back permanently deleted items. Your icon arrangement will be kept.", () => {
			void commit(initialShellState(), current.current, [], true);
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
