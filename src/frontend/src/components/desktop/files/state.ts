import { DESKTOP_PATH, ITEM_BY_ID, SHELL_ITEMS, type ShellItem } from "./catalog";

/**
 * Bump when a catalog item is retired or the saved shape changes: loading
 * rejects unknown catalog IDs, so older saved desktops would fail to load.
 */
export const STORAGE_KEY = "portfolio.shell.v3";

/**
 * A catalog item and the folder it sits in. Each item exists once: on the
 * desktop, in a folder, or in the Recycle Bin. Its id is its catalog id.
 */
export type ShellNode = { id: string; parentId: string };

/** A deleted item and everything inside it, root first. Its id is the root's. */
export type RecycledEntry = { nodes: ShellNode[]; location: string; deletedAt: number };

export type ShellState = { nodes: ShellNode[]; entries: RecycledEntry[] };

export function initialShellState(): ShellState {
	return {
		// Documents start inside the secrets folder; everything else sits on the desktop.
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

/** The Windows path of a folder chain, from Desktop down. */
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

/** A node and everything inside it, the node first. */
function subtree(nodes: readonly ShellNode[], root: ShellNode) {
	return [root, ...nodes.filter((node) => ancestorsOf(nodes, node).includes(root))];
}

/** Parent selections absorb their descendants; unknown IDs are ignored. */
export function selectedRoots(state: ShellState, ids: readonly string[]) {
	const selected = new Set(ids);
	return state.nodes.filter((node) => selected.has(node.id) && !ancestorsOf(state.nodes, node).some((parent) => selected.has(parent.id)));
}

/** Moves the selection to the Recycle Bin, or deletes it outright when `permanent`. */
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

/**
 * Restores entries into `destination`, or else into their original folder,
 * or onto the desktop if that folder is gone. Folders restored together
 * count as present, so a file returns into its folder from the same batch.
 */
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

/** Reads a saved desktop. Throws if it is damaged or names items the catalog no longer has. */
export function parseShellState(raw: string | null): ShellState {
	if (raw === null) return initialShellState();
	const state = JSON.parse(raw) as ShellState;
	const known = (nodes: unknown) => Array.isArray(nodes) && nodes.every((node: ShellNode) => ITEM_BY_ID.has(node?.id) && typeof node.parentId === "string");
	if (!known(state?.nodes) || !Array.isArray(state.entries) || !state.entries.every((entry) => known(entry?.nodes) && entry.nodes.length > 0)) {
		throw new Error("The saved desktop is damaged.");
	}
	return state;
}
