import { GITHUB_URL } from "../../files/catalog";

export type Project = {
	id: string;
	title: string;
	blurb: string;
	src?: string;
	href?: string;
};

export const WORK: readonly Project[] = [
	{ id: "amazon", title: "amazon", blurb: "swe intern @ amazon summer 2026", src: "/photos/amazon.png" },
	{ id: "ibm", title: "ibm", blurb: "ai eng co-op @ ibm 2025-2026", src: "/photos/ibm.png" },
];

export const PROJECTS: readonly Project[] = [
	{ id: "yadl", title: "yadl", blurb: "yet another data labeler, but no clicking", src: "/photos/yadl.webp", href: `${GITHUB_URL}/YADL` },
	{ id: "definitive", title: "definitive multiplayer", blurb: "terraria multiplayer add-on i built in a week, 3k+ downloads", src: "/photos/definitive-multiplayer.png", href: `${GITHUB_URL}/DefinitiveMultiplayer` },
	{ id: "maestro", title: "maestro", blurb: "ByteDance 2nd place (solo hacker)", src: "/photos/maestro.jpg", href: `${GITHUB_URL}/maestro` },
	{ id: "github", title: "github", blurb: "everything else i've built", src: "/icons/social/github.svg", href: GITHUB_URL },
];
