"use client";

import {
	memo,
	useEffect,
	useLayoutEffect,
	useRef,
	type ReactNode,
} from "react";
import "./window.css";

type Props = {
	title: string;
	icon?: string;
	x: number;
	y: number;
	w: number;
	h: number;
	z: number;
	/**
	 * When true, report moves every frame (needed for nested crop / child follow).
	 * Default false: DOM-only drag, commit on pointerup.
	 */
	liveMove?: boolean;
	/** Client callback — *Action suffix satisfies Next TS 71007 */
	onCloseAction: () => void;
	onMoveAction: (x: number, y: number) => void;
	children?: ReactNode;
};

type DragOrigin = {
	pointerX: number;
	pointerY: number;
	originX: number;
	originY: number;
	live: boolean;
	raf: number;
	pendingX: number;
	pendingY: number;
};

function applyGeometry(
	el: HTMLElement,
	g: { x: number; y: number; w: number; h: number; z: number },
) {
	el.style.left = `${g.x}px`;
	el.style.top = `${g.y}px`;
	el.style.width = `${g.w}px`;
	el.style.height = `${g.h}px`;
	el.style.zIndex = String(g.z);
}

function dragDelta(d: DragOrigin, clientX: number, clientY: number) {
	return {
		x: d.originX + (clientX - d.pointerX),
		y: d.originY + (clientY - d.pointerY),
	};
}

function WindowInner({
	title,
	icon,
	x,
	y,
	w,
	h,
	z,
	liveMove = false,
	onCloseAction,
	onMoveAction,
	children,
}: Props) {
	const rootRef = useRef<HTMLElement>(null);
	const drag = useRef<DragOrigin | null>(null);
	const moveRef = useRef(onMoveAction);

	useEffect(() => {
		moveRef.current = onMoveAction;
	}, [onMoveAction]);

	useLayoutEffect(() => {
		// Don't fight a non-live drag (DOM is source of truth mid-drag)
		if (drag.current && !drag.current.live) return;
		const el = rootRef.current;
		if (!el) return;
		applyGeometry(el, { x, y, w, h, z });
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
			live: liveMove,
			raf: 0,
			pendingX: originX,
			pendingY: originY,
		};
	}

	function onTitlePointerMove(e: React.PointerEvent<HTMLElement>) {
		const d = drag.current;
		const el = rootRef.current;
		if (!d || !el) return;
		const { x: nx, y: ny } = dragDelta(d, e.clientX, e.clientY);

		if (!d.live) {
			// Cheap path: no React until pointerup
			el.style.left = `${nx}px`;
			el.style.top = `${ny}px`;
			return;
		}

		// Nested / parent-of-nested: keep React geometry live (crop + children)
		d.pendingX = nx;
		d.pendingY = ny;
		if (d.raf) return;
		d.raf = requestAnimationFrame(() => {
			const cur = drag.current;
			if (!cur) return;
			cur.raf = 0;
			moveRef.current(cur.pendingX, cur.pendingY);
		});
	}

	function onTitlePointerUp(e: React.PointerEvent<HTMLElement>) {
		const d = drag.current;
		if (!d) return;
		if (d.raf) {
			cancelAnimationFrame(d.raf);
			d.raf = 0;
		}
		drag.current = null;
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId);
		}
		const el = rootRef.current;
		if (d.live) {
			moveRef.current(d.pendingX, d.pendingY);
			return;
		}
		const nx = el ? el.offsetLeft : d.originX + (e.clientX - d.pointerX);
		const ny = el ? el.offsetTop : d.originY + (e.clientY - d.pointerY);
		moveRef.current(nx, ny);
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
