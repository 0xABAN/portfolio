"use client";

import { useEffect, useState } from "react";
import { DESKTOP_REVEAL_SCHEDULE } from "./desktopReveal";

/** Reveals desktop items according to the staggered desktop schedule. */
export function useDesktopReveal(): ReadonlySet<string> {
	const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());

	useEffect(() => {
		const timers = DESKTOP_REVEAL_SCHEDULE.map(({ id, at }) =>
			window.setTimeout(() => {
				setRevealed((prev) => {
					if (prev.has(id)) return prev;
					const next = new Set(prev);
					next.add(id);
					return next;
				});
			}, at),
		);
		return () => {
			for (const t of timers) window.clearTimeout(t);
		};
	}, []);

	return revealed;
}
