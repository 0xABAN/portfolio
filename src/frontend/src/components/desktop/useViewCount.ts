"use client";

import { useEffect, useState } from "react";

/** One POST per page load — survives React Strict Mode remount. */
let viewsPromise: Promise<number | null> | null = null;

function loadViews(): Promise<number | null> {
	if (!viewsPromise) {
		viewsPromise = fetch("/api/views", { method: "POST" })
			.then((r) => r.json())
			.then((d: { count?: number }) =>
				typeof d.count === "number" ? d.count : null,
			)
			.catch(() => null);
	}
	return viewsPromise;
}

/** Site view counter; null until the response lands. */
export function useViewCount() {
	const [views, setViews] = useState<number | null>(null);

	useEffect(() => {
		let alive = true;
		void loadViews().then((n) => {
			if (alive) setViews(n);
		});
		return () => {
			alive = false;
		};
	}, []);

	return views;
}
