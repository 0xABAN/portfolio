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
	variant?: "genesis";
	/** Report moves every frame (nested crop / child follow). Default: commit on pointerup. */
	liveMove?: boolean;
	minimizable?: boolean;
	onMinimizeAction: () => void;
	onMoveAction: (x: number, y: number) => void;
	onTrashAction?: () => void;
	onTrashHoverAction?: (hot: boolean) => void;
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

/** Windows stack above the bin — disable their hit-testing for elementFromPoint. */
function hitTrash(clientX: number, clientY: number) {
	const wins = document.querySelectorAll<HTMLElement>(".win");
	const prev = Array.from(wins, (n) => n.style.pointerEvents);
	for (const n of wins) n.style.pointerEvents = "none";
	const under = document.elementFromPoint(clientX, clientY);
	wins.forEach((n, i) => {
		n.style.pointerEvents = prev[i] ?? "";
	});
	return Boolean(under?.closest("[data-recycle-bin]"));
}

function WindowInner({
	title,
	icon,
	x,
	y,
	w,
	h,
	z,
	variant,
	liveMove = false,
	minimizable = true,
	onMinimizeAction,
	onMoveAction,
	onTrashAction,
	onTrashHoverAction,
	children,
}: Props) {
	const rootRef = useRef<HTMLElement>(null);
	const drag = useRef<DragOrigin | null>(null);
	const moveRef = useRef(onMoveAction);
	const trashRef = useRef(onTrashAction);
	const trashHoverRef = useRef(onTrashHoverAction);
	const trashHot = useRef(false);

	useEffect(() => {
		moveRef.current = onMoveAction;
		trashRef.current = onTrashAction;
		trashHoverRef.current = onTrashHoverAction;
	});

	function setTrashHot(hot: boolean) {
		if (trashHot.current === hot) return;
		trashHot.current = hot;
		trashHoverRef.current?.(hot);
	}

	useLayoutEffect(() => {
		if (drag.current && !drag.current.live) return;
		const el = rootRef.current;
		if (!el) return;
		applyGeometry(el, { x, y, w, h, z });
	}, [x, y, w, h, z]);

	function onTitlePointerDown(e: React.PointerEvent<HTMLElement>) {
		if ((e.target as HTMLElement).closest(".win-min")) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		const el = rootRef.current;
		const originX = el?.offsetLeft ?? x;
		const originY = el?.offsetTop ?? y;
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
		setTrashHot(hitTrash(e.clientX, e.clientY));

		if (!d.live) {
			el.style.left = `${nx}px`;
			el.style.top = `${ny}px`;
			return;
		}

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
		setTrashHot(false);
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId);
		}
		if (hitTrash(e.clientX, e.clientY) && trashRef.current) {
			trashRef.current();
			return;
		}
		const el = rootRef.current;
		const fallback = dragDelta(d, e.clientX, e.clientY);
		moveRef.current(
			d.live ? d.pendingX : (el?.offsetLeft ?? fallback.x),
			d.live ? d.pendingY : (el?.offsetTop ?? fallback.y),
		);
	}

	return (
		<section
			ref={rootRef}
			className={variant ? `win win--${variant}` : "win"}
			aria-label={title || "window"}
		>
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
				{minimizable ? (
					<button
						type="button"
						className="win-min chrome-raised"
						aria-label="Minimize"
						onClick={onMinimizeAction}
						onPointerDown={(ev) => ev.stopPropagation()}
					/>
				) : null}
			</header>
			<div className="win__client chrome-sunken">{children}</div>
		</section>
	);
}

export const Window = memo(WindowInner);
