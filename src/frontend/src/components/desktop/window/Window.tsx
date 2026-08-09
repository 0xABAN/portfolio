"use client";

import { useRef, type ReactNode } from "react";
import { WIN_H, WIN_W } from "../windows";
import "./window.css";

type Props = {
	title: string;
	x: number;
	y: number;
	onClose: () => void;
	onMove: (x: number, y: number) => void;
	children?: ReactNode;
};

type DragOrigin = {
	pointerX: number;
	pointerY: number;
	originX: number;
	originY: number;
};

export function Window({ title, x, y, onClose, onMove, children }: Props) {
	const drag = useRef<DragOrigin | null>(null);

	function onTitlePointerDown(e: React.PointerEvent<HTMLElement>) {
		if ((e.target as HTMLElement).closest(".win-close")) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		drag.current = {
			pointerX: e.clientX,
			pointerY: e.clientY,
			originX: x,
			originY: y,
		};
	}

	function onTitlePointerMove(e: React.PointerEvent<HTMLElement>) {
		const d = drag.current;
		if (!d) return;
		onMove(
			d.originX + (e.clientX - d.pointerX),
			d.originY + (e.clientY - d.pointerY),
		);
	}

	function onTitlePointerUp(e: React.PointerEvent<HTMLElement>) {
		if (!drag.current) return;
		drag.current = null;
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId);
		}
	}

	return (
		<section
			className="win"
			aria-label={title}
			style={{ left: x, top: y, width: WIN_W, height: WIN_H }}
		>
			<header
				className="win-titlebar"
				onPointerDown={onTitlePointerDown}
				onPointerMove={onTitlePointerMove}
				onPointerUp={onTitlePointerUp}
				onPointerCancel={onTitlePointerUp}
			>
				<span className="win-titlebar__text">{title}</span>
				<button
					type="button"
					className="win-close chrome-raised"
					aria-label="Close"
					onClick={onClose}
					onPointerDown={(e) => e.stopPropagation()}
				>
					×
				</button>
			</header>
			<div className="win__client chrome-sunken">{children}</div>
		</section>
	);
}
