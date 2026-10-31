import { memo, useEffect, useLayoutEffect, useRef, type Dispatch, type FocusEvent, type PointerEvent, type ReactNode, type SetStateAction } from "react";
import { minimizeWindowTree, type DesktopWindow } from "./windows";
import "./window.css";

type Props = {
	id: string;
	active: boolean;
	minimized: boolean;
	title: string;
	icon?: string;
	x: number;
	y: number;
	w: number;
	h: number;
	z: number;
	variant?: "dos" | "error";
	liveMove?: boolean;
	minimizable?: boolean;
	frameless?: boolean;
	dragAnywhere?: boolean;
	onActivateAction: (id: string) => void;
	onMinimizeAction: (id: string) => void;
	onCloseAction?: (id: string) => void;
	onMoveAction?: (id: string, x: number, y: number) => void;
	children?: ReactNode;
};

type Drag = { offsetX: number; offsetY: number; x: number; y: number; live: boolean; frame: number };

export const Window = memo(function Window({
	id, active, minimized, title, icon, x, y, w, h, z, variant,
	liveMove = false, minimizable = true, frameless = false, dragAnywhere = frameless,
	onActivateAction, onMinimizeAction, onCloseAction, onMoveAction, children,
}: Props) {
	const rootRef = useRef<HTMLElement>(null);
	const lastFocus = useRef<HTMLElement | null>(null);
	const drag = useRef<Drag | null>(null);
	const moveRef = useRef(onMoveAction);

	useEffect(() => {
		moveRef.current = onMoveAction;
	});

	useLayoutEffect(() => {
		const el = rootRef.current!;
		el.style.zIndex = String(z);
		if (drag.current && !drag.current.live) return;
		Object.assign(el.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
	}, [x, y, w, h, z]);

	function startDrag(event: PointerEvent<HTMLElement>) {
		if ((event.target as HTMLElement).closest(".win-min, [data-no-window-drag]")) return;
		const el = rootRef.current!;
		event.currentTarget.setPointerCapture(event.pointerId);
		el.toggleAttribute("data-dragging", true);
		drag.current = {
			offsetX: event.clientX - el.offsetLeft, offsetY: event.clientY - el.offsetTop,
			x: el.offsetLeft, y: el.offsetTop, live: liveMove, frame: 0,
		};
	}

	function moveDrag(event: PointerEvent<HTMLElement>) {
		const d = drag.current;
		if (!d) return;
		d.x = event.clientX - d.offsetX;
		d.y = event.clientY - d.offsetY;
		if (!d.live) {
			Object.assign(rootRef.current!.style, { left: `${d.x}px`, top: `${d.y}px` });
		} else if (!d.frame) {
			d.frame = requestAnimationFrame(() => {
				d.frame = 0;
				moveRef.current?.(id, d.x, d.y);
			});
		}
	}

	function endDrag(event: PointerEvent<HTMLElement>) {
		const d = drag.current;
		if (!d) return;
		cancelAnimationFrame(d.frame);
		drag.current = null;
		rootRef.current!.removeAttribute("data-dragging");
		if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
		moveRef.current?.(id, d.x, d.y);
	}

	function onFocusCapture(event: FocusEvent<HTMLElement>) {
		onActivateAction(id);
		const target = event.target as HTMLElement;
		if (target === event.currentTarget) {
			if (lastFocus.current?.isConnected) lastFocus.current.focus({ preventScroll: true });
		} else if (!target.closest(".win-titlebar")) {
			lastFocus.current = target;
		}
	}

	const dragHandlers = onMoveAction ? { onPointerDown: startDrag, onPointerMove: moveDrag, onPointerUp: endDrag, onPointerCancel: endDrag } : {};

	return (
		<section
			ref={rootRef}
			id={`desktop-window-${id}`}
			data-window-id={id}
			data-active={active}
			data-minimized={minimized}
			data-live-move={liveMove || undefined}
			inert={minimized}
			aria-hidden={minimized || undefined}
			tabIndex={-1}
			className={["win", variant && `win--${variant}`, frameless && "win--frameless"].filter(Boolean).join(" ")}
			aria-label={title || id}
			onPointerDownCapture={() => onActivateAction(id)}
			onFocusCapture={onFocusCapture}
			data-drag-anywhere={dragAnywhere || undefined}
			{...(dragAnywhere ? dragHandlers : {})}
		>
			{!frameless && (
				<header className="win-titlebar" {...(dragAnywhere ? {} : dragHandlers)}>
					{icon && <img className="win-titlebar__icon" src={icon} alt="" draggable={false} />}
					<span className="win-titlebar__text">{title}</span>
					{minimizable && (
						<button type="button" className="win-min chrome-raised" aria-label="Minimize"
							onClick={() => onMinimizeAction(id)} onPointerDown={(event) => event.stopPropagation()} />
					)}
					{onCloseAction && (
						<button type="button" className="win-min win-close chrome-raised" aria-label={`Close ${title}`}
							onClick={() => onCloseAction(id)} onPointerDown={(event) => event.stopPropagation()}>×</button>
					)}
				</header>
			)}
			<div className={frameless ? "win__client" : "win__client chrome-sunken"}>{children}</div>
		</section>
	);
});

const HIDE_DISTANCE = 120;

function distanceTo(rect: DOMRect, x: number, y: number) {
	return Math.hypot(Math.max(rect.left - x, 0, x - rect.right), Math.max(rect.top - y, 0, y - rect.bottom));
}

export function useTaskFlyout(id: string, shown: boolean, taskOrder: string, setWindows: Dispatch<SetStateAction<DesktopWindow[]>>) {
	useLayoutEffect(() => {
		if (!shown) return;
		const place = () => {
			const task = document.querySelector(`[data-task-id="${id}"]`);
			const layer = document.querySelector(".desktop__windows");
			if (!task || !layer) return;
			task.scrollIntoView({ block: "nearest", inline: "nearest" });
			const anchor = task.getBoundingClientRect();
			const origin = layer.getBoundingClientRect();
			setWindows((current) => {
				const flyout = current.find((w) => w.id === id);
				if (!flyout) return current;
				const x = Math.max(4, Math.min(anchor.left, window.innerWidth - flyout.w - 4)) - origin.left;
				const y = Math.max(0, anchor.top - flyout.h - 4) - origin.top;
				return x === flyout.x && y === flyout.y ? current : current.map((w) => (w === flyout ? { ...w, x, y } : w));
			});
		};
		place();
		window.addEventListener("resize", place);
		return () => window.removeEventListener("resize", place);
	}, [id, shown, taskOrder, setWindows]);

	useEffect(() => {
		if (!shown) return;
		let armed = false;
		const onPointerMove = (event: globalThis.PointerEvent) => {
			if (event.pointerType !== "mouse" || event.buttons) return;
			const flyout = document.getElementById(`desktop-window-${id}`);
			const task = document.querySelector(`[data-task-id="${id}"]`);
			if (!flyout || !task) return;
			const { clientX: x, clientY: y } = event;
			const distance = Math.min(distanceTo(flyout.getBoundingClientRect(), x, y), distanceTo(task.getBoundingClientRect(), x, y));
			if (distance <= HIDE_DISTANCE) armed = true;
			else if (armed) setWindows((current) => minimizeWindowTree(current, id));
		};
		window.addEventListener("pointermove", onPointerMove, { passive: true });
		return () => window.removeEventListener("pointermove", onPointerMove);
	}, [id, shown, setWindows]);
}
