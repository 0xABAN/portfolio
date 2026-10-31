import type { AppId } from "../windows";

export const GITHUB_USER = "0xABAN";
export const GITHUB_URL = `https://github.com/${GITHUB_USER}`;
const RESUME_URL = `${GITHUB_URL}/jobs/blob/main/resumes/default/Adam_Torres_Encarnacion_Resume.pdf`;

const DOCUMENTS = [
	{ id: "experience", name: "experience.exe", icon: "/icons/playstation.svg", open: "experience", type: "Application" },
	{ id: "resume", name: "resume.doc", icon: "/icons/document.png", href: RESUME_URL, type: "Microsoft Word Document" },
] as const;

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
	open?: AppId;
	href?: string;
};

export const SHELL_ITEMS: readonly ShellItem[] = [
	...DESK_ICONS.map((icon): ShellItem => {
		const folder = icon.id === "secrets";
		return {
			id: icon.id, name: icon.label, icon: icon.src,
			kind: folder ? "folder" : "shortcut",
			type: folder ? "File Folder" : "Shortcut",
			open: icon.open, href: icon.href,
		};
	}),
	...DOCUMENTS.map((file): ShellItem => ({ ...file, kind: "file" })),
];

export const ITEM_BY_ID = new Map(SHELL_ITEMS.map((item) => [item.id, item]));
const CATALOG_INDEX = new Map(SHELL_ITEMS.map((item, index) => [item.id, index]));

export function byCatalogOrder(a: { id: string }, b: { id: string }) {
	return CATALOG_INDEX.get(a.id)! - CATALOG_INDEX.get(b.id)!;
}
export const DESKTOP_PATH = "C:\\Windows\\Desktop";
export const BIN_ICON = { empty: "/icons/recycle-bin-empty.png", full: "/icons/recycle-bin-full.png" };

export const STORAGE_KEY = "portfolio.shell.v3";

export type ShellNode = { id: string; parentId: string };

export type RecycledEntry = { nodes: ShellNode[]; location: string; deletedAt: number };

export type ShellState = { nodes: ShellNode[]; entries: RecycledEntry[] };

export function initialShellState(): ShellState {
	return {
		nodes: SHELL_ITEMS.map((item) => ({ id: item.id, parentId: item.kind === "file" ? "secrets" : "desktop" })),
		entries: [],
	};
}

export function itemOf(node: ShellNode): ShellItem {
	return ITEM_BY_ID.get(node.id)!;
}

export function entryId(entry: RecycledEntry) {
	return entry.nodes[0].id;
}

export function shellPath(folders: readonly ShellNode[]) {
	return [DESKTOP_PATH, ...folders.map((node) => itemOf(node).name)].join("\\");
}

export function ancestorsOf(nodes: readonly ShellNode[], node: ShellNode): ShellNode[] {
	const ancestors: ShellNode[] = [];
	let parent = nodes.find((candidate) => candidate.id === node.parentId);
	while (parent) {
		ancestors.unshift(parent);
		parent = nodes.find((candidate) => candidate.id === parent!.parentId);
	}
	return ancestors;
}

function subtree(nodes: readonly ShellNode[], root: ShellNode) {
	return [root, ...nodes.filter((node) => ancestorsOf(nodes, node).includes(root))];
}

export function selectedRoots(state: ShellState, ids: readonly string[]) {
	const selected = new Set(ids);
	return state.nodes.filter((node) => selected.has(node.id) && !ancestorsOf(state.nodes, node).some((parent) => selected.has(parent.id)));
}

export function deleteNodes(state: ShellState, ids: readonly string[], now: number, permanent = false): ShellState {
	const entries = selectedRoots(state, ids).map((root) => ({
		nodes: subtree(state.nodes, root),
		location: shellPath(ancestorsOf(state.nodes, root)),
		deletedAt: now,
	}));
	const removed = new Set(entries.flatMap((entry) => entry.nodes.map((node) => node.id)));
	return {
		nodes: state.nodes.filter((node) => !removed.has(node.id)),
		entries: permanent ? state.entries : [...state.entries, ...entries],
	};
}

export function purgeEntries(state: ShellState, ids: readonly string[]): ShellState {
	return { ...state, entries: state.entries.filter((entry) => !ids.includes(entryId(entry))) };
}

export function restoreEntries(state: ShellState, ids: readonly string[], destination?: string): ShellState {
	const restored = state.entries.filter((entry) => ids.includes(entryId(entry)));
	const roots = new Set(restored.map(entryId));
	const nodes = restored.flatMap((entry) => entry.nodes);
	const present = new Set(["desktop", ...state.nodes.map((node) => node.id), ...nodes.map((node) => node.id)]);
	const place = (node: ShellNode) => roots.has(node.id)
		? { ...node, parentId: destination ?? (present.has(node.parentId) ? node.parentId : "desktop") }
		: node;
	return { nodes: [...state.nodes, ...nodes.map(place)], entries: purgeEntries(state, ids).entries };
}

export function moveNodes(state: ShellState, ids: readonly string[], destination: string): ShellState {
	const roots = selectedRoots(state, ids);
	if (roots.some((root) => subtree(state.nodes, root).some((node) => node.id === destination))) {
		throw new Error("A folder cannot be moved into itself.");
	}
	return { ...state, nodes: state.nodes.map((node) => roots.includes(node) ? { ...node, parentId: destination } : node) };
}

export function parseShellState(raw: string | null): ShellState {
	if (raw === null) return initialShellState();
	const state = JSON.parse(raw) as ShellState;
	const known = (nodes: unknown) => Array.isArray(nodes) && nodes.every((node: ShellNode) => ITEM_BY_ID.has(node?.id) && typeof node.parentId === "string");
	if (!known(state?.nodes) || !Array.isArray(state.entries) || !state.entries.every((entry) => known(entry?.nodes) && entry.nodes.length > 0)) {
		throw new Error("The saved desktop is damaged.");
	}
	return state;
}
