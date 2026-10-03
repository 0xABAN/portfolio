import assert from "node:assert/strict";
import { test } from "node:test";
import { DRAWABLE_TOOLS, PALETTE, TOOLS } from "../paintModel";
import { resolveStrokeStyle } from "./freehand";

test("stroke resolution rejects unsupported tools without a caller-side guard", () => {
	for (const { id } of TOOLS) {
		for (const size of [0, 1, 2] as const) {
			for (const reverse of [false, true]) {
				const style = resolveStrokeStyle(id, PALETTE[0], PALETTE[14], size, reverse);
				assert.equal(style !== null, DRAWABLE_TOOLS.has(id), `${id}, ${size}, ${reverse}`);
			}
		}
	}
});
