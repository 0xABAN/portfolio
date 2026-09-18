"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import "./recycle-bin.css";

/** One selection contract for Desktop, Explorer and the Recycle Bin. */
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
			// Geometry keeps arrow navigation correct in wrapped desktop/icon columns.
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

export function ShellDialogFrame({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
	const ref = useRef<HTMLDialogElement>(null);
	const titleId = useId();
	useEffect(() => {
		const dialog = ref.current!;
		const previous = document.activeElement as HTMLElement | null;
		const surface = previous?.closest<HTMLElement>("[data-shell-surface]");
		dialog.showModal();
		return () => {
			dialog.close();
			// React removes the dialog before passive cleanup; native focus restoration
			// alone would leave keyboard users on <body> after Cancel.
			const target = previous?.isConnected ? previous : surface?.querySelector<HTMLElement>("[data-shell-item]");
			target?.focus({ preventScroll: true });
		};
	}, []);
	return <dialog ref={ref} className="shell-dialog chrome-raised" aria-labelledby={titleId} data-shell-surface=""
		onCancel={(event) => { event.preventDefault(); onClose(); }}>
		<header className="win-titlebar"><span id={titleId} className="win-titlebar__text">{title}</span>
			<button type="button" className="win-min win-close chrome-raised" aria-label={`Close ${title}`} onClick={onClose}>×</button>
		</header>
		{children}
	</dialog>;
}
