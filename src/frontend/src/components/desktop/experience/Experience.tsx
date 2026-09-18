"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import "./experience.css";

type DragState = {
	pointerId: number;
	startX: number;
	startY: number;
	offsetX: number;
	offsetY: number;
};

export function Experience() {
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const [dragging, setDragging] = useState(false);
	const drag = useRef<DragState | null>(null);

	const startDrag = (event: PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		drag.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			offsetX: offset.x,
			offsetY: offset.y,
		};
		setDragging(true);
	};

	const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
		if (!drag.current || event.pointerId !== drag.current.pointerId) return;
		setOffset({
			x: drag.current.offsetX + event.clientX - drag.current.startX,
			y: drag.current.offsetY + event.clientY - drag.current.startY,
		});
	};

	const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
		if (!drag.current || event.pointerId !== drag.current.pointerId) return;
		drag.current = null;
		setDragging(false);
	};

	return (
		<div className="psp" aria-label="PSP Projects">
			<div
				className={dragging ? "psp__canvas psp__canvas--dragging" : "psp__canvas"}
				style={{ "--psp-x": `${offset.x}px`, "--psp-y": `${offset.y}px` } as CSSProperties}
				onPointerDown={startDrag}
				onPointerMove={moveDrag}
				onPointerUp={stopDrag}
				onPointerCancel={stopDrag}
			>
				<div className="psp__screen" aria-hidden="true" />
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img className="psp__art" src="/icons/psp.png" alt="" draggable={false} />
			</div>
		</div>
	);
}
