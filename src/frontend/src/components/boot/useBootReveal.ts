"use client";

import { useEffect, useState } from "react";
import { BOOT_SCHEDULE, SKIP_INTRO } from "./bootReveal";

const ALL_REVEALED: ReadonlySet<string> = new Set(
	BOOT_SCHEDULE.map((s) => s.id),
);

/** Grows a Set of reveal ids over the boot schedule. */
export function useBootReveal(): ReadonlySet<string> {
	const [revealed, setRevealed] = useState<ReadonlySet<string>>(() =>
		SKIP_INTRO ? ALL_REVEALED : new Set(),
	);

	useEffect(() => {
		if (SKIP_INTRO) return;
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
