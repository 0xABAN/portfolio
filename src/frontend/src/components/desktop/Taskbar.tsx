"use client";

import { type ComponentProps, useEffect, useRef, useState } from "react";
import { CdPlayerPop } from "./CdPlayerPop";
import { StartButton } from "./StartButton";
import type { AppId } from "./windowState";
import { useTaskbarAudio } from "./useTaskbarAudio";
import { useViewCount } from "./useViewCount";
import { GITHUB_URL, type DesktopWindow } from "./windows";

function formatClock(d: Date) {
	return d
		.toLocaleTimeString(undefined, {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		})
		.replace(/\u202f/g, " ");
}

const LINKS = [
	{
		id: "github",
		label: "GitHub",
		href: GITHUB_URL,
		icon: "/icons/github.svg",
	},
	{
		id: "linkedin",
		label: "LinkedIn",
		href: "https://www.linkedin.com/in/adam-torres-encarnacion/",
		icon: "/icons/linkedin.svg",
	},
	{
		id: "twitter",
		label: "Twitter",
		href: "https://x.com/0xABANN",
		icon: "/icons/x.svg",
	},
] as const;

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

export function Taskbar({ tasks, activeId, onActivateAction, onLaunchAction, onRestoreDecorationsAction, canRestoreDecorations, revealed }: Props) {
	const show = (id: string) => !revealed || revealed.has(id);
	const [clock, setClock] = useState(() => formatClock(new Date()));
	const [cdOpen, setCdOpen] = useState(false);
	const [cdPos, setCdPos] = useState({ left: 0, top: 0, bottom: 40 });
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

	useEffect(
		() => () => {
			if (cdHide.current != null) window.clearTimeout(cdHide.current);
		},
		[],
	);

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
					left: Math.round(r.left),
					top: 0,
					bottom: Math.round(window.innerHeight - r.top + 4),
				});
			}
		}
		setCdOpen(true);
	}

	function closeCdPop() {
		if (cdPinned.current) return;
		clearCdHide();
		// brief delay so pointer can cross into the popup
		cdHide.current = window.setTimeout(() => {
			cdHide.current = null;
			if (!cdPinned.current) setCdOpen(false);
		}, 120);
	}

	return (
		<footer className="taskbar" role="contentinfo" aria-label="Taskbar">
			<div className="taskbar__left">
				{show("tb:start") ? <StartButton onLaunchAction={onLaunchAction} onRestoreDecorationsAction={onRestoreDecorationsAction} canRestoreDecorations={canRestoreDecorations} /> : null}
				<div className="taskbar__tasks">
					{LINKS.filter((link) => show(`tb:${link.id}`)).map((link) => (
						<TaskButton
							key={link.id}
							icon={link.icon}
							title={link.label}
							onClick={() => window.open(link.href, "_blank", "noopener,noreferrer")}
						>
							{link.label}
						</TaskButton>
					))}
					{show("tb:cd") ? (
						<div
							ref={cdWrapRef}
							className="cd-wrap"
							onMouseEnter={openCdPop}
							onMouseLeave={closeCdPop}
						>
							{cdOpen ? (
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
									onMoveAction={(l, t) => {
										setCdDragged(true);
										setCdPos({ left: l, top: t, bottom: 0 });
									}}
									onDragStartAction={() => {
										cdPinned.current = true;
									}}
									onDragEndAction={() => {
										cdPinned.current = false;
									}}
								/>
							) : null}
							<TaskButton
								icon="/icons/cd.png"
								className={`task-btn task-btn--cd chrome-raised${playing ? " task-btn--active" : ""}`}
								title={trackLabel}
								aria-label={playing ? "Pause music" : "Play music"}
								aria-pressed={playing}
								onClick={togglePlay}
							>
								{trackLabel}{"  "}<span ref={bindElapsed}>0:00</span>
							</TaskButton>
						</div>
					) : null}
					{tasks.map((w) => {
						// genesis github keeps an empty titlebar but needs a task tab name
						const label =
							w.title || (w.kind === "github" ? "GitHub Activity" : w.id);
						return (
							<TaskButton
								key={w.id}
								icon={w.icon}
								className={`task-btn chrome-raised${w.id === activeId ? " task-btn--active" : ""}`}
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
			</div>
			<div className="taskbar__right">
				{show("tb:views") && views != null ? (
					<span
						className="taskbar__views"
						title="Site views"
						suppressHydrationWarning
					>
						{viewFmt.format(views)} views
					</span>
				) : null}
				{show("tb:speaker") ? (
					<button
						type="button"
						className={`taskbar__speaker chrome-raised${muted ? " taskbar__speaker--muted" : ""}`}
						title={muted ? "Unmute" : "Mute"}
						aria-label={muted ? "Unmute" : "Mute"}
						aria-pressed={!muted}
						onClick={toggleMute}
					>
						<svg
							className="taskbar__speaker-svg"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 75 75"
							width={16}
							height={16}
							aria-hidden
						>
							<path
								d="m39 14-17 15H6v19h16l17 15z"
								fill="currentColor"
								stroke="currentColor"
								strokeWidth={5}
								strokeLinejoin="round"
							/>
							<path
								className="taskbar__speaker-wave taskbar__speaker-wave--1"
								d="M48 28c4 4 4 15 0 19"
								fill="none"
								stroke="currentColor"
								strokeWidth={5}
								strokeLinecap="round"
							/>
							<path
								className="taskbar__speaker-wave taskbar__speaker-wave--2"
								d="M56 22c7 7 7 24 0 31"
								fill="none"
								stroke="currentColor"
								strokeWidth={5}
								strokeLinecap="round"
							/>
							{muted && (
								<path
									d="m49 26 20 24m0-24-20 24"
									fill="none"
									stroke="#c00"
									strokeWidth={5}
									strokeLinecap="round"
								/>
							)}
						</svg>
					</button>
				) : null}
				{show("tb:tray") ? (
					<div className="taskbar__tray chrome-sunken" aria-label="System tray">
						<span className="taskbar__clock">{clock}</span>
					</div>
				) : null}
			</div>
		</footer>
	);
}
