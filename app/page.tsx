"use client";

import dynamic from "next/dynamic";

const Boot = dynamic(
	() => import("@/components/boot/Boot").then((m) => m.Boot),
	{ ssr: false },
);

export default function Home() {
	return <Boot />;
}
