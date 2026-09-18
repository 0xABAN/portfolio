import { DESKTOP_PATH, ITEM_BY_ID, SHELL_ITEMS, type ShellItem } from "./shellCatalog";

export const STORAGE_KEY = "portfolio.shell.v1";
export const DRIVE_BYTES = 32 * 1024 * 1024;
export const SYSTEM_BYTES = 8 * 1024 * 1024;

/** Instance identity is separate from content: restoring a missing parent creates a new folder. */
export type ShellNode = { id: string; catalogId: string; parentId: string };
export type RecycledEntry = {
	id: number;
	rootId: string;
	nodes: ShellNode[];
	/** Original parent chain, from Desktop down, survives deletion of those folders. */
	ancestors: ShellNode[];
	deletedAt: number;
};
export type DriveSettings = { percent: number; bypass: boolean };
export type BinSettings = {
	independent: boolean;
	confirm: boolean;
	global: DriveSettings;
	drive: DriveSettings;
};
export type ShellState = {
	version: 1;
	nextId: number;
	nodes: ShellNode[];
	entries: RecycledEntry[];
	settings: BinSettings;
};

export function initialShellState(): ShellState {
	return {
		version: 1, nextId: 1,
		nodes: SHELL_ITEMS.map((item) => ({ id: item.id, catalogId: item.id, parentId: ["bio", "resume", "experience"].includes(item.id) ? "secrets" : "desktop" })),
		entries: [],
		settings: { independent: false, confirm: true, global: { percent: 10, bypass: false }, drive: { percent: 10, bypass: false } },
	};
}

export function itemOf(node: ShellNode): ShellItem {
	return ITEM_BY_ID.get(node.catalogId)!;
}

export function driveSettings(state: ShellState) {
	return state.settings.independent ? state.settings.drive : state.settings.global;
}

export function capacity(state: ShellState) {
	return Math.floor(DRIVE_BYTES * driveSettings(state).percent / 100);
}

export function nodeBytes(nodes: readonly ShellNode[]) {
	return nodes.reduce((total, node) => total + itemOf(node).bytes, 0);
}

export function binBytes(state: ShellState) {
	return state.entries.reduce((total, entry) => total + nodeBytes(entry.nodes), 0);
}

export function entryRoot(entry: RecycledEntry) {
	return entry.nodes.find((node) => node.id === entry.rootId)!;
}

export function originalLocation(entry: RecycledEntry) {
	return [DESKTOP_PATH, ...entry.ancestors.map((node) => itemOf(node).name)].join("\\");
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

export function subtree(nodes: readonly ShellNode[], id: string) {
	return nodes.filter((node) => node.id === id || ancestorsOf(nodes, node).some((parent) => parent.id === id));
}

/** Parent selections absorb their descendants; invalid/system IDs never reach a mutation. */
export function selectedRoots(state: ShellState, ids: readonly string[]) {
	const selected = new Set(ids);
	return state.nodes.filter((node) => selected.has(node.id) && !ancestorsOf(state.nodes, node).some((parent) => selected.has(parent.id)));
}

export function oversizedRoots(state: ShellState, ids: readonly string[]) {
	return selectedRoots(state, ids).filter((node) => capacity(state) === 0 || nodeBytes(subtree(state.nodes, node.id)) > capacity(state));
}

/** Compute the whole operation first. Callers persist it before publishing any UI changes. */
export function deleteNodes(state: ShellState, ids: readonly string[], now: number, permanent = false, allowOversize = false): { state: ShellState; recycled: number[] } {
	const roots = selectedRoots(state, ids);
	if (!roots.length) return { state, recycled: [] };
	const bypass = permanent || driveSettings(state).bypass;
	const oversized = new Set(oversizedRoots(state, ids).map((node) => node.id));
	if (!bypass && oversized.size && !allowOversize) throw new Error("An item is too large for the Recycle Bin.");

	let nextId = state.nextId;
	const entries = [...state.entries];
	const removed = new Set<string>();
	const recycled: number[] = [];
	for (const root of roots) {
		const nodes = subtree(state.nodes, root.id);
		nodes.forEach((node) => removed.add(node.id));
		if (bypass || oversized.has(root.id)) continue;
		const entry = { id: nextId++, rootId: root.id, nodes, ancestors: ancestorsOf(state.nodes, root), deletedAt: now };
		entries.push(entry);
		recycled.push(entry.id);

		// Win95 makes room when recycling new items, not when changing the slider.
		entries.sort((a, b) => a.deletedAt - b.deletedAt || a.id - b.id);
		let bytes = entries.reduce((total, item) => total + nodeBytes(item.nodes), 0);
		while (bytes > capacity(state) && entries.length) bytes -= nodeBytes(entries.shift()!.nodes);
	}
	return {
		state: { ...state, nextId, nodes: state.nodes.filter((node) => !removed.has(node.id)), entries },
		recycled: recycled.filter((id) => entries.some((entry) => entry.id === id)),
	};
}

export function purgeEntries(state: ShellState, ids: readonly number[]) {
	const selected = new Set(ids);
	return { ...state, entries: state.entries.filter((entry) => !selected.has(entry.id)) };
}

export class RestoreConflict extends Error {
	constructor(public readonly folder: boolean, name: string) {
		super(`A ${folder ? "folder" : "file"} named "${name}" already exists in this location.${folder ? " Combine the folders?" : " Restore to another folder instead."}`);
	}
}

/** Restoring a missing parent recreates only its directory, never its deleted siblings. */
export function restoreEntries(state: ShellState, ids: readonly number[], destination?: string, mergeFolders = false): ShellState {
	const entries = state.entries.filter((entry) => ids.includes(entry.id))
		.sort((a, b) => a.ancestors.length - b.ancestors.length);
	if (!entries.length) return state;
	const nodes = [...state.nodes];
	let nextId = state.nextId;
	if (destination && destination !== "desktop" && !nodes.some((node) => node.id === destination && itemOf(node).kind === "folder")) {
		throw new Error("The destination folder no longer exists.");
	}
	const sameName = (node: ShellNode, parentId: string) => nodes.find((other) => other.parentId === parentId && itemOf(other).name.toLowerCase() === itemOf(node).name.toLowerCase());

	for (const entry of entries) {
		let parentId = destination ?? "desktop";
		if (!destination) {
			for (const ancestor of entry.ancestors) {
				const existing = sameName(ancestor, parentId);
				if (existing && itemOf(existing).kind !== "folder") throw new RestoreConflict(false, itemOf(existing).name);
				if (existing) parentId = existing.id;
				else {
					const recreated = { ...ancestor, id: `restored-${nextId++}`, parentId };
					nodes.push(recreated);
					parentId = recreated.id;
				}
			}
		}

		const addTree = (source: ShellNode, targetParent: string) => {
			const existing = sameName(source, targetParent);
			const folder = itemOf(source).kind === "folder";
			if (existing && (!folder || itemOf(existing).kind !== "folder" || !mergeFolders)) throw new RestoreConflict(folder && itemOf(existing).kind === "folder", itemOf(source).name);
			const restored = existing ?? { ...source, parentId: targetParent };
			if (!existing) nodes.push(restored);
			for (const child of entry.nodes.filter((node) => node.parentId === source.id)) addTree(child, restored.id);
		};
		addTree(entryRoot(entry), parentId);
	}
	return { ...purgeEntries(state, ids), nextId, nodes };
}

export function moveNodes(state: ShellState, ids: readonly string[], destination: string): ShellState {
	if (destination !== "desktop" && !state.nodes.some((node) => node.id === destination && itemOf(node).kind === "folder")) throw new Error("The destination folder no longer exists.");
	const roots = selectedRoots(state, ids);
	for (const root of roots) {
		if (subtree(state.nodes, root.id).some((node) => node.id === destination)) throw new Error("A folder cannot be moved into itself.");
		if (state.nodes.some((other) => other.id !== root.id && other.parentId === destination && itemOf(other).name.toLowerCase() === itemOf(root).name.toLowerCase())) throw new Error(`"${itemOf(root).name}" already exists in this location.`);
	}
	const selected = new Set(roots.map((node) => node.id));
	return { ...state, nodes: state.nodes.map((node) => selected.has(node.id) ? { ...node, parentId: destination } : node) };
}

/** Strict hydration: never execute stored URLs or silently replace a damaged desktop. */
export function parseShellState(raw: string | null): ShellState {
	if (raw === null) return initialShellState();
	if (raw.length > 256_000) throw new Error("The saved desktop is too large.");
	const state = JSON.parse(raw) as ShellState;
	const fail = () => { throw new Error("The saved desktop could not be read. Reset the portfolio to start again."); };
	if (!state || state.version !== 1 || !Number.isSafeInteger(state.nextId) || state.nextId < 1 || !Array.isArray(state.nodes) || !Array.isArray(state.entries)) return fail();
	const settings = state.settings;
	if (!settings || typeof settings.confirm !== "boolean" || typeof settings.independent !== "boolean") return fail();
	for (const drive of [settings.global, settings.drive]) {
		if (!drive || typeof drive.bypass !== "boolean" || !Number.isInteger(drive.percent) || drive.percent < 0 || drive.percent > 100) return fail();
	}
	const validNode = (node: ShellNode) => node && typeof node.id === "string" && typeof node.parentId === "string" && ITEM_BY_ID.has(node.catalogId) && (node.id === node.catalogId || (itemOf(node).kind === "folder" && /^restored-\d+$/.test(node.id) && Number(node.id.slice(9)) < state.nextId));
	const seenIds = new Set<string>();
	const leaves = new Set<string>();
	const checkTree = (nodes: ShellNode[], externalParent: string) => {
		if (nodes.length > 1000 || !nodes.every(validNode)) return fail();
		for (const node of nodes) {
			if (seenIds.has(node.id)) return fail();
			seenIds.add(node.id);
			if (itemOf(node).kind !== "folder") {
				if (leaves.has(node.catalogId)) return fail();
				leaves.add(node.catalogId);
			}
			const visited = new Set([node.id]);
			let parentId = node.parentId;
			while (parentId !== externalParent) {
				const parent = nodes.find((candidate) => candidate.id === parentId);
				if (!parent || itemOf(parent).kind !== "folder" || visited.has(parentId)) return fail();
				visited.add(parentId);
				parentId = parent.parentId;
			}
			if (nodes.some((other) => other.id !== node.id && other.parentId === node.parentId && itemOf(other).name.toLowerCase() === itemOf(node).name.toLowerCase())) return fail();
		}
	};
	checkTree(state.nodes, "desktop");
	const entryIds = new Set<number>();
	for (const entry of state.entries) {
		if (!entry || !Number.isSafeInteger(entry.id) || entry.id < 1 || entry.id >= state.nextId || entryIds.has(entry.id) || !Number.isFinite(entry.deletedAt) || entry.deletedAt < 0 || entry.deletedAt > 8.64e15 || !Array.isArray(entry.nodes) || !entry.nodes.length || !Array.isArray(entry.ancestors) || entry.ancestors.length > 100) return fail();
		entryIds.add(entry.id);
		let parentId = "desktop";
		const ancestorIds = new Set<string>();
		for (const ancestor of entry.ancestors) {
			if (!validNode(ancestor) || itemOf(ancestor).kind !== "folder" || ancestor.parentId !== parentId || ancestorIds.has(ancestor.id)) return fail();
			ancestorIds.add(ancestor.id);
			parentId = ancestor.id;
		}
		if (entry.nodes.some((node) => ancestorIds.has(node.id))) return fail();
		checkTree(entry.nodes, parentId);
		if (entry.nodes.filter((node) => node.parentId === parentId).length !== 1 || !entry.nodes.some((node) => node.id === entry.rootId && node.parentId === parentId)) return fail();
	}
	return state;
}

/** A stale confirmation must never delete items changed by another tab. */
export function saveShellState(storage: Pick<Storage, "getItem" | "setItem">, expectedRaw: string | null, next: ShellState) {
	if (storage.getItem(STORAGE_KEY) !== expectedRaw) throw new Error("The desktop changed in another tab. Please try again.");
	const raw = JSON.stringify(next);
	storage.setItem(STORAGE_KEY, raw);
	return raw;
}
