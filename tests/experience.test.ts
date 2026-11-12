import assert from "node:assert/strict";
import { test } from "node:test";
import { CATEGORIES, initialState, reducer } from "@/components/desktop/apps/Experience";

const navigable = CATEGORIES.filter((category) => !category.disabled).length;

test("items wrap around and changing category starts at its first item", () => {
	let state = initialState();
	const count = CATEGORIES[0].items.length;

	state = reducer(state, { type: "item", delta: -1 });
	assert.equal(state.itemIndex, count - 1);

	state = reducer(state, { type: "category", delta: 1 });
	assert.equal(state.categoryIndex, 1);
	assert.equal(state.itemIndex, 0);
});

test("category navigation skips the decorative, disabled categories", () => {
	let state = initialState();

	state = reducer(state, { type: "category", delta: -1 });
	assert.equal(state.categoryIndex, navigable - 1);

	state = reducer(state, { type: "select-category", index: CATEGORIES.length - 1 });
	assert.equal(state.categoryIndex, navigable - 1);
});

test("the options menu only moves while open and resets when toggled", () => {
	let state = initialState();

	state = reducer(state, { type: "option", delta: 1 });
	assert.equal(state.optionsIndex, 0);

	state = reducer(state, { type: "toggle-options" });
	state = reducer(state, { type: "option", delta: 1 });
	assert.equal(state.optionsIndex, 1);

	state = reducer(state, { type: "toggle-options" });
	assert.equal(state.optionsIndex, 0);
	assert.equal(state.optionsOpen, false);
});
