"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { deleteNodes, entryId, initialShellState, itemOf, moveNodes, parseShellState, purgeEntries, restoreEntries, selectedRoots, STORAGE_KEY, type ShellState } from "./files";
import "./controls.css";

type ShellDialog = { title: string; message: string; accept?: () => void };
type ShellDrag = { kind: "nodes" | "entries"; ids: string[] };
const DRAG_TYPE = "application/x-portfolio-shell";

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
	const current = useRef(state);
	const [dialog, setDialog] = useState<ShellDialog | null>(() => loaded.error ? { title: "desktop storage", message: loaded.error } : null);
	const drag = useRef<ShellDrag | null>(null);

	function notice(message: string, title = "recycle bin") {
		setDialog({ title, message });
	}

	function confirm(message: string, action: () => void, title = "confirm file delete") {
		setDialog({ title, message, accept: () => { setDialog(null); action(); } });
	}

	function save(next: ShellState) {
		current.current = next;
		setState(next);
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		} catch {
			notice("The desktop could not be saved, so this change lasts only until you leave the page.", "desktop storage");
		}
	}

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
		empty: () => purge(current.current.entries.map(entryId), "confirm multiple file delete"),
		reset: () => confirm("Reset all portfolio files? This brings back permanently deleted items. Your icon arrangement will be kept.", () => {
			save(initialShellState());
		}, "reset portfolio"),
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

export function ShellDialogs() {
	const shell = useShell();
	const dialog = shell.dialog;
	return dialog && <MessageDialog {...dialog} onClose={shell.closeDialog} />;
}

function MessageDialog({ title, message, accept, onClose }: { title: string; message: string; accept?: () => void; onClose: () => void }) {
	const ref = useRef<HTMLDialogElement>(null);
	const titleId = useId();

	useEffect(() => {
		const dialog = ref.current!;
		const previous = document.activeElement as HTMLElement | null;
		const surface = previous?.closest<HTMLElement>("[data-shell-surface]");
		dialog.showModal();
		return () => {
			dialog.close();
			const target = previous?.isConnected ? previous : surface?.querySelector<HTMLElement>("[data-shell-item]");
			target?.focus({ preventScroll: true });
		};
	}, []);

	return <dialog ref={ref} className="shell-dialog chrome-raised" aria-labelledby={titleId} data-shell-surface=""
		onCancel={(event) => { event.preventDefault(); onClose(); }}>
		<header className="win-titlebar"><span id={titleId} className="win-titlebar__text">{title}</span>
			<button type="button" className="win-min win-close chrome-raised" aria-label={`Close ${title}`} onClick={onClose}>×</button>
		</header>
		<div className="shell-dialog__message"><span className="shell-dialog__symbol" aria-hidden="true">{accept ? "?" : "!"}</span><p>{message}</p></div>
		<div className="shell-dialog__buttons">
			{accept && <button type="button" className="chrome-raised" onClick={accept}>Yes</button>}
			<button type="button" className="chrome-raised" autoFocus onClick={onClose}>{accept ? "No" : "OK"}</button>
		</div>
	</dialog>;
}

export function useShellSelection(ids: string[], names: string[]) {
	const [selection, setSelection] = useState<string[]>([]);
	const anchor = useRef<string | null>(null);
	const typed = useRef({ text: "", at: 0 });
	const selected = selection.filter((id) => ids.includes(id));

	function select(id: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {}) {
		const additive = modifiers.ctrlKey || modifiers.metaKey;
		if (modifiers.shiftKey && anchor.current && ids.includes(anchor.current)) {
			const from = ids.indexOf(anchor.current);
			const to = ids.indexOf(id);
			const range = ids.slice(Math.min(from, to), Math.max(from, to) + 1);
			setSelection(additive ? [...new Set([...selected, ...range])] : range);
		} else {
			anchor.current = id;
			setSelection(additive ? selected.includes(id) ? selected.filter((key) => key !== id) : [...selected, id] : [id]);
		}
	}

	function forItem(id: string) {
		if (selected.includes(id)) return selected;
		select(id);
		return [id];
	}

	function onKeyDown(event: KeyboardEvent<HTMLElement>) {
		if (event.defaultPrevented || (event.target as HTMLElement).closest('[role="menu"], dialog, input, select, textarea')) return;
		const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-shell-item]"));
		const current = (event.target as HTMLElement).closest<HTMLElement>("[data-shell-item]");
		const index = elements.indexOf(current!);
		const id = current?.dataset.shellItem;
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
			event.preventDefault();
			setSelection(ids);
			return;
		}
		if (event.altKey || ((event.ctrlKey || event.metaKey) && !event.key.startsWith("Arrow") && event.key !== " ")) return;
		let next: HTMLElement | undefined;
		if (event.key === "Home") next = elements[0];
		else if (event.key === "End") next = elements.at(-1);
		else if (event.key.startsWith("Arrow")) {
			const rect = current?.getBoundingClientRect();
			const vertical = event.key === "ArrowUp" || event.key === "ArrowDown";
			const direction = event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1;
			if (rect) {
				next = elements.filter((element) => element !== current).map((element) => {
					const other = element.getBoundingClientRect();
					const primary = (vertical ? other.top - rect.top : other.left - rect.left) * direction;
					const secondary = Math.abs(vertical ? other.left - rect.left : other.top - rect.top);
					return { element, primary, score: primary + secondary * 4 };
				}).filter((candidate) => candidate.primary > 1).sort((a, b) => a.score - b.score)[0]?.element;
			} else next = elements[0];
			event.preventDefault();
		} else if (event.key === " " && id) {
			event.preventDefault();
			select(id, event);
		} else if (event.key.length === 1 && !event.nativeEvent.isComposing) {
			event.preventDefault();
			const now = Date.now();
			typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + event.key.toLowerCase(), at: now };
			const match = ids.findIndex((_, offset) => names[(index + 1 + offset) % ids.length]?.toLowerCase().startsWith(typed.current.text));
			if (match >= 0) next = elements[(index + 1 + match) % ids.length];
		}
		if (next) {
			event.preventDefault();
			next.focus();
			if (!event.ctrlKey && !event.metaKey) select(next.dataset.shellItem!, event);
		}
	}

	return { selected, select, forItem, onKeyDown, all: () => setSelection(ids), clear: () => setSelection([]), invert: () => setSelection(ids.filter((id) => !selected.includes(id))) };
}

export type MenuCommand = { label: string; action: () => void; disabled?: boolean; checked?: boolean; radio?: boolean } | "separator";
export type MenuPosition = { x: number; y: number };

export function menuPosition(event: MouseEvent<HTMLElement>): MenuPosition {
	event.preventDefault();
	const rect = event.currentTarget.getBoundingClientRect();
	return { x: event.clientX || rect.left, y: event.clientY || rect.bottom };
}

export function keyboardMenuPosition(event: KeyboardEvent<HTMLElement>): MenuPosition {
	event.preventDefault();
	const rect = (event.target as HTMLElement).getBoundingClientRect();
	return { x: rect.left, y: rect.bottom };
}

export function ShellMenu({ label, commands, position, onClose }: { label: string; commands: MenuCommand[]; position: MenuPosition; onClose: () => void }) {
	const ref = useRef<HTMLDivElement>(null);
	const close = useRef(onClose);
	useEffect(() => { close.current = onClose; }, [onClose]);
	useEffect(() => {
		const previous = document.activeElement as HTMLElement | null;
		const menu = ref.current!;
		menu.showPopover();
		const bounds = menu.getBoundingClientRect();
		menu.style.left = `${Math.max(2, Math.min(position.x, window.innerWidth - bounds.width - 2))}px`;
		menu.style.top = `${Math.max(2, Math.min(position.y, window.innerHeight - bounds.height - 2))}px`;
		menu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
		return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
	}, [position.x, position.y]);

	function onKey(event: KeyboardEvent<HTMLDivElement>) {
		const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
		const index = items.indexOf(document.activeElement as HTMLButtonElement);
		const delta = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
		if (delta || event.key === "Home" || event.key === "End") {
			event.preventDefault();
			items[event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + delta + items.length) % items.length]?.focus();
		} else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
			const buttons = Array.from(event.currentTarget.closest('[role="menubar"]')?.querySelectorAll<HTMLButtonElement>("[data-shell-menu]") ?? []);
			const active = buttons.findIndex((button) => button.getAttribute("aria-expanded") === "true");
			if (active >= 0) {
				event.preventDefault();
				close.current();
				buttons[(active + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length]?.click();
			}
		} else if (event.key === "Escape" || event.key === "Tab") {
			if (event.key === "Escape") event.preventDefault();
			close.current();
		} else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
			const item = items.find((item) => item.textContent?.trim().toLowerCase().startsWith(event.key.toLowerCase()));
			if (item) { event.preventDefault(); item.click(); }
		}
		event.stopPropagation();
	}

	return <div ref={ref} className="shell-menu chrome-raised" popover="auto" role="menu" aria-label={label} data-shell-surface=""
		onKeyDown={onKey} onToggle={(event) => { if (event.newState === "closed") close.current(); }}>
		{commands.map((command, index) => command === "separator" ? <hr key={index} /> :
			<button key={command.label} type="button" role={command.checked === undefined ? "menuitem" : command.radio ? "menuitemradio" : "menuitemcheckbox"} aria-checked={command.checked} disabled={command.disabled}
				onClick={() => { close.current(); command.action(); }}>
				<span className="shell-menu__check" aria-hidden="true">{command.checked ? command.radio ? "•" : "✓" : ""}</span>{command.label}
			</button>)}
	</div>;
}

export function MenuButton({ label, commands }: { label: string; commands: MenuCommand[] }) {
	const [position, setPosition] = useState<MenuPosition | null>(null);
	return <>
		<button type="button" role="menuitem" data-shell-menu={label[0].toLowerCase()} aria-haspopup="menu" aria-expanded={Boolean(position)} onClick={(event) => {
			const rect = event.currentTarget.getBoundingClientRect();
			setPosition({ x: rect.left, y: rect.bottom });
		}}><u>{label[0]}</u>{label.slice(1)}</button>
		{position && <ShellMenu label={label} commands={commands} position={position} onClose={() => setPosition(null)} />}
	</>;
}

export function menuShortcut(event: KeyboardEvent<HTMLElement>) {
	if (!event.altKey || event.key.length !== 1) return false;
	const button = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-shell-menu]")).find((button) => button.dataset.shellMenu === event.key.toLowerCase());
	if (!button) return false;
	event.preventDefault();
	button.click();
	return true;
}
