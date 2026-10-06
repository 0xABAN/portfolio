"use client";

import { useEffect, useState } from "react";
import "./restarting.css";

const LINES = ["ATAPI CD-ROM: CD-ROM DRIVE", "Memory Test: 65536K OK", "", "Starting Windows 95..."];
const RESTART_MS = 900;

/** The POST lines appear one at a time, evenly over RESTART_MS, then the desktop starts. */
export function Restarting({ onDoneAction }: { onDoneAction: () => void }) {
	const [count, setCount] = useState(0);

	useEffect(() => {
		const step = RESTART_MS / (LINES.length + 1);
		const timers = [
			...LINES.map((_, i) => window.setTimeout(() => setCount(i + 1), step * (i + 1))),
			window.setTimeout(onDoneAction, RESTART_MS),
		];
		return () => timers.forEach(window.clearTimeout);
	}, [onDoneAction]);

	return (
		<div className="restarting" role="status" aria-live="polite" aria-label="Restarting">
			{LINES.slice(0, count).map((line, i) => <p key={i} className="restarting__line">{line || "\u00a0"}</p>)}
		</div>
	);
}
