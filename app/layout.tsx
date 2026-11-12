import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	metadataBase: new URL("https://advm.dev"),
	title: "portfolio",
	description: "Adam Torres Encarnacion's portfolio: a Windows 95 desktop you can poke around in.",
	openGraph: {
		images: [{
			url: "/og/beep-boop.gif",
			type: "image/gif",
			width: 1200,
			height: 630,
			alt: "Three dizzy cartoon bunnies with red stars circling their heads",
		}],
	},
	twitter: { card: "summary_large_image" },
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
