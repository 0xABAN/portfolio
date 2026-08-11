"use client";

import { useEffect, useState } from "react";
import "./restarting.css";

const LINES = [
	"ATAPI CD-ROM: CD-ROM DRIVE",
	"Memory Test: 65536K OK",
	"",
	"Starting Windows 95...",
] as const;

const RESTART_MS = 3000;

type Props = {
	onDoneAction: () => void;
};

export function Restarting({ onDoneAction }: Props) {
	const [count, setCount] = useState(0);

	useEffect(() => {
		const step = RESTART_MS / (LINES.length + 1);
		const lineTimers = LINES.map((_, i) =>
			window.setTimeout(() => setCount(i + 1), step * (i + 1)),
		);
		const doneTimer = window.setTimeout(onDoneAction, RESTART_MS);
		return () => {
			for (const t of lineTimers) window.clearTimeout(t);
			window.clearTimeout(doneTimer);
		};
	}, [onDoneAction]);

	return (
		<div
			className="restarting"
			role="status"
			aria-live="polite"
			aria-label="Restarting"
		>
			{LINES.slice(0, count).map((line, i) => (
				<p key={i} className="restarting__line">
					{line || "\u00a0"}
				</p>
			))}
		</div>
	);
}
