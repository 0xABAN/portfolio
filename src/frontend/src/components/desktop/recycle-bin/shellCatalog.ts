import { EXPLORER_FILES } from "../explorer/explorerData";
import type { AppId } from "../windowState";
import { GITHUB_URL } from "../windows";

export type DeskIcon = {
	id: string;
	label: string;
	src: string;
	href?: string;
	open?: AppId;
};

function game(id: string, label: string, href: string): DeskIcon {
	return { id, label, src: `/icons/games/${id}.png`, href };
}

export const DESK_ICONS: DeskIcon[] = [
	game("hollow-knight", "Hollow Knight", "https://store.steampowered.com/app/367520/Hollow_Knight/"),
	game("silksong", "Silksong", "https://store.steampowered.com/app/1030300/Hollow_Knight_Silksong/"),
	game("terraria", "Terraria", "https://store.steampowered.com/app/105600/Terraria/"),
	game("roblox", "Roblox", "https://www.roblox.com/"),
	game("persona-3-reload", "Persona 3 Reload", "https://store.steampowered.com/app/2161700/Persona_3_Reload/"),
	game("persona-5-royal", "Persona 5 Royal", "https://store.steampowered.com/app/1687950/Persona_5_Royal/"),
	game("undertale", "Undertale", "https://store.steampowered.com/app/391540/Undertale/"),
	{ id: "social-github", label: "GitHub", src: "/icons/social/github.svg", href: GITHUB_URL },
	{ id: "social-linkedin", label: "LinkedIn", src: "/icons/social/linkedin.svg", href: "https://www.linkedin.com/in/adam-torres-encarnacion/" },
	{ id: "social-twitter", label: "Twitter", src: "/icons/social/twitter.svg", href: "https://x.com/0xABANN" },
	{ id: "cd-player-icon", label: "CD Player", src: "/icons/cd.png", open: "cd-player" },
	{ id: "secrets", label: "secrets", src: "/icons/folder.png", open: "explorer" },
];

export type ShellItem = {
	id: string;
	name: string;
	icon: string;
	kind: "shortcut" | "folder" | "file";
	type: string;
	bytes: number;
	open?: AppId;
	href?: string;
};

/** Logical sizes belong to the simulated C: drive, not network asset sizes. */
export const SHELL_ITEMS: readonly ShellItem[] = [
	...DESK_ICONS.map((icon): ShellItem => ({
		id: icon.id, name: icon.label, icon: icon.src,
		kind: icon.id === "secrets" ? "folder" : "shortcut",
		type: icon.id === "secrets" ? "File Folder" : "Shortcut",
		bytes: icon.id === "secrets" ? 0 : 1024,
		open: icon.open, href: icon.href,
	})),
	...EXPLORER_FILES.map((file): ShellItem => ({
		id: file.id, name: file.name, icon: file.icon, kind: "file",
		type: file.id === "bio" ? "Text Document" : file.id === "resume" ? "Microsoft Word Document" : "Application",
		bytes: file.id === "bio" ? 4096 : file.id === "resume" ? 768 * 1024 : 512 * 1024,
		open: file.action,
	})),
];

export const ITEM_BY_ID = new Map(SHELL_ITEMS.map((item) => [item.id, item]));
export const DESKTOP_PATH = "C:\\Windows\\Desktop";
export const BIN_ICON = { empty: "/icons/recycle-bin-empty.png", full: "/icons/recycle-bin-full.png" };

export function formatBytes(bytes: number) {
	return bytes < 1024 ? `${bytes} bytes` : `${Math.ceil(bytes / 1024).toLocaleString("en-US")} KB`;
}
