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
	id: string;
	active: boolean;
	minimized: boolean;
	onActivateAction: (id: string) => void;
	title: string;
	icon?: string;
	x: number;
	y: number;
	w: number;
	h: number;
	z: number;
	variant?: "dos";
	/** Report moves every frame (nested crop / child follow). Default: commit on pointerup. */
	liveMove?: boolean;
	minimizable?: boolean;
	onMinimizeAction: (id: string) => void;
	onCloseAction?: (id: string) => void;
	onMaximizeAction?: (id: string) => void;
	maximized?: boolean;
	onMoveAction: (id: string, x: number, y: number) => void;
	onTrashAction?: (id: string) => void;
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

function WindowInner({
	id,
	active,
	minimized,
	onActivateAction,
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
	onCloseAction,
	onMaximizeAction,
	maximized = false,
	onMoveAction,
	children,
}: Props) {
	const rootRef = useRef<HTMLElement>(null);
	const lastFocus = useRef<HTMLElement | null>(null);
	const drag = useRef<DragOrigin | null>(null);
	const moveRef = useRef(onMoveAction);

	useEffect(() => {
		moveRef.current = onMoveAction;
	});

	useLayoutEffect(() => {
		const el = rootRef.current;
		if (!el) return;
		// Activation still raises a window during its imperative drag.
		el.style.zIndex = String(z);
		if (drag.current && !drag.current.live) return;
		applyGeometry(el, { x, y, w, h, z });
	}, [x, y, w, h, z]);

	function onTitlePointerDown(e: React.PointerEvent<HTMLElement>) {
		if (maximized || (e.target as HTMLElement).closest(".win-min")) return;
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
			moveRef.current(id, cur.pendingX, cur.pendingY);
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
		const fallback = dragDelta(d, e.clientX, e.clientY);
		moveRef.current(
			id,
			d.live ? d.pendingX : (el?.offsetLeft ?? fallback.x),
			d.live ? d.pendingY : (el?.offsetTop ?? fallback.y),
		);
	}

	return (
		<section
			ref={rootRef}
			id={`desktop-window-${id}`}
			data-window-id={id}
			data-active={active}
			data-minimized={minimized}
			data-maximized={maximized}
			inert={minimized}
			aria-hidden={minimized || undefined}
			tabIndex={-1}
			className={variant ? `win win--${variant}` : "win"}
			aria-label={title || id}
			onPointerDownCapture={() => onActivateAction(id)}
			onFocusCapture={(event) => {
				onActivateAction(id);
				if (event.target === event.currentTarget) {
					if (lastFocus.current?.isConnected) lastFocus.current.focus({ preventScroll: true });
				} else if (!(event.target as HTMLElement).closest(".win-titlebar")) {
					lastFocus.current = event.target as HTMLElement;
				}
			}}
		>
			<header
				className="win-titlebar"
				onPointerDown={onTitlePointerDown}
				onPointerMove={onTitlePointerMove}
				onPointerUp={onTitlePointerUp}
				onPointerCancel={onTitlePointerUp}
				onDoubleClick={(event) => { if (!(event.target as HTMLElement).closest("button")) onMaximizeAction?.(id); }}
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
						onClick={() => onMinimizeAction(id)}
						onPointerDown={(ev) => ev.stopPropagation()}
					/>
				) : null}
				{onMaximizeAction && <button type="button" className={`win-min win-max chrome-raised${maximized ? " win-max--restore" : ""}`}
					aria-label={maximized ? "Restore window" : "Maximize"} onClick={() => onMaximizeAction(id)} onPointerDown={(event) => event.stopPropagation()} />}
				{onCloseAction ? (
					<button
						type="button"
						className="win-min win-close chrome-raised"
						aria-label={`Close ${title}`}
						onClick={() => onCloseAction(id)}
						onPointerDown={(ev) => ev.stopPropagation()}
					>
						×
					</button>
				) : null}
			</header>
			<div className="win__client chrome-sunken">{children}</div>
		</section>
	);
}

export const Window = memo(WindowInner);
