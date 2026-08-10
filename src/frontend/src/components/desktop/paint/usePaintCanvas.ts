"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import {
	DRAWABLE_TOOLS,
	UNDO_LIMIT,
	type Coords,
	type SizeIndex,
	type ToolId,
} from "./paintModel";
import {
	paintSegment,
	resolveStrokeStyle,
	type FreehandStyle,
} from "./tools/freehand";

type Props = {
	src: string;
	tool: ToolId;
	fg: string;
	bg: string;
	sizeIndex: SizeIndex;
	/** Status bar coords node — written imperatively (no React paint thrash). */
	coordsEl: RefObject<HTMLElement | null>;
};

type StrokeCfg = {
	tool: ToolId;
	fg: string;
	bg: string;
	sizeIndex: SizeIndex;
};

type Stroke = {
	lastX: number;
	lastY: number;
	style: FreehandStyle;
};

function canvasPoint(
	canvas: HTMLCanvasElement,
	clientX: number,
	clientY: number,
	rect: DOMRect,
): Coords {
	const x = Math.floor(((clientX - rect.left) * canvas.width) / rect.width);
	const y = Math.floor(((clientY - rect.top) * canvas.height) / rect.height);
	return {
		x: Math.max(0, Math.min(canvas.width - 1, x)),
		y: Math.max(0, Math.min(canvas.height - 1, y)),
	};
}

export function usePaintCanvas({
	src,
	tool,
	fg,
	bg,
	sizeIndex,
	coordsEl,
}: Props): {
	canvasRef: RefObject<HTMLCanvasElement | null>;
	wrapRef: RefObject<HTMLDivElement | null>;
} {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
	const cfg = useRef<StrokeCfg>({ tool, fg, bg, sizeIndex });
	const strokeRef = useRef<Stroke | null>(null);
	const undoStack = useRef<ImageData[]>([]);
	const readyRef = useRef(false);
	const lastCoords = useRef<Coords | null>(null);
	const rectRef = useRef<DOMRect | null>(null);
	const coordsElRef = useRef(coordsEl);

	useEffect(() => {
		cfg.current = { tool, fg, bg, sizeIndex };
		coordsElRef.current = coordsEl;
	}, [tool, fg, bg, sizeIndex, coordsEl]);

	function emitCoords(c: Coords | null) {
		const prev = lastCoords.current;
		if (c === null) {
			if (prev === null) return;
		} else if (prev && prev.x === c.x && prev.y === c.y) {
			return;
		}
		lastCoords.current = c;
		const el = coordsElRef.current.current;
		if (el) el.textContent = c ? `${c.x}, ${c.y}` : "";
	}

	function pushUndo(ctx: CanvasRenderingContext2D) {
		const { width, height } = ctx.canvas;
		undoStack.current.push(ctx.getImageData(0, 0, width, height));
		if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift();
	}

	function undo() {
		const ctx = ctxRef.current;
		const snap = undoStack.current.pop();
		if (!ctx || !snap || strokeRef.current) return;
		ctx.putImageData(snap, 0, 0);
	}

	useLayoutEffect(() => {
		const canvas = canvasRef.current;
		const wrap = wrapRef.current;
		if (!canvas || !wrap) return;

		const w = Math.max(1, wrap.clientWidth);
		const h = Math.max(1, wrap.clientHeight);
		canvas.width = w;
		canvas.height = h;
		// willReadFrequently only helps color-eraser getImageData; default is faster for draw
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.imageSmoothingEnabled = false;
		ctxRef.current = ctx;
		undoStack.current = [];
		readyRef.current = false;
		lastCoords.current = null;

		let settled = false;
		const settle = (paint: () => void) => {
			if (settled || canvas.width !== w || canvas.height !== h) return;
			settled = true;
			paint();
			readyRef.current = true;
		};

		const img = new Image();
		img.decoding = "async";
		img.onload = () => settle(() => ctx.drawImage(img, 0, 0, w, h));
		img.onerror = () =>
			settle(() => {
				ctx.fillStyle = "#ffffff";
				ctx.fillRect(0, 0, w, h);
			});
		img.src = src;
		if (img.complete && img.naturalWidth > 0) {
			settle(() => ctx.drawImage(img, 0, 0, w, h));
		}
	}, [src]);

	useEffect(() => {
		const el = canvasRef.current;
		if (!el) return;
		const canvas: HTMLCanvasElement = el;

		const refreshRect = () => {
			rectRef.current = canvas.getBoundingClientRect();
		};
		refreshRect();

		function point(e: PointerEvent): Coords {
			const r = rectRef.current ?? canvas.getBoundingClientRect();
			return canvasPoint(canvas, e.clientX, e.clientY, r);
		}

		function onPointerDown(e: PointerEvent) {
			if (e.button !== 0 && e.button !== 2) return;
			if (!readyRef.current) return;
			const { tool: t, fg: f, bg: b, sizeIndex: s } = cfg.current;
			if (!DRAWABLE_TOOLS.has(t)) return;

			const style = resolveStrokeStyle(t, f, b, s, e.button === 2);
			if (!style) return;

			const ctx = ctxRef.current;
			if (!ctx) return;

			e.preventDefault();
			refreshRect();
			canvas.setPointerCapture(e.pointerId);
			pushUndo(ctx);

			const { x, y } = point(e);
			paintSegment(ctx, x, y, x, y, style);
			strokeRef.current = { lastX: x, lastY: y, style };
			emitCoords({ x, y });
		}

		function onPointerMove(e: PointerEvent) {
			const { x, y } = point(e);
			emitCoords({ x, y });

			const stroke = strokeRef.current;
			const ctx = ctxRef.current;
			if (!stroke || !ctx) return;
			if (x === stroke.lastX && y === stroke.lastY) return;
			paintSegment(ctx, stroke.lastX, stroke.lastY, x, y, stroke.style);
			stroke.lastX = x;
			stroke.lastY = y;
		}

		function endStroke(e: PointerEvent) {
			if (!strokeRef.current) return;
			strokeRef.current = null;
			if (canvas.hasPointerCapture(e.pointerId)) {
				canvas.releasePointerCapture(e.pointerId);
			}
		}

		function onContextMenu(e: Event) {
			e.preventDefault();
		}

		function onPointerLeave() {
			if (!strokeRef.current) emitCoords(null);
		}

		function onKey(e: KeyboardEvent) {
			if (
				!(e.metaKey || e.ctrlKey) ||
				e.key.toLowerCase() !== "z" ||
				e.shiftKey
			) {
				return;
			}
			const t = e.target;
			if (
				t instanceof HTMLInputElement ||
				t instanceof HTMLTextAreaElement ||
				(t instanceof HTMLElement && t.isContentEditable)
			) {
				return;
			}
			e.preventDefault();
			undo();
		}

		canvas.addEventListener("pointerdown", onPointerDown);
		canvas.addEventListener("pointermove", onPointerMove);
		canvas.addEventListener("pointerup", endStroke);
		canvas.addEventListener("pointercancel", endStroke);
		canvas.addEventListener("pointerleave", onPointerLeave);
		canvas.addEventListener("contextmenu", onContextMenu);
		window.addEventListener("keydown", onKey);
		window.addEventListener("resize", refreshRect);

		return () => {
			canvas.removeEventListener("pointerdown", onPointerDown);
			canvas.removeEventListener("pointermove", onPointerMove);
			canvas.removeEventListener("pointerup", endStroke);
			canvas.removeEventListener("pointercancel", endStroke);
			canvas.removeEventListener("pointerleave", onPointerLeave);
			canvas.removeEventListener("contextmenu", onContextMenu);
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("resize", refreshRect);
		};
	}, []);

	return { canvasRef, wrapRef };
}
