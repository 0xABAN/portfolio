import assert from "node:assert/strict";
import { test } from "node:test";
import { PROJECTS_RAIL, TEMPLATE_ITEMS, initialState, reducer } from "./PspXmb";

test("XMB navigation wraps projects, selects template items, and opens details", () => {
	let state = initialState();
	assert.equal(PROJECTS_RAIL[state.projectIndex].id, "amazon");
	assert.equal(TEMPLATE_ITEMS.length, 3);

	state = reducer(state, { type: "project", delta: 1 });
	assert.equal(PROJECTS_RAIL[state.projectIndex].id, "ibm");
	state = reducer(state, { type: "item", delta: 1 });
	assert.equal(TEMPLATE_ITEMS[state.itemIndex].id, "item-2");

	state = reducer(state, { type: "open" });
	assert.equal(state.detailId, "ibm");
	state = reducer(state, { type: "back" });
	assert.equal(state.detailId, null);

	state = reducer(state, { type: "project", delta: -1 });
	assert.equal(PROJECTS_RAIL[state.projectIndex].id, "amazon");
});
