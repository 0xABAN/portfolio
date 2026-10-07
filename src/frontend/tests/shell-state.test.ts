import assert from "node:assert/strict";
import { test } from "node:test";
import { byCatalogOrder } from "@/components/desktop/files/catalog";
import { deleteNodes, entryId, initialShellState, moveNodes, parseShellState, purgeEntries, restoreEntries, type ShellState } from "@/components/desktop/files/state";

const remove = (state = initialShellState(), ids = ["experience"], now = 1000) => deleteNodes(state, ids, now);
const parentOf = (state: ShellState, id: string) => state.nodes.find((node) => node.id === id)?.parentId;

test("delete, save, restore and permanent delete keep each item's identity", () => {
	const initial = initialShellState();
	const deleted = remove(initial);
	assert.ok(!deleted.nodes.some((node) => node.id === "experience"));
	assert.deepEqual(deleted.entries.map(entryId), ["experience"]);
	assert.equal(deleted.entries[0].location, "C:\\Windows\\Desktop\\secrets");

	// A restored item rejoins the end of the list; folders show their items in catalog order.
	const restored = restoreEntries(parseShellState(JSON.stringify(deleted)), ["experience"]);
	assert.deepEqual({ ...restored, nodes: restored.nodes.toSorted(byCatalogOrder) }, initial);

	const purged = parseShellState(JSON.stringify(purgeEntries(deleted, ["experience"])));
	assert.ok(!purged.nodes.some((node) => node.id === "experience"));
	assert.equal(purged.entries.length, 0);
	assert.deepEqual(restoreEntries(purged, ["experience"]), purged);
});

test("a folder is one entry and never includes separately deleted children", () => {
	const state = remove(remove(), ["secrets", "resume", "secrets", "bogus", "recycle-bin"], 2000);
	assert.deepEqual(state.entries.map((entry) => entry.nodes.map((node) => node.id)), [["experience"], ["secrets", "resume"]]);
	assert.deepEqual(remove(state, ["experience", "unknown"], 3000), state);
});

test("restoring a child whose folder is gone puts it on the desktop", () => {
	const state = remove(remove(), ["secrets"], 2000);
	const child = restoreEntries(state, ["experience"]);
	assert.equal(parentOf(child, "experience"), "desktop");
	assert.ok(!child.nodes.some((node) => node.id === "resume"));
});

test("restoring a folder with its separately deleted child puts the child back inside", () => {
	const restored = restoreEntries(remove(remove(), ["secrets"], 2000), ["experience", "secrets"]);
	assert.equal(restored.entries.length, 0);
	assert.equal(parentOf(restored, "experience"), "secrets");
	assert.equal(restored.nodes.length, initialShellState().nodes.length);
});

test("drag-out uses the chosen destination and folders cannot move into themselves", () => {
	const state = restoreEntries(remove(), ["experience"], "desktop");
	assert.equal(parentOf(state, "experience"), "desktop");
	assert.equal(parentOf(moveNodes(state, ["experience"], "secrets"), "experience"), "secrets");
	assert.throws(() => moveNodes(state, ["secrets"], "secrets"), /itself/);
});

test("permanent deletion leaves nothing to restore", () => {
	const state = deleteNodes(initialShellState(), ["secrets"], 1000, true);
	assert.equal(state.entries.length, 0);
	assert.ok(!state.nodes.some((node) => ["secrets", "resume", "experience"].includes(node.id)));
});

test("loading rejects damaged data and items the catalog no longer has", () => {
	assert.deepEqual(parseShellState(null), initialShellState());
	assert.throws(() => parseShellState("{"));
	for (const mutate of [
		(s: ShellState) => { s.nodes[0].id = "javascript:alert(1)"; },
		(s: ShellState) => { (s as Partial<ShellState>).entries = undefined; },
		(s: ShellState) => { s.entries.push({ nodes: [], location: "", deletedAt: 0 }); },
	]) {
		const state = initialShellState();
		mutate(state);
		assert.throws(() => parseShellState(JSON.stringify(state)));
	}
});
