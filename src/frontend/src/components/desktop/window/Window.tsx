"use client";

import { memo, useLayoutEffect, useRef, type ReactNode } from "react";
import "./window.css";

type Props = {
	title: string;
	icon?: string;
	x: number;
	y: number;
	w: number;
	h: number;
	z: number;
	/** Client callback — *Action suffix satisfies Next TS 71007 */
	onCloseAction: () => void;
	/** Commit final geometry (clamping / children live here). */
	onMoveAction: (x: number, y: number) => void;
	children?: ReactNode;
};

type DragOrigin = {
	pointerX: number;
	pointerY: number;
	originX: number;
	originY: number;
};

function WindowInner({
	title,
	icon,
	x,
	y,
	w,
	h,
	z,
	onCloseAction,
	onMoveAction,
	children,
}: Props) {
	const rootRef = useRef<HTMLElement>(null);
	const drag = useRef<DragOrigin | null>(null);

	useLayoutEffect(() => {
		// Don't fight an in-progress drag (DOM is source of truth mid-drag)
		if (drag.current) return;
		const el = rootRef.current;
		if (!el) return;
		el.style.left = `${x}px`;
		el.style.top = `${y}px`;
		el.style.width = `${w}px`;
		el.style.height = `${h}px`;
		el.style.zIndex = String(z);
	}, [x, y, w, h, z]);

	function onTitlePointerDown(e: React.PointerEvent<HTMLElement>) {
		if ((e.target as HTMLElement).closest(".win-close")) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		const el = rootRef.current;
		const originX = el ? el.offsetLeft : x;
		const originY = el ? el.offsetTop : y;
		drag.current = {
			pointerX: e.clientX,
			pointerY: e.clientY,
			originX,
			originY,
		};
	}

	function onTitlePointerMove(e: React.PointerEvent<HTMLElement>) {
		const d = drag.current;
		const el = rootRef.current;
		if (!d || !el) return;
		// Live DOM only — avoids re-rendering the whole desktop every move
		el.style.left = `${d.originX + (e.clientX - d.pointerX)}px`;
		el.style.top = `${d.originY + (e.clientY - d.pointerY)}px`;
	}

	function onTitlePointerUp(e: React.PointerEvent<HTMLElement>) {
		const d = drag.current;
		if (!d) return;
		drag.current = null;
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId);
		}
		const el = rootRef.current;
		const nx = el ? el.offsetLeft : d.originX + (e.clientX - d.pointerX);
		const ny = el ? el.offsetTop : d.originY + (e.clientY - d.pointerY);
		onMoveAction(nx, ny);
	}

	return (
		<section ref={rootRef} className="win" aria-label={title}>
			<header
				className="win-titlebar"
				onPointerDown={onTitlePointerDown}
				onPointerMove={onTitlePointerMove}
				onPointerUp={onTitlePointerUp}
				onPointerCancel={onTitlePointerUp}
			>
				{icon ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						className="win-titlebar__icon"
						src={icon}
						alt=""
						draggable={false}
					/>
				) : null}
				<span className="win-titlebar__text">{title}</span>
				<button
					type="button"
					className="win-close chrome-raised"
					aria-label="Close"
					onClick={onCloseAction}
					onPointerDown={(ev) => ev.stopPropagation()}
				>
					×
				</button>
			</header>
			<div className="win__client chrome-sunken">{children}</div>
		</section>
	);
}

export const Window = memo(WindowInner);
