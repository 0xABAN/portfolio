import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveStrokeStyle } from "@/components/desktop/apps/Paint";

test("the right button and the eraser draw in the background colour", () => {
	assert.deepEqual(resolveStrokeStyle("pencil", "fg", "bg", false), { tool: "pencil", color: "fg" });
	assert.deepEqual(resolveStrokeStyle("brush", "fg", "bg", true), { tool: "brush", color: "bg" });
	assert.deepEqual(resolveStrokeStyle("eraser", "fg", "bg", false), { tool: "eraser", color: "bg" });
});

test("tools that can't draw produce no stroke", () => {
	assert.equal(resolveStrokeStyle("fill", "fg", "bg", false), null);
});
