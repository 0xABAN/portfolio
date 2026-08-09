"use client";

import dynamic from "next/dynamic";

// Client-only: window-measured layout + GitHub calendar (avoids SSR hydration mismatch)
const Desktop = dynamic(
	() =>
		import("@/components/desktop/Desktop").then((m) => ({
			default: m.Desktop,
		})),
	{ ssr: false },
);

export default function Home() {
	return <Desktop />;
}
