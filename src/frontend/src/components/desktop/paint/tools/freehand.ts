/**
 * Freehand stamps — jspaint tools.js + image-manipulation.js
 * Pencil 1px, circle brush, square eraser, RMB color-eraser (fg→bg).
 */

import {
	BRUSH_SIZES,
	DRAWABLE_TOOLS,
	ERASER_SIZES,
	type SizeIndex,
	type ToolId,
} from "../paintModel";
import { bresenhamDenseLine, bresenhamLine } from "./bresenham";

export type Rgb = readonly [number, number, number];

export type FreehandStyle =
	| { kind: "pencil"; color: string }
	| { kind: "brush"; color: string; size: number }
	| { kind: "eraser"; color: string; size: number }
	| { kind: "color-eraser"; size: number; fg: Rgb; bg: Rgb };

function parseRgb(color: string): Rgb {
	const m = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(color);
	if (!m) return [0, 0, 0];
	return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** jspaint reverse/color rules → stroke style */
export function resolveStrokeStyle(
	tool: ToolId,
	fg: string,
	bg: string,
	sizeIndex: SizeIndex,
	reverse: boolean,
): FreehandStyle | null {
	if (!DRAWABLE_TOOLS.has(tool)) return null;
	if (tool === "pencil") {
		return { kind: "pencil", color: reverse ? bg : fg };
	}
	if (tool === "brush") {
		return {
			kind: "brush",
			color: reverse ? bg : fg,
			size: BRUSH_SIZES[sizeIndex],
		};
	}
	// eraser
	const size = ERASER_SIZES[sizeIndex];
	if (reverse) {
		return {
			kind: "color-eraser",
			size,
			fg: parseRgb(fg),
			bg: parseRgb(bg),
		};
	}
	return { kind: "eraser", color: bg, size };
}

function stampPencil(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	color: string,
): void {
	ctx.fillStyle = color;
	ctx.fillRect(x, y, 1, 1);
}

/** Circle diameter `size`, centered — jspaint render_brush("circle"). */
function stampCircle(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	size: number,
	color: string,
): void {
	if (size <= 1) {
		stampPencil(ctx, cx, cy, color);
		return;
	}
	// Single path fill — same visual, far cheaper than per-pixel fillRect
	const r = size / 2;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(cx + 0.5, cy + 0.5, r, 0, Math.PI * 2);
	ctx.fill();
}

/** jspaint get_rect: ceil(x - size/2) square */
function stampEraserSquare(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	background: string,
): void {
	ctx.fillStyle = background;
	ctx.fillRect(Math.ceil(x - size / 2), Math.ceil(y - size / 2), size, size);
}

/** RMB eraser — replace fg pixels with bg inside the square */
function stampColorEraser(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	fg: Rgb,
	bg: Rgb,
): void {
	const rectX = Math.ceil(x - size / 2);
	const rectY = Math.ceil(y - size / 2);
	const { width: w, height: h } = ctx.canvas;
	const sx = Math.max(0, rectX);
	const sy = Math.max(0, rectY);
	const rw = Math.min(w, rectX + size) - sx;
	const rh = Math.min(h, rectY + size) - sy;
	if (rw <= 0 || rh <= 0) return;

	const [fr, fgc, fb] = fg;
	const [br, bgc, bb] = bg;
	const data = ctx.getImageData(sx, sy, rw, rh);
	const d = data.data;
	const t = 1; // jspaint fill_threshold

	for (let i = 0; i < d.length; i += 4) {
		if (
			Math.abs(d[i] - fr) <= t &&
			Math.abs(d[i + 1] - fgc) <= t &&
			Math.abs(d[i + 2] - fb) <= t &&
			d[i + 3] >= 253
		) {
			d[i] = br;
			d[i + 1] = bgc;
			d[i + 2] = bb;
			d[i + 3] = 255;
		}
	}
	ctx.putImageData(data, sx, sy);
}

function stampAt(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	style: FreehandStyle,
): void {
	switch (style.kind) {
		case "pencil":
			stampPencil(ctx, x, y, style.color);
			return;
		case "brush":
			stampCircle(ctx, x, y, style.size, style.color);
			return;
		case "eraser":
			stampEraserSquare(ctx, x, y, style.size, style.color);
			return;
		case "color-eraser":
			stampColorEraser(ctx, x, y, style.size, style.fg, style.bg);
			return;
		default: {
			const _exhaustive: never = style;
			return _exhaustive;
		}
	}
}

export function paintSegment(
	ctx: CanvasRenderingContext2D,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	style: FreehandStyle,
): void {
	if (x0 === x1 && y0 === y1) {
		stampAt(ctx, x0, y0, style);
		return;
	}
	const stamp = (x: number, y: number) => stampAt(ctx, x, y, style);
	if (style.kind === "brush" && style.size > 1) {
		bresenhamDenseLine(x0, y0, x1, y1, stamp);
	} else {
		bresenhamLine(x0, y0, x1, y1, stamp);
	}
}
