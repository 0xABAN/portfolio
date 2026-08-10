"use client";

import { useEffect, useState } from "react";
import { StartButton } from "./StartButton";
import { GITHUB_URL } from "./windows";

function formatClock(d: Date) {
	return d
		.toLocaleTimeString(undefined, {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		})
		.replace(/\u202f/g, " "); // narrow no-break space some locales use
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
		id: "x",
		label: "X",
		href: "https://x.com/0xABANN",
		icon: "/icons/x.svg",
	},
	{
		id: "spotify",
		label: "Spotify",
		href: "https://open.spotify.com/user/31bqqior62rs6m4rewpadlcws2oa",
		icon: "/icons/spotify.svg",
	},
] as const;

function openExternal(href: string) {
	window.open(href, "_blank", "noopener,noreferrer");
}

export function Taskbar() {
	const [clock, setClock] = useState(() => formatClock(new Date()));
	const [muted, setMuted] = useState(true);

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
				</div>
			</div>
			<div className="taskbar__right">
				{/* cone from Wikimedia Mute_Icon (public domain); X only while muted */}
				<button
					type="button"
					className={`taskbar__speaker chrome-raised${muted ? " taskbar__speaker--muted" : ""}`}
					title={muted ? "Unmute" : "Mute"}
					aria-label={muted ? "Unmute" : "Mute"}
					aria-pressed={!muted}
					onClick={() => setMuted((m) => !m)}
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
