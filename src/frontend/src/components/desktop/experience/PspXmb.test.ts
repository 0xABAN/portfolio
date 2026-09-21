import assert from "node:assert/strict";
import { test } from "node:test";
import { CATEGORIES, TEMPLATE_ITEMS, initialState, reducer } from "./PspXmb";

test("XMB navigation wraps jobs and projects while settings stays visual-only", () => {
	let state = initialState();
	assert.equal(CATEGORIES[state.categoryIndex].id, "jobs");
	assert.equal(TEMPLATE_ITEMS.length, 3);
	assert.deepEqual(CATEGORIES.slice(2).map((category) => category.label), [
		"Settings",
		"Photo",
		"Music",
		"Video",
		"Game",
		"Network",
		"PlayStation Network",
	]);
	assert.ok(CATEGORIES.slice(2).every((category) => category.disabled));

	state = reducer(state, { type: "category", delta: 1 });
	assert.equal(CATEGORIES[state.categoryIndex].id, "projects");
	state = reducer(state, { type: "item", delta: 1 });
	assert.equal(TEMPLATE_ITEMS[state.itemIndex].id, "item-2");

	state = reducer(state, { type: "open" });
	assert.equal(state.detailId, "projects-item-2");
	state = reducer(state, { type: "back" });
	assert.equal(state.detailId, null);

	state = reducer(state, { type: "select-category", index: CATEGORIES.length - 1 });
	assert.equal(CATEGORIES[state.categoryIndex].id, "projects");
	state = reducer(state, { type: "category", delta: 1 });
	assert.equal(CATEGORIES[state.categoryIndex].id, "jobs");
});
