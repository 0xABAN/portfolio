import assert from "node:assert/strict";
import { test } from "node:test";
import {
	binBytes, capacity, deleteNodes, DRIVE_BYTES, initialShellState, moveNodes,
	nodeBytes, originalLocation, oversizedRoots, parseShellState, purgeEntries,
	restoreEntries, RestoreConflict, saveShellState, STORAGE_KEY,
} from "./recycleBinState";

const remove = (state = initialShellState(), ids = ["bio"], now = 1000) => deleteNodes(state, ids, now).state;

test("delete, hydrate, restore and permanent delete retain exact item identity", () => {
	const initial = initialShellState();
	const deleted = remove(initial);
	assert.ok(initial.nodes.some((node) => node.id === "bio"));
	assert.ok(!deleted.nodes.some((node) => node.id === "bio"));
	assert.equal(originalLocation(deleted.entries[0]), "C:\\Windows\\Desktop\\secrets");
	assert.equal(binBytes(deleted), 4096);
	const restored = restoreEntries(parseShellState(JSON.stringify(deleted)), [1]);
	assert.deepEqual(restored.nodes.find((node) => node.id === "bio"), initial.nodes.find((node) => node.id === "bio"));
	assert.equal(restored.entries.length, 0);
	const purged = parseShellState(JSON.stringify(purgeEntries(deleted, [1])));
	assert.ok(!purged.nodes.some((node) => node.id === "bio"));
	assert.equal(restoreEntries(purged, [1]).nodes.length, purged.nodes.length);
});

test("folder deletion is one entry and never includes independently deleted children", () => {
	const first = remove();
	const state = remove(first, ["secrets", "resume", "secrets", "bogus", "recycle-bin"], 2000);
	assert.equal(state.entries.length, 2);
	assert.deepEqual(state.entries[1].nodes.map((node) => node.id), ["secrets", "resume", "experience"]);
	const restored = restoreEntries(state, [2]);
	assert.ok(restored.nodes.some((node) => node.id === "secrets"));
	assert.ok(!restored.nodes.some((node) => node.id === "bio"));
	assert.equal(restored.entries[0].rootId, "bio");
	assert.deepEqual(deleteNodes(state, ["bio", "unknown"], 3000).state, state);
});

test("restoring a child recreates only its missing parent; original folder can subsequently merge", () => {
	const state = remove(remove(), ["secrets"], 2000);
	const child = restoreEntries(state, [1]);
	const parent = child.nodes.find((node) => node.catalogId === "secrets")!;
	assert.match(parent.id, /^restored-/);
	assert.equal(child.nodes.find((node) => node.id === "bio")?.parentId, parent.id);
	assert.ok(!child.nodes.some((node) => node.id === "resume"));
	assert.throws(() => restoreEntries(child, [2]), RestoreConflict);
	const merged = restoreEntries(child, [2], undefined, true);
	assert.equal(merged.nodes.filter((node) => node.catalogId === "secrets").length, 1);
	assert.ok(merged.nodes.filter((node) => ["bio", "resume", "experience"].includes(node.id)).every((node) => node.parentId === parent.id));
	assert.deepEqual(parseShellState(JSON.stringify(merged)), merged);
});

test("restoring a whole selection restores parents before their separately deleted children", () => {
	const state = remove(remove(), ["secrets"], 2000);
	const restored = restoreEntries(state, [1, 2]);
	assert.equal(restored.entries.length, 0);
	assert.equal(restored.nodes.find((node) => node.id === "bio")?.parentId, "secrets");
	assert.equal(restored.nodes.length, initialShellState().nodes.length);
});

test("drag-out uses chosen destination and folders cannot move into descendants", () => {
	const state = restoreEntries(remove(), [1], "desktop");
	assert.equal(state.nodes.find((node) => node.id === "bio")?.parentId, "desktop");
	assert.equal(moveNodes(state, ["bio"], "secrets").nodes.find((node) => node.id === "bio")?.parentId, "secrets");
	assert.throws(() => moveNodes(state, ["secrets"], "secrets"), /itself/);
	assert.throws(() => restoreEntries(remove(), [1], "missing"), /no longer exists/);
});

test("permanent deletion, bypass and emptying do not resurrect or free space on restore", () => {
	let state = initialShellState();
	const used = nodeBytes(state.nodes);
	state = remove(state);
	assert.equal(nodeBytes(state.nodes) + binBytes(state), used);
	state = purgeEntries(state, [1]);
	assert.equal(nodeBytes(state.nodes) + binBytes(state), used - 4096);
	state.settings.global.bypass = true;
	assert.equal(remove(state, ["resume"]).entries.length, 0);
	assert.equal(deleteNodes(initialShellState(), ["secrets"], 1000, true).state.entries.length, 0);
});

test("capacity evicts oldest entries on insertion and refuses oversized items without consent", () => {
	let state = initialShellState();
	assert.equal(capacity(state), Math.floor(DRIVE_BYTES / 10));
	state.settings.global.percent = 3;
	state = remove(state, ["resume"]);
	state = remove(state, ["experience"], 2000);
	assert.deepEqual(state.entries.map((entry) => entry.rootId), ["experience"]);
	assert.equal(restoreEntries(state, [1]).nodes.length, state.nodes.length);
	state.settings.global.percent = 1;
	assert.equal(oversizedRoots(state, ["secrets"]).length, 0); // Only bio remains in secrets.
	const small = initialShellState();
	small.settings.global.percent = 1;
	assert.throws(() => remove(small, ["resume"]), /too large/);
	const consented = deleteNodes(small, ["resume", "bio"], 3000, false, true);
	assert.deepEqual(consented.state.entries.map((entry) => entry.rootId), ["bio"]);
	assert.ok(!consented.state.nodes.some((node) => node.id === "resume"));
});

test("zero capacity and independent drive settings are functional, including empty folders", () => {
	let state = deleteNodes(initialShellState(), ["bio", "resume", "experience"], 1000, true).state;
	state.settings.independent = true;
	state.settings.drive.percent = 0;
	assert.equal(capacity(state), 0);
	assert.throws(() => remove(state, ["secrets"]), /too large/);
	state = deleteNodes(state, ["secrets"], 2000, false, true).state;
	assert.equal(state.entries.length, 0);
	assert.ok(!state.nodes.some((node) => node.id === "secrets"));
});

test("hydration rejects damaged graphs, duplicate records and untrusted catalog entries", () => {
	assert.equal(parseShellState(null).nodes.length, initialShellState().nodes.length);
	for (const mutate of [
		(s: ReturnType<typeof initialShellState>) => { s.version = 9 as 1; },
		(s: ReturnType<typeof initialShellState>) => { s.nodes[0].catalogId = "javascript:alert(1)"; },
		(s: ReturnType<typeof initialShellState>) => { s.nodes.push(s.nodes[0]); },
		(s: ReturnType<typeof initialShellState>) => { s.nodes.find((node) => node.id === "secrets")!.parentId = "secrets"; },
		(s: ReturnType<typeof initialShellState>) => { s.settings.drive.percent = -1; },
		(s: ReturnType<typeof initialShellState>) => { s.nodes[0].parentId = "missing"; },
	]) {
		const state = initialShellState();
		mutate(state);
		assert.throws(() => parseShellState(JSON.stringify(state)));
	}
	const state = remove();
	state.entries[0].rootId = "bogus";
	assert.throws(() => parseShellState(JSON.stringify(state)));
});

test("persistence refuses stale writes and propagates storage failures before publication", () => {
	let raw: string | null = null;
	const storage = {
		getItem(key: string) { assert.equal(key, STORAGE_KEY); return raw; },
		setItem(key: string, value: string) { assert.equal(key, STORAGE_KEY); raw = value; },
	};
	const next = remove();
	const saved = saveShellState(storage, null, next);
	assert.deepEqual(parseShellState(saved), next);
	assert.throws(() => saveShellState(storage, null, initialShellState()), /another tab/);
	assert.equal(raw, saved);
	assert.throws(() => saveShellState({ ...storage, setItem() { throw new Error("quota"); } }, saved, initialShellState()), /quota/);
	assert.equal(raw, saved);
});
