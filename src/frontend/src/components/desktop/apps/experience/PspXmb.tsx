"use client";

import { useEffect, useReducer, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { PROJECTS, WORK, type Project } from "./experienceData";

type PspCategoryId = "jobs" | "projects" | "settings" | "photo" | "music";
type PspIconName = PspCategoryId | "folder";

type PspCategory = {
	id: PspCategoryId;
	label: string;
	icon: PspIconName;
	items: readonly Project[];
	artwork?: string;
	disabled?: boolean;
};

type ViewState = {
	categoryIndex: number;
	itemIndex: number;
	optionsOpen: boolean;
	optionsIndex: number;
};

type ViewAction =
	| { type: "category"; delta: number }
	| { type: "select-category"; index: number }
	| { type: "item"; delta: number }
	| { type: "select-item"; index: number }
	| { type: "option"; delta: number }
	| { type: "toggle-options" };

const EMPTY_ITEMS: readonly Project[] = [];

export const CATEGORIES: readonly PspCategory[] = [
	{ id: "jobs", label: "Work", icon: "jobs", items: WORK, artwork: "/photos/jobs-image.webp" },
	{ id: "projects", label: "Projects", icon: "projects", items: PROJECTS, artwork: "/photos/projects-image.png" },
	{ id: "settings", label: "Settings", icon: "settings", items: EMPTY_ITEMS, disabled: true },
	{ id: "photo", label: "Photo", icon: "photo", items: EMPTY_ITEMS, disabled: true },
	{ id: "music", label: "Music", icon: "music", items: EMPTY_ITEMS, disabled: true },
];

const NAVIGABLE_CATEGORY_COUNT = CATEGORIES.findIndex((category) => category.disabled);
const wrap = (value: number, length: number) => (value + length) % length;

export function initialState(): ViewState {
	return { categoryIndex: 0, itemIndex: 0, optionsOpen: false, optionsIndex: 0 };
}

export function reducer(state: ViewState, action: ViewAction): ViewState {
	const category = CATEGORIES[state.categoryIndex];

	switch (action.type) {
		case "category": {
			const categoryIndex = wrap(state.categoryIndex + action.delta, NAVIGABLE_CATEGORY_COUNT);
			return { ...state, categoryIndex, itemIndex: 0, optionsOpen: false, optionsIndex: 0 };
		}
		case "select-category":
			return action.index < NAVIGABLE_CATEGORY_COUNT
				? { ...state, categoryIndex: action.index, itemIndex: 0, optionsOpen: false, optionsIndex: 0 }
				: state;
		case "item":
			return {
				...state,
				itemIndex: category.items.length ? wrap(state.itemIndex + action.delta, category.items.length) : 0,
				optionsOpen: false,
				optionsIndex: 0,
			};
		case "select-item":
			return { ...state, itemIndex: action.index, optionsOpen: false, optionsIndex: 0 };
		case "option":
			return state.optionsOpen ? { ...state, optionsIndex: wrap(state.optionsIndex + action.delta, 2) } : state;
		case "toggle-options":
			return { ...state, optionsOpen: !state.optionsOpen, optionsIndex: 0 };
	}
}

const ICON_PATHS: Record<PspIconName, ReactNode> = {
	jobs: <><rect x="7" y="14" width="34" height="25" rx="2" /><path d="M17 14v-4h14v4M7 22h34M21 22v4h6v-4" /></>,
	projects: <><path d="M5 13h13l4 4h21v20H5z" /><path d="M5 18h38" /></>,
	settings: <><path d="m24 6 3 4 5-1 2 5-4 3 1 5 5 2-2 5-5-1-3 4-4-3-4 3-3-4-5 1-2-5 4-2-1-5-4-3 2-5 5 1 3-4z" /><circle cx="24" cy="24" r="6" /></>,
	photo: <><rect x="6" y="8" width="36" height="32" rx="2" /><circle cx="16" cy="18" r="3" /><path d="m8 35 10-10 7 7 5-5 10 8" /></>,
	music: <><path d="M18 34V11l20-4v23" /><circle cx="12" cy="35" r="6" /><circle cx="32" cy="31" r="6" /></>,
	folder: <><path d="M5 13h13l4 4h17v19H5z" /><path d="M5 18h34" /></>,
};

function Icon({ name }: { name: PspIconName }) {
	return <svg className="psp-xmb__icon" viewBox="0 0 48 48" aria-hidden="true">{ICON_PATHS[name]}</svg>;
}

function StatusBar() {
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const timer = window.setInterval(() => setNow(new Date()), 30_000);
		return () => window.clearInterval(timer);
	}, []);

	return (
		<div className="psp-xmb__status" aria-label="System status">
			<span>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
			<span className="psp-xmb__battery" aria-label="Battery full"><i /></span>
		</div>
	);
}

/** The PSP's d-pad and buttons: arrows or WASD, Enter or X, Escape or Backspace, and O for options. */
const KEYS: Record<string, "left" | "right" | "up" | "down" | "enter" | "back" | "options"> = {
	ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right",
	ArrowUp: "up", w: "up", ArrowDown: "down", s: "down",
	Enter: "enter", x: "enter", Escape: "back", Backspace: "back", o: "options",
};

function openExternal(href?: string) {
	if (href) window.open(href, "_blank", "noopener,noreferrer");
}

export function PspXmb({ ready }: { ready: boolean }) {
	const [state, dispatch] = useReducer(reducer, undefined, initialState);
	const rootRef = useRef<HTMLDivElement>(null);
	const selectedItemRef = useRef<HTMLButtonElement>(null);
	const category = CATEGORIES[state.categoryIndex];
	const project = category.items[state.itemIndex];
	function focusRoot() {
		rootRef.current?.focus({ preventScroll: true });
	}

	useEffect(() => {
		const root = rootRef.current;
		const windowRoot = root?.closest<HTMLElement>(".win");
		// Decoding can finish after the user switches away or minimizes the app.
		if (ready && windowRoot?.dataset.active === "true" && !windowRoot.inert) {
			root?.focus({ preventScroll: true });
		}
	}, [ready]);

	useEffect(() => {
		selectedItemRef.current?.scrollIntoView({ block: "nearest" });
	}, [state.categoryIndex, state.itemIndex]);

	function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		const action = event.key === "Tab" ? "tab" : KEYS[event.key] ?? KEYS[event.key.toLowerCase()];
		// The options menu only takes up, down, enter and back.
		if (!action || (state.optionsOpen && (action === "left" || action === "right" || action === "options"))) return;
		event.preventDefault();
		// Focus stays on the XMB itself; its buttons only mark what Enter acts on.
		focusRoot();
		const target = event.target as HTMLElement;
		const indexOf = (selector: string) => target.closest<HTMLElement>(selector)?.dataset.index;
		const step = action === "up" || action === "left" ? -1 : 1;

		if (state.optionsOpen) {
			if (action === "up" || action === "down") dispatch({ type: "option", delta: step });
			else if (action === "back" || Number(indexOf(".psp-xmb__options button") ?? state.optionsIndex) !== 0) dispatch({ type: "toggle-options" });
			else openExternal(project?.href);
		} else if (action === "left" || action === "right") {
			dispatch({ type: "category", delta: step });
		} else if (action === "up" || action === "down") {
			dispatch({ type: "item", delta: step });
		} else if (action === "options") {
			dispatch({ type: "toggle-options" });
		} else if (action === "enter") {
			const categoryIndex = indexOf(".psp-xmb__category");
			const itemIndex = indexOf(".psp-xmb__item");
			if (categoryIndex !== undefined) dispatch({ type: "select-category", index: Number(categoryIndex) });
			else if (itemIndex !== undefined && Number(itemIndex) !== state.itemIndex) dispatch({ type: "select-item", index: Number(itemIndex) });
			else if (itemIndex === undefined && target.closest(".psp-xmb__select")) dispatch({ type: "toggle-options" });
			else openExternal(project?.href);
		}
		// Back has nothing to back out of outside the options menu, and Tab only returns focus.
	}

	return (
		<div
			ref={rootRef}
			className="psp-xmb"
			data-category={category.id}
			data-window-focus
			data-no-window-drag
			tabIndex={0}
			role="application"
			aria-label="PSP project browser"
			onPointerDown={(event) => event.stopPropagation()}
			onClickCapture={() => focusRoot()}
			onKeyDown={onKeyDown}
		>
			{/* Every category's artwork stays rendered, so switching categories never waits for a load. */}
			{CATEGORIES.map((entry) => entry.artwork && (
				// eslint-disable-next-line @next/next/no-img-element
				<img key={entry.id} className={entry === category ? "psp-xmb__artwork is-current" : "psp-xmb__artwork"} src={entry.artwork} alt="" draggable={false} />
			))}
			{category.artwork && <div className="psp-xmb__shade" aria-hidden="true" />}
			<div className="psp-xmb__wave" aria-hidden="true" />
			<StatusBar />
			<div className="psp-xmb__categories" role="tablist" aria-label="Categories">
				{CATEGORIES.map((entry, index) => (
					<button
						key={entry.id}
						type="button"
						className={["psp-xmb__category", index === state.categoryIndex ? "is-selected" : "", entry.disabled ? "is-disabled" : ""].filter(Boolean).join(" ")}
						role="tab"
						aria-selected={index === state.categoryIndex}
						aria-disabled={entry.disabled || undefined}
						disabled={entry.disabled}
						tabIndex={-1}
						data-index={index}
						onClick={() => dispatch({ type: "select-category", index })}
					>
						<Icon name={entry.icon} />
						<span>{entry.label}</span>
					</button>
				))}
			</div>
			<div className="psp-xmb__selection">
				<div className="psp-xmb__items" role="listbox" aria-label={`${category.label} items`}>
					{category.items.map((entry, index) => (
						<button
							key={entry.id}
							type="button"
							className={index === state.itemIndex ? "psp-xmb__item is-selected" : "psp-xmb__item"}
							role="option"
							aria-selected={index === state.itemIndex}
							tabIndex={-1}
							data-index={index}
							ref={index === state.itemIndex ? selectedItemRef : undefined}
							onClick={() => {
								if (entry.href) openExternal(entry.href);
								else if (index !== state.itemIndex) dispatch({ type: "select-item", index });
							}}
						>
							{entry.src ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img className="psp-xmb__item-image" src={entry.src} alt="" draggable={false} />
							) : <Icon name="folder" />}
							<span className="psp-xmb__item-content">
								<strong>{entry.title}</strong>
								<span>{entry.blurb}</span>
							</span>
						</button>
					))}
				</div>
			</div>
			{state.optionsOpen ? (
				<div className="psp-xmb__options" role="menu">
					<button className={state.optionsIndex === 0 ? "is-selected" : ""} type="button" role="menuitem" tabIndex={-1} data-index={0} onClick={() => openExternal(project?.href)}>Open link</button>
					<button className={state.optionsIndex === 1 ? "is-selected" : ""} type="button" role="menuitem" tabIndex={-1} data-index={1} onClick={() => dispatch({ type: "toggle-options" })}>Close</button>
				</div>
			) : null}
			<button className="psp-xmb__select" type="button" tabIndex={-1} onClick={() => dispatch({ type: "toggle-options" })}>SELECT&nbsp; Options</button>
		</div>
	);
}
