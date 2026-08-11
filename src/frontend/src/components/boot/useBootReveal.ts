"use client";

import { useEffect, useState } from "react";
import { BOOT_SCHEDULE } from "./bootReveal";

/** Grows a Set of reveal ids over the boot schedule. */
export function useBootReveal(): ReadonlySet<string> {
	const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());

	useEffect(() => {
		const timers = BOOT_SCHEDULE.map(({ id, at }) =>
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
