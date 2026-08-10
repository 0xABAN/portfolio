"use client";

import { useEffect, useState } from "react";
import { StartButton } from "./StartButton";
import { useTaskbarAudio } from "./useTaskbarAudio";
import { useViewCount } from "./useViewCount";
import { GITHUB_URL } from "./windows";

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

function openExternal(href: string) {
	window.open(href, "_blank", "noopener,noreferrer");
}

const viewFmt = new Intl.NumberFormat("en-US");

export function Taskbar() {
	const [clock, setClock] = useState(() => formatClock(new Date()));
	const views = useViewCount();
	const { muted, playing, trackLabel, elapsedElRef, toggleMute, togglePlay } =
		useTaskbarAudio();

	useEffect(() => {
		const tick = () => setClock(formatClock(new Date()));
		tick();
		const id = window.setInterval(tick, 15_000);
		return () => window.clearInterval(id);
	}, []);

	return (
		<footer className="taskbar" role="contentinfo" aria-label="Taskbar">
			<div className="taskbar__left">
				<StartButton />
				<div className="taskbar__tasks">
					{LINKS.map((link) => (
						<button
							key={link.id}
							type="button"
							className="task-btn chrome-raised"
							title={link.label}
							onClick={() => openExternal(link.href)}
						>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								className="task-btn__icon"
								src={link.icon}
								alt=""
								width={16}
								height={16}
								draggable={false}
							/>
							<span className="task-btn__label">{link.label}</span>
						</button>
					))}
					<button
						type="button"
						className={`task-btn task-btn--spotify chrome-raised${playing ? " task-btn--active" : ""}`}
						title={trackLabel}
						aria-label={playing ? "Pause music" : "Play music"}
						aria-pressed={playing}
						onClick={togglePlay}
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							className="task-btn__icon"
							src="/icons/spotify.svg"
							alt=""
							width={16}
							height={16}
							draggable={false}
						/>
						<span className="task-btn__label">
							{trackLabel}
							{"  "}
							<span ref={elapsedElRef}>0:00</span>
						</span>
					</button>
				</div>
			</div>
			<div className="taskbar__right">
				{views != null && (
					<span
						className="taskbar__views"
						title="Site views"
						suppressHydrationWarning
					>
						{viewFmt.format(views)} views
					</span>
				)}
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
				<div className="taskbar__tray chrome-sunken" aria-label="System tray">
					<span className="taskbar__clock">{clock}</span>
				</div>
			</div>
		</footer>
	);
}
