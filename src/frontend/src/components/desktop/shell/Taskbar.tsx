"use client";

import { type RefCallback, useEffect, useRef, useState } from "react";
import { StartButton } from "./StartButton";
import type { AppId } from "../window/state";
import type { DesktopWindow } from "../window/layout";
import "./taskbar.css";

/** One POST per page load, so Strict Mode's remount does not count a view twice. Null if it fails. */
let viewsRequest: Promise<number | null> | null = null;

/** The site's view count; null until the response lands. */
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

/** "3:07 PM", with a plain space where some locales use a narrow one. */
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
	/** Boot trickle: chrome pieces appear once their id is revealed. */
	revealed: (id: string) => boolean;
};

/**
 * Tasks shrink to share the strip, as in Windows 95. If they still do not fit,
 * only the strip scrolls, so Start and the tray stay in reach.
 */
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
				// The CD Player's task names the track once SoundCloud has described it.
				const naming = isCdPlayer && trackLabel !== "";
				const label = naming ? trackLabel : w.title || w.id;
				return (
					<button key={w.id} type="button" className="task-btn chrome-raised" title={label}
						aria-label={naming ? `CD Player: ${label}` : undefined}
						data-task-id={w.id}
						aria-controls={`desktop-window-${w.id}`}
						aria-pressed={w.id === activeId}
						onClick={() => onActivateAction(w.id)}>
						{/* eslint-disable-next-line @next/next/no-img-element */}
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
