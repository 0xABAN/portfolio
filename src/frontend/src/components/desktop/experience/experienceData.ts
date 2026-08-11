import { GITHUB_URL } from "../windows";

export type Project = {
	id: string;
	fileName: string;
	title: string;
	blurb: string;
	src?: string;
	href?: string;
};

export const WORK: readonly Project[] = [
	{
		id: "amazon",
		fileName: "amazon.md",
		title: "amazon",
		blurb: "swe intern @ amazon summer 2026",
		src: "/photos/amazon.png",
	},
	{
		id: "ibm",
		fileName: "ibm.md",
		title: "ibm",
		blurb: "ai eng co-op @ ibm 2025-2026",
		src: "/photos/ibm.png",
	},
] as const;

export const PROJECTS: readonly Project[] = [
	{
		id: "copycat",
		fileName: "copycat.md",
		title: "copycat",
		blurb:
			"mcp to copy sites' visuals as DESIGN.md's for later use. very useful :)",
		src: "/photos/copycat.jpg",
		href: `${GITHUB_URL}/copycat`,
	},
	{
		id: "definitive",
		fileName: "definitive_multiplayer.md",
		title: "definitive multiplayer",
		blurb: "terraria multiplayer add-on i built in a week, 1k+ downloads",
		src: "/photos/definitive-multiplayer.png",
		href: `${GITHUB_URL}/DefinitiveMultiplayer`,
	},
	{
		id: "fit-check",
		fileName: "fit-check.md",
		title: "fit-check",
		blurb: "fit check",
		src: "/photos/fit-check.jpg",
		href: `${GITHUB_URL}/fit-check`,
	},
	{
		id: "maestro",
		fileName: "maestro.md",
		title: "maestro",
		blurb: "ByteDance 2nd place (solo hacker)",
		src: "/photos/maestro.jpg",
		href: `${GITHUB_URL}/maestro`,
	},
	{
		id: "simulacra",
		fileName: "simulacra.md",
		title: "simulacra",
		blurb: "K2 Think V2 1st place @ YHacks",
		src: "/photos/simulacra.jpg",
		href: `${GITHUB_URL}/simulacra`,
	},
	{
		id: "terrar",
		fileName: "terrar.ai.md",
		title: "terrar.ai",
		blurb: "xAI 1st place @ HackPrinceton",
		src: "/photos/terrar.jpg",
		href: "https://github.com/SlothfulDreams/terrar.ai",
	},
] as const;

export const ALL_ITEMS: readonly Project[] = [...WORK, ...PROJECTS];

export const EXP_MENUS = ["File", "Edit", "View", "Help"] as const;

export const EXP_TOOLBAR = [
	"Back",
	"Forward",
	"Up",
	"Search",
	"Delete",
	"Views",
] as const;
