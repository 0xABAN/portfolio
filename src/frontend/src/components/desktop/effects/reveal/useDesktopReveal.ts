"use client";

import { useEffect, useMemo, useState } from "react";
import { DESKTOP_REVEAL_SCHEDULE } from "./desktopReveal";

const SCHEDULED = new Set(DESKTOP_REVEAL_SCHEDULE.map(({ id }) => id));

/** Whether each desktop item has appeared yet: scheduled items wait for their time, others show at once. */
export function useDesktopReveal(): (id: string) => boolean {
	const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());

	useEffect(() => {
		const timers = DESKTOP_REVEAL_SCHEDULE.map(({ id, at }) => window.setTimeout(() => {
			setRevealed((prev) => new Set(prev).add(id));
		}, at));
		return () => timers.forEach(window.clearTimeout);
	}, []);

	return useMemo(() => (id: string) => !SCHEDULED.has(id) || revealed.has(id), [revealed]);
}
