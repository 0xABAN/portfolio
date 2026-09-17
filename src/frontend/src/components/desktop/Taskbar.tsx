"use client";

import { type ComponentProps, useEffect, useRef, useState } from "react";
import { CdPlayerPop } from "./CdPlayerPop";
import { StartButton } from "./StartButton";
import type { AppId } from "./windowState";
import { useTaskbarAudio } from "./useTaskbarAudio";
import { useViewCount } from "./useViewCount";
import { TASKBAR_H, type DesktopWindow } from "./windows";
import "./taskbar.css";

function formatClock(d: Date) {
	return d
		.toLocaleTimeString(undefined, {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		})
		.replace(/\u202f/g, " ");
}

const viewFmt = new Intl.NumberFormat("en-US");

function TaskButton({ icon, children, ...props }: ComponentProps<"button"> & { icon?: string }) {
	return (
		<button type="button" className="task-btn chrome-raised" {...props}>
			{icon ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img className="task-btn__icon" src={icon} alt="" width={16} height={16} draggable={false} />
			) : null}
			<span className="task-btn__label">{children}</span>
		</button>
	);
}

type Props = {
	tasks: DesktopWindow[];
	activeId?: string;
	onActivateAction: (id: string) => void;
	onLaunchAction: (id: AppId) => void;
	onRestoreDecorationsAction: () => void;
	canRestoreDecorations: boolean;
	/** Boot trickle — when set, chrome pieces appear only if id is in the set. */
	revealed?: ReadonlySet<string>;
};

/** Only the task strip scrolls; Start, music and the tray remain reachable. */
function WindowTasks({ tasks, activeId, onActivateAction }: Pick<Props, "tasks" | "activeId" | "onActivateAction">) {
	const strip = useRef<HTMLDivElement>(null);
	const [arrows, setArrows] = useState({ previous: false, next: false });

	useEffect(() => {
		const el = strip.current;
		if (!el) return;
		const measure = () => {
			const previous = el.scrollLeft > 1;
			const next = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
			setArrows((old) => old.previous === previous && old.next === next ? old : { previous, next });
		};
		const resize = new ResizeObserver(measure);
		resize.observe(el);
		el.addEventListener("scroll", measure);
		measure();
		return () => {
			resize.disconnect();
			el.removeEventListener("scroll", measure);
		};
	}, [tasks.length]);

	useEffect(() => {
		strip.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
	}, [activeId]);

	return (
		<div className="taskbar__task-area">
			<div ref={strip} id="task-strip" className="taskbar__tasks" role="group" aria-label="Open applications"
				onFocusCapture={(event) => (event.target as HTMLElement).scrollIntoView({ block: "nearest", inline: "nearest" })}>
				{tasks.map((w) => {
					const label = w.title || (w.kind === "github" ? "GitHub Activity" : w.id);
					return (
						<TaskButton
							key={w.id}
							icon={w.icon || (w.kind === "github" ? "/icons/github.svg" : undefined)}
							title={label}
							data-task-id={w.id}
							aria-controls={`desktop-window-${w.id}`}
							aria-pressed={w.id === activeId}
							onClick={() => onActivateAction(w.id)}
						>
							{label}
						</TaskButton>
					);
				})}
			</div>
			{(arrows.previous || arrows.next) && (
				<div className="taskbar__scroll-controls">
					{(["previous", "next"] as const).map((direction) => (
						<button key={direction} type="button" className={`task-scroll-btn task-scroll-btn--${direction} chrome-raised`}
							aria-label={direction === "previous" ? "Previous tasks" : "Next tasks"}
							aria-controls="task-strip" disabled={!arrows[direction]}
							onClick={() => strip.current?.scrollBy({ left: (direction === "previous" ? -1 : 1) * strip.current.clientWidth })} />
					))}
				</div>
			)}
		</div>
	);
}

export function Taskbar({
	tasks,
	activeId,
	onActivateAction,
	onLaunchAction,
	onRestoreDecorationsAction,
	canRestoreDecorations,
	revealed,
}: Props) {
	const show = (id: string) => !revealed || revealed.has(id);
	const [clock, setClock] = useState(() => formatClock(new Date()));
	const [cdOpen, setCdOpen] = useState(false);
	const [cdPos, setCdPos] = useState({ left: 0, top: 0, bottom: TASKBAR_H + 4 });
	const [cdDragged, setCdDragged] = useState(false);
	const cdWrapRef = useRef<HTMLDivElement | null>(null);
	const cdHide = useRef<number | null>(null);
	const cdPinned = useRef(false);
	const views = useViewCount();
	const {
		muted,
		playing,
		track,
		trackLabel,
		volume,
		bindElapsed,
		toggleMute,
		togglePlay,
		playPrev,
		playNext,
		stop,
		setVolume,
	} = useTaskbarAudio();

	useEffect(() => {
		const tick = () => setClock(formatClock(new Date()));
		tick();
		const id = window.setInterval(tick, 15_000);
		return () => window.clearInterval(id);
	}, []);

	useEffect(() => () => {
		if (cdHide.current != null) window.clearTimeout(cdHide.current);
	}, []);

	function clearCdHide() {
		if (cdHide.current == null) return;
		window.clearTimeout(cdHide.current);
		cdHide.current = null;
	}

	function openCdPop() {
		clearCdHide();
		if (!cdDragged) {
			const r = cdWrapRef.current?.getBoundingClientRect();
			if (r) {
				setCdPos({
					left: Math.max(4, Math.min(Math.round(r.left), window.innerWidth - 344)),
					top: 0,
					bottom: Math.round(window.innerHeight - r.top + 4),
				});
			}
		}
		setCdOpen(true);
	}

	function closeCdPop() {
		if (cdPinned.current || cdWrapRef.current?.contains(document.activeElement)) return;
		clearCdHide();
		// Allow the pointer to cross the gap without closing keyboard-focused controls.
		cdHide.current = window.setTimeout(() => {
			cdHide.current = null;
			if (!cdPinned.current && !cdWrapRef.current?.contains(document.activeElement)) setCdOpen(false);
		}, 120);
	}

	return (
		<footer className="taskbar" role="contentinfo" aria-label="Taskbar">
			<div className="taskbar__left">
				{show("tb:start") && (
					<StartButton onLaunchAction={onLaunchAction} onRestoreDecorationsAction={onRestoreDecorationsAction} canRestoreDecorations={canRestoreDecorations} />
				)}
				{show("tb:cd") && (
					<div ref={cdWrapRef} className="cd-wrap"
						onMouseEnter={openCdPop} onMouseLeave={closeCdPop}
						onFocusCapture={openCdPop}
						onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) closeCdPop(); }}
						onKeyDown={(event) => {
							if (event.key !== "Escape") return;
							event.stopPropagation();
							clearCdHide();
							event.currentTarget.querySelector<HTMLButtonElement>(".task-btn--cd")?.focus();
							setCdOpen(false);
						}}>
						<TaskButton icon="/icons/cd.png" className="task-btn task-btn--cd chrome-raised"
							title={trackLabel} aria-label={playing ? "Pause music" : "Play music"}
							aria-pressed={playing} aria-haspopup="dialog" aria-expanded={cdOpen} aria-controls="cd-player-pop" onClick={togglePlay}>
							{trackLabel}{"  "}<span ref={bindElapsed}>0:00</span>
						</TaskButton>
						{cdOpen && (
							<CdPlayerPop
								track={track}
								playing={playing}
								left={cdPos.left}
								top={cdPos.top}
								bottom={cdPos.bottom}
								docked={!cdDragged}
								volume={volume}
								onTogglePlayAction={togglePlay}
								onPrevAction={playPrev}
								onNextAction={playNext}
								onVolumeAction={setVolume}
								onStopAction={stop}
								onMoveAction={(left, top) => {
									setCdDragged(true);
									setCdPos({ left, top, bottom: 0 });
								}}
								onDragStartAction={() => { cdPinned.current = true; }}
								onDragEndAction={() => { cdPinned.current = false; }}
							/>
						)}
					</div>
				)}
				<WindowTasks tasks={tasks} activeId={activeId} onActivateAction={onActivateAction} />
			</div>
			<div className="taskbar__right">
				{show("tb:views") && views != null && (
					<span className="taskbar__views" title="Site views" aria-label={`${viewFmt.format(views)} site views`} suppressHydrationWarning>
						{viewFmt.format(views)}<span className="taskbar__views-label"> views</span>
					</span>
				)}
				{show("tb:tray") && (
					<div className="taskbar__tray" role="group" aria-label="System tray">
						{show("tb:speaker") && (
							<button type="button" className="taskbar__speaker" title={muted ? "Unmute" : "Mute"}
								aria-label={muted ? "Unmute" : "Mute"} aria-pressed={!muted} onClick={toggleMute}>
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
