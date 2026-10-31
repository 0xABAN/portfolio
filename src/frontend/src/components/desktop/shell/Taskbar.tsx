import { type KeyboardEvent, type PointerEvent, type RefCallback, useEffect, useRef, useState } from "react";
import type { AppId, DesktopWindow } from "../windows";
import "./taskbar.css";

const GROUPS = [
	{ label: "Programs", icon: "/icons/computer.png", items: [
		{ app: "me", label: "Paint", icon: "/icons/paint.png" },
		{ app: "terminal", label: "MS-DOS Prompt", icon: "/icons/terminal.svg" },
		{ app: "github", label: "Activity", icon: "/icons/code.svg" },
		{ app: "cd-player", label: "CD Player", icon: "/icons/cd.png" },
	] },
	{ label: "Documents", icon: "/icons/folder.png", items: [
		{ app: "explorer", label: "secrets", icon: "/icons/folder.png" },
		{ file: "resume", label: "resume.doc", icon: "/icons/notepad.svg" },
	] },
] as const;

type StartProps = {
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

function StartButton({ onLaunchAction, onOpenFileAction, onRestoreDecorationsAction, onResetAction, canRestoreDecorations }: StartProps) {
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
					if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
					event.preventDefault();
					menu.current!.showPopover();
					menuItems(menu.current!).at(event.key === "ArrowUp" ? -1 : 0)?.focus();
				}}>
				<img className="start-btn__logo" src="/icons/windows.svg" alt="" width={16} height={14} draggable={false} />
				<span className="start-btn__label">Start</span>
			</button>
			<div ref={menu} id="start-menu" className="start-menu" popover="auto" role="menu" aria-label="Start menu" onKeyDown={onKey}
				onToggle={(event) => {
					setOpen(event.newState === "open");
					if (event.newState === "closed") setGroup(null);
				}}>
				<div className="start-menu__brand" aria-hidden="true">Windows<strong>95</strong></div>
				<div className="start-menu__items">
					{GROUPS.map((entry) => (
						<div className="start-menu__group" key={entry.label} onPointerMove={(event) => {
							if (event.pointerType === "mouse") setGroup(entry.label);
						}}>
							<button type="button" role="menuitem" data-group={entry.label}
								aria-haspopup="menu" aria-expanded={group === entry.label}
								onClick={() => openGroup(entry.label)}>
								<img src={entry.icon} alt="" width={32} height={32} />
								<span>{entry.label}</span><span className="start-menu__arrow" aria-hidden="true" />
							</button>
							{group === entry.label && (
								<div className="start-menu__submenu" role="menu" aria-label={entry.label}>
									{entry.items.map((item) => (
										<button key={item.label} type="button" role="menuitem"
											onClick={() => run(() => "file" in item ? onOpenFileAction(item.file) : onLaunchAction(item.app))}>
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
						<img src="/icons/computer.png" alt="" width={32} height={32} /><span>Restore Decorations</span>
					</button>
					<button type="button" role="menuitem" onPointerMove={closeGroupOnHover} onClick={() => run(onResetAction)}>
						<img src="/icons/recycle-bin-empty.png" alt="" width={32} height={32} /><span>Reset portfolio</span>
					</button>
				</div>
			</div>
		</>
	);
}

let viewsRequest: Promise<number | null> | null = null;

function useViewCount() {
	const [views, setViews] = useState<number | null>(null);

	useEffect(() => {
		let alive = true;
		viewsRequest ??= fetch("/api/views", { method: "POST" })
			.then((response) => response.json())
			.then((data: { count?: number }) => (typeof data.count === "number" ? data.count : null))
			.catch(() => null);
		viewsRequest.then((count) => { if (alive) setViews(count); });
		return () => { alive = false; };
	}, []);

	return views;
}

const formatClock = (date: Date) => date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\u202f/g, " ");
const viewFormat = new Intl.NumberFormat("en-US");

type Props = {
	muted: boolean;
	onToggleMuteAction: () => void;
	trackLabel: string;
	bindElapsed: RefCallback<HTMLSpanElement>;
	tasks: DesktopWindow[];
	activeId?: string;
	onActivateAction: (id: string) => void;
	onLaunchAction: (id: AppId) => void;
	onOpenFileAction: (catalogId: string) => void;
	onRestoreDecorationsAction: () => void;
	onResetAction: () => void;
	canRestoreDecorations: boolean;
	revealed: (id: string) => boolean;
};

function WindowTasks({ tasks, activeId, onActivateAction, trackLabel, bindElapsed }: Pick<Props, "tasks" | "activeId" | "onActivateAction" | "trackLabel" | "bindElapsed">) {
	const strip = useRef<HTMLDivElement>(null);

	useEffect(() => {
		strip.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
	}, [activeId]);

	return (
		<div ref={strip} className="taskbar__tasks" role="group" aria-label="Open applications"
			onFocusCapture={(event) => (event.target as HTMLElement).scrollIntoView({ block: "nearest", inline: "nearest" })}>
			{tasks.map((w) => {
				const isCdPlayer = w.id === "cd-player";
				const naming = isCdPlayer && trackLabel !== "";
				const label = naming ? trackLabel : w.title || w.id;
				return (
					<button key={w.id} type="button" className="task-btn chrome-raised" title={label}
						aria-label={naming ? `CD Player: ${label}` : undefined}
						data-task-id={w.id}
						aria-controls={`desktop-window-${w.id}`}
						aria-pressed={w.id === activeId}
						onClick={() => onActivateAction(w.id)}>
						{w.icon && <img className="task-btn__icon" src={w.icon} alt="" width={16} height={16} draggable={false} />}
						<span className="task-btn__label">{label}</span>
						{isCdPlayer && <span className="task-btn__elapsed" ref={bindElapsed}>0:00</span>}
					</button>
				);
			})}
		</div>
	);
}

export function Taskbar({ muted, onToggleMuteAction, revealed: show, ...props }: Props) {
	const [clock, setClock] = useState(() => formatClock(new Date()));
	const views = useViewCount();

	useEffect(() => {
		const id = window.setInterval(() => setClock(formatClock(new Date())), 15_000);
		return () => window.clearInterval(id);
	}, []);

	return (
		<footer className="taskbar" role="contentinfo" aria-label="Taskbar">
			<div className="taskbar__left">
				{show("tb:start") && <StartButton {...props} />}
				<WindowTasks {...props} />
			</div>
			<div className="taskbar__right">
				{show("tb:views") && views != null && (
					<span className="taskbar__views" title="Site views" aria-label={`${viewFormat.format(views)} site views`} suppressHydrationWarning>
						{viewFormat.format(views)}<span className="taskbar__views-label"> views</span>
					</span>
				)}
				{show("tb:tray") && (
					<div className="taskbar__tray" role="group" aria-label="System tray">
						{show("tb:speaker") && (
							<button type="button" className="taskbar__speaker" title={muted ? "Unmute" : "Mute"}
								aria-label={muted ? "Unmute" : "Mute"} aria-pressed={!muted} onClick={onToggleMuteAction}>
								<svg viewBox="0 0 16 16" width={16} height={16} shapeRendering="crispEdges" aria-hidden="true">
									<path fill="#b0b0b0" stroke="#000" d="M1 6h3l4-4v12l-4-4H1z" />
									<path fill="#fff" d="M1 6h3v1H1zM7 3h1v9H7z" />
									{muted ? (
										<path stroke="#ff3030" d="m10 5 5 6m0-6-5 6" />
									) : (
										<path fill="none" stroke="#c0c0c0" d="M10 5h1v1h1v4h-1v1h-1M12 2h1v1h1v2h1v6h-1v2h-1v1h-1" />
									)}
								</svg>
							</button>
						)}
						<span className="taskbar__clock">{clock}</span>
					</div>
				)}
			</div>
		</footer>
	);
}
