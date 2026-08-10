"use client";

import { useEffect, useState } from "react";

/** POST /api/views once on mount; null until the response lands. */
export function useViewCount() {
	const [views, setViews] = useState<number | null>(null);

	useEffect(() => {
		let cancelled = false;
		void fetch("/api/views", { method: "POST" })
			.then((r) => r.json())
			.then((d: { count?: number }) => {
				if (!cancelled && typeof d.count === "number") setViews(d.count);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	return views;
}
