import assert from "node:assert/strict";
import { test } from "node:test";
import { PALETTE, TOOLS, isDrawable } from "@/components/desktop/apps/paint/paintModel";
import { resolveStrokeStyle } from "@/components/desktop/apps/paint/tools/freehand";

test("stroke resolution rejects unsupported tools without a caller-side guard", () => {
	for (const { id } of TOOLS) {
		for (const reverse of [false, true]) {
			const style = resolveStrokeStyle(id, PALETTE[0], PALETTE[14], reverse);
			assert.equal(style !== null, isDrawable(id), `${id}, ${reverse}`);
		}
	}
});

test("the right button and the eraser draw in the background colour", () => {
	assert.deepEqual(resolveStrokeStyle("pencil", "fg", "bg", false), { tool: "pencil", color: "fg" });
	assert.deepEqual(resolveStrokeStyle("brush", "fg", "bg", true), { tool: "brush", color: "bg" });
	assert.deepEqual(resolveStrokeStyle("eraser", "fg", "bg", false), { tool: "eraser", color: "bg" });
});
