import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "portfolio",
	icons: {
		icon: [{ url: "/icons/computer.png", type: "image/png" }],
		shortcut: "/favicon.ico",
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
