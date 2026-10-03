import assert from "node:assert/strict";
import { test } from "node:test";
import { CATEGORIES, initialState, reducer } from "./PspXmb";

test("XMB navigates the jobs and projects lists while PSP categories stay visual-only", () => {
	let state = initialState();
	assert.equal(CATEGORIES[state.categoryIndex].id, "jobs");
	assert.equal(CATEGORIES[state.categoryIndex].label, "Work");
	assert.deepEqual(CATEGORIES[state.categoryIndex].items.map((item) => item.id), ["amazon", "ibm"]);
	assert.equal(CATEGORIES[1].items.length, 6);
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

	state = reducer(state, { type: "item", delta: 1 });
	assert.equal(CATEGORIES[state.categoryIndex].items[state.itemIndex].id, "ibm");
	state = reducer(state, { type: "category", delta: 1 });
	assert.equal(CATEGORIES[state.categoryIndex].id, "projects");
	assert.equal(state.itemIndex, 0);
	assert.equal(CATEGORIES[state.categoryIndex].items[state.itemIndex].id, "copycat");

	state = reducer(state, { type: "toggle-options" });
	state = reducer(state, { type: "option", delta: 1 });
	assert.equal(state.optionsIndex, 1);
	state = reducer(state, { type: "toggle-options" });
	assert.equal(state.optionsIndex, 0);

	state = reducer(state, { type: "select-category", index: CATEGORIES.length - 1 });
	assert.equal(CATEGORIES[state.categoryIndex].id, "projects");
	state = reducer(state, { type: "category", delta: 1 });
	assert.equal(CATEGORIES[state.categoryIndex].id, "jobs");
});
