import assert from "node:assert/strict";
import { test } from "node:test";
import { CATEGORIES, initialState, reducer } from "./PspXmb";

test("XMB navigation wraps categories, selects items, and opens details", () => {
	let state = initialState();
	assert.equal(CATEGORIES[state.categoryIndex].id, "music");

	state = reducer(state, { type: "category", delta: 1 });
	assert.equal(CATEGORIES[state.categoryIndex].id, "video");
	state = reducer(state, { type: "item", delta: 1 });
	assert.equal(CATEGORIES[state.categoryIndex].items[state.itemIndex].id, "definitive");

	state = reducer(state, { type: "open" });
	assert.equal(state.detailId, "definitive");
	state = reducer(state, { type: "back" });
	assert.equal(state.detailId, null);

	state = reducer(state, { type: "category", delta: -1 });
	assert.equal(CATEGORIES[state.categoryIndex].id, "music");
});
