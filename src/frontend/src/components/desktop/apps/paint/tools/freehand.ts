/**
 * Freehand stamps, after jspaint's tools.js and image-manipulation.js: a 1px
 * pencil, a round brush and a square eraser.
 */

import { isDrawable, type DrawableTool, type ToolId } from "../paintModel";
import { bresenhamLine } from "./bresenham";

/** jspaint's medium sizes, in px. */
const BRUSH_SIZE = 4;
const ERASER_SIZE = 6;

export type FreehandStyle = { tool: DrawableTool; color: string };

/** The right button draws in the background colour; the eraser always does. Null for tools that cannot draw. */
export function resolveStrokeStyle(tool: ToolId, fg: string, bg: string, reverse: boolean): FreehandStyle | null {
	if (!isDrawable(tool)) return null;
	return { tool, color: reverse || tool === "eraser" ? bg : fg };
}

function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, { tool, color }: FreehandStyle) {
	ctx.fillStyle = color;
	if (tool === "pencil") {
		ctx.fillRect(x, y, 1, 1);
	} else if (tool === "eraser") {
		// jspaint's get_rect: a square starting at ceil(x - size / 2).
		ctx.fillRect(Math.ceil(x - ERASER_SIZE / 2), Math.ceil(y - ERASER_SIZE / 2), ERASER_SIZE, ERASER_SIZE);
	} else {
		// One path per stamp: the same circle as jspaint's per-pixel brush, far cheaper.
		ctx.beginPath();
		ctx.arc(x + 0.5, y + 0.5, BRUSH_SIZE / 2, 0, Math.PI * 2);
		ctx.fill();
	}
}

/** Stamps along a line; the brush also stamps each orthogonal mid-step, so diagonals stay solid. */
export function paintSegment(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, style: FreehandStyle) {
	bresenhamLine(x0, y0, x1, y1, (x, y) => stamp(ctx, x, y, style), style.tool === "brush");
}
