"use client";

import dynamic from "next/dynamic";

// Client-only boot + desktop (avoids SSR hydration mismatch)
const Boot = dynamic(
	() => import("@/components/boot/Boot").then((m) => m.Boot),
	{ ssr: false },
);

export default function Home() {
	return <Boot />;
}
