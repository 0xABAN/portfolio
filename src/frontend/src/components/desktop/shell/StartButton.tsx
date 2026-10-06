"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { AppId } from "../window/state";
import "./start-menu.css";

/** Items launch an app, or open a shell file by catalog ID. */
const GROUPS = [
	{ label: "Programs", icon: "/icons/computer.png", items: [
		{ app: "me", label: "Paint", icon: "/paint/icon-16.png" },
		{ app: "terminal", label: "MS-DOS Prompt", icon: "/icons/terminal.svg" },
		{ app: "github", label: "Activity", icon: "/icons/code.svg" },
		{ app: "cd-player", label: "CD Player", icon: "/icons/cd.png" },
	] },
	{ label: "Documents", icon: "/icons/folder.png", items: [
		{ app: "explorer", label: "secrets", icon: "/icons/folder.png" },
		{ file: "resume", label: "resume.doc", icon: "/icons/notepad.svg" },
	] },
] as const;

type Props = {
	onLaunchAction: (id: AppId) => void;
	onOpenFileAction: (catalogId: string) => void;
	onRestoreDecorationsAction: () => void;
	onResetAction: () => void;
	canRestoreDecorations: boolean;
};

function menuItems(scope: Element) {
	return Array.from(scope.querySelectorAll<HTMLElement>('[role="menuitem"]'))
		.filter((item) => !item.matches(":disabled") && item.closest('[role="menu"]') === scope);
}

/** Native light-dismiss owns opening/closing; only menu navigation needs JavaScript. */
export function StartButton({ onLaunchAction, onOpenFileAction, onRestoreDecorationsAction, onResetAction, canRestoreDecorations }: Props) {
	const menu = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [group, setGroup] = useState<string | null>(null);

	function openGroup(label: string) {
		setGroup(label);
		requestAnimationFrame(() => menu.current?.querySelector<HTMLButtonElement>(".start-menu__submenu button")?.focus());
	}

	function onKey(event: KeyboardEvent<HTMLElement>) {
		const target = event.target as HTMLElement;
		const scope = target.closest('[role="menu"]');
		if (!scope) return;
		const items = menuItems(scope);
		const index = items.indexOf(target);
		const direction = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
		if (direction || event.key === "Home" || event.key === "End") {
			event.preventDefault();
			const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + direction + items.length) % items.length;
			items[next]?.focus();
		} else if (event.key === "ArrowRight" && target.dataset.group) {
			event.preventDefault();
			openGroup(target.dataset.group);
		} else if ((event.key === "ArrowLeft" || event.key === "Escape") && scope !== menu.current) {
			event.preventDefault();
			event.stopPropagation();
			menu.current?.querySelector<HTMLButtonElement>(`[data-group="${group}"]`)?.focus();
			setGroup(null);
		} else if (event.key === "Tab") {
			menu.current?.hidePopover();
		}
	}

	/** Hovering a plain item closes any open submenu, as in Win95. */
	function closeGroupOnHover(event: PointerEvent<HTMLElement>) {
		if (event.pointerType === "mouse") setGroup(null);
	}

	function run(action: () => void) {
		menu.current?.hidePopover();
		action();
	}

	return (
		<>
			<button type="button" className="start-btn chrome-raised" aria-label="Start" aria-haspopup="menu" aria-expanded={open} popoverTarget="start-menu"
				onKeyDown={(event) => {
					// Up and Down open the menu on its last or first item.
					if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
					event.preventDefault();
					menu.current!.showPopover();
					menuItems(menu.current!).at(event.key === "ArrowUp" ? -1 : 0)?.focus();
				}}>
				{/* eslint-disable-next-line @next/next/no-img-element -- small static brand mark */}
				<img className="start-btn__logo" src="/windows-flag.svg" alt="" width={16} height={14} draggable={false} />
				<span className="start-btn__label">Start</span>
			</button>
			<div ref={menu} id="start-menu" className="start-menu" popover="auto" role="menu" aria-label="Start menu" onKeyDown={onKey}
				onToggle={(event) => {
					setOpen(event.newState === "open");
					if (event.newState === "closed") setGroup(null);
				}}>
				<div className="start-menu__brand" aria-hidden="true">Windows<strong>95</strong></div>
				<div className="start-menu__items">
					{/* Only actual mouse movement changes groups: opening under a parked
					    pointer must not replace a keyboard-focused submenu. */}
					{GROUPS.map((entry) => (
						<div className="start-menu__group" key={entry.label} onPointerMove={(event) => {
							if (event.pointerType === "mouse") setGroup(entry.label);
						}}>
							<button type="button" role="menuitem" data-group={entry.label}
								aria-haspopup="menu" aria-expanded={group === entry.label}
								onClick={() => openGroup(entry.label)}>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={entry.icon} alt="" width={32} height={32} />
								<span>{entry.label}</span><span className="start-menu__arrow" aria-hidden="true" />
							</button>
							{group === entry.label && (
								<div className="start-menu__submenu" role="menu" aria-label={entry.label}>
									{entry.items.map((item) => (
										<button key={item.label} type="button" role="menuitem"
											onClick={() => run(() => "file" in item ? onOpenFileAction(item.file) : onLaunchAction(item.app))}>
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img src={item.icon} alt="" width={16} height={16} /><span>{item.label}</span>
										</button>
									))}
								</div>
							)}
						</div>
					))}
					<hr />
					<button type="button" role="menuitem" aria-label="Restore desktop decorations" disabled={!canRestoreDecorations}
						onPointerMove={closeGroupOnHover} onClick={() => run(onRestoreDecorationsAction)}>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src="/icons/computer.png" alt="" width={32} height={32} /><span>Restore Decorations</span>
					</button>
					<button type="button" role="menuitem" onPointerMove={closeGroupOnHover} onClick={() => run(onResetAction)}>
						<span className="start-menu__arrow" aria-hidden="true" /><span>Reset portfolio</span>
					</button>
					<a role="menuitem" href="/fonts/win95-ui-LICENSE.txt" target="_blank" rel="noopener noreferrer"
						onPointerMove={closeGroupOnHover} onClick={() => menu.current?.hidePopover()}>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src="/icons/notepad.svg" alt="" width={32} height={32} /><span>Font credits</span>
					</a>
				</div>
			</div>
		</>
	);
}
