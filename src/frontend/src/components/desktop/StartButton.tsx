"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { WindowsLogo } from "./WindowsLogo";
import type { AppId } from "./windowState";
import "./start-menu.css";

const GROUPS = [
	{ label: "Programs", icon: "/icons/computer.png", items: [
		{ id: "me", label: "Paint", icon: "/paint/icon-16.png" },
		{ id: "terminal", label: "MS-DOS Prompt", icon: "/icons/terminal.svg" },
		{ id: "github", label: "Activity", icon: "/icons/code.svg" },
		{ id: "experience", label: "Experience", icon: "/icons/exe.png" },
	] },
	{ label: "Documents", icon: "/icons/folder.png", items: [
		{ id: "explorer", label: "secrets", icon: "/icons/folder.png" },
		{ id: "bio", label: "bio.txt", icon: "/icons/notepad.svg" },
	] },
] as const;

type Props = {
	onLaunchAction: (id: AppId) => void;
	onRestoreDecorationsAction: () => void;
	canRestoreDecorations: boolean;
};

function menuItems(scope: Element) {
	return Array.from(scope.querySelectorAll<HTMLElement>('[role="menuitem"]'))
		.filter((item) => !item.matches(":disabled") && item.closest('[role="menu"]') === scope);
}

/** Native light-dismiss owns opening/closing; only menu navigation needs JavaScript. */
export function StartButton({ onLaunchAction, onRestoreDecorationsAction, canRestoreDecorations }: Props) {
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

	function run(action: () => void) {
		menu.current?.hidePopover();
		action();
	}

	return (
		<>
			<button
				type="button"
				className="start-btn chrome-raised"
				aria-label="Start"
				aria-haspopup="menu"
				aria-expanded={open}
				popoverTarget="start-menu"
				onKeyDown={(event) => {
					if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
					event.preventDefault();
					menu.current?.showPopover();
					if (!menu.current) return;
					const items = menuItems(menu.current);
					items.at(event.key === "ArrowUp" ? -1 : 0)?.focus();
				}}
			>
				<WindowsLogo className="start-btn__logo" />
				<span className="start-btn__label">Start</span>
			</button>
			<div
				ref={menu}
				id="start-menu"
				className="start-menu"
				popover="auto"
				role="menu"
				aria-label="Start menu"
				onKeyDown={onKey}
				onToggle={(event) => {
					setOpen(event.newState === "open");
					if (event.newState === "closed") setGroup(null);
				}}
			>
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
										<button key={item.id} type="button" role="menuitem" onClick={() => run(() => onLaunchAction(item.id))}>
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
						onPointerMove={(event) => { if (event.pointerType === "mouse") setGroup(null); }} onClick={() => run(onRestoreDecorationsAction)}>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src="/icons/computer.png" alt="" width={32} height={32} /><span>Restore Decorations</span>
					</button>
					<a role="menuitem" href="/fonts/win95-ui-LICENSE.txt" target="_blank" rel="noopener noreferrer"
						onPointerMove={(event) => { if (event.pointerType === "mouse") setGroup(null); }}
						onClick={() => menu.current?.hidePopover()}>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src="/icons/notepad.svg" alt="" width={32} height={32} /><span>Font credits</span>
					</a>
				</div>
			</div>
		</>
	);
}
