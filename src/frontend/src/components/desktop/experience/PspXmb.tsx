"use client";

import { useEffect, useReducer, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { PROJECTS, WORK, type Project } from "./experienceData";

type PspCategoryId = "jobs" | "projects" | "settings" | "photo" | "music" | "video" | "game" | "network" | "psn";
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
};

type ViewAction =
	| { type: "category"; delta: number }
	| { type: "select-category"; index: number }
	| { type: "item"; delta: number }
	| { type: "select-item"; index: number }
	| { type: "toggle-options" };

const EMPTY_ITEMS: readonly Project[] = [];

export const CATEGORIES: readonly PspCategory[] = [
	{ id: "jobs", label: "Jobs", icon: "jobs", items: WORK, artwork: "/photos/jobs-image.png" },
	{ id: "projects", label: "Projects", icon: "projects", items: PROJECTS, artwork: "/photos/projects-image.png" },
	{ id: "settings", label: "Settings", icon: "settings", items: EMPTY_ITEMS, disabled: true },
	{ id: "photo", label: "Photo", icon: "photo", items: EMPTY_ITEMS, disabled: true },
	{ id: "music", label: "Music", icon: "music", items: EMPTY_ITEMS, disabled: true },
	{ id: "video", label: "Video", icon: "video", items: EMPTY_ITEMS, disabled: true },
	{ id: "game", label: "Game", icon: "game", items: EMPTY_ITEMS, disabled: true },
	{ id: "network", label: "Network", icon: "network", items: EMPTY_ITEMS, disabled: true },
	{ id: "psn", label: "PlayStation Network", icon: "psn", items: EMPTY_ITEMS, disabled: true },
];

const NAVIGABLE_CATEGORY_COUNT = CATEGORIES.findIndex((category) => category.disabled);
const wrap = (value: number, length: number) => (value + length) % length;

export function initialState(): ViewState {
	return { categoryIndex: 0, itemIndex: 0, optionsOpen: false };
}

export function reducer(state: ViewState, action: ViewAction): ViewState {
	const category = CATEGORIES[state.categoryIndex];

	switch (action.type) {
		case "category": {
			const categoryIndex = wrap(state.categoryIndex + action.delta, NAVIGABLE_CATEGORY_COUNT);
			return { ...state, categoryIndex, itemIndex: 0, optionsOpen: false };
		}
		case "select-category":
			return action.index < NAVIGABLE_CATEGORY_COUNT
				? { ...state, categoryIndex: action.index, itemIndex: 0, optionsOpen: false }
				: state;
		case "item":
			return {
				...state,
				itemIndex: category.items.length ? wrap(state.itemIndex + action.delta, category.items.length) : 0,
				optionsOpen: false,
			};
		case "select-item":
			return { ...state, itemIndex: action.index, optionsOpen: false };
		case "toggle-options":
			return { ...state, optionsOpen: !state.optionsOpen };
	}
}

const ICON_PATHS: Record<PspIconName, ReactNode> = {
	jobs: <><rect x="7" y="14" width="34" height="25" rx="2" /><path d="M17 14v-4h14v4M7 22h34M21 22v4h6v-4" /></>,
	projects: <><path d="M5 13h13l4 4h21v20H5z" /><path d="M5 18h38" /></>,
	settings: <><path d="m24 6 3 4 5-1 2 5-4 3 1 5 5 2-2 5-5-1-3 4-4-3-4 3-3-4-5 1-2-5 4-2-1-5-4-3 2-5 5 1 3-4z" /><circle cx="24" cy="24" r="6" /></>,
	photo: <><rect x="6" y="8" width="36" height="32" rx="2" /><circle cx="16" cy="18" r="3" /><path d="m8 35 10-10 7 7 5-5 10 8" /></>,
	music: <><path d="M18 34V11l20-4v23" /><circle cx="12" cy="35" r="6" /><circle cx="32" cy="31" r="6" /></>,
	video: <><rect x="5" y="11" width="29" height="26" rx="2" /><path d="m34 19 9-5v20l-9-5z" /></>,
	game: <><path d="M10 18c2-6 8-8 14-4 6-4 12-2 14 4l4 13c1 5-5 8-8 4l-5-6H19l-5 6c-3 4-9 1-8-4z" /><path d="M14 21v8M10 25h8M31 23h.1M37 28h.1" /></>,
	network: <><circle cx="24" cy="24" r="17" /><path d="M7 24h34M24 7c5 5 7 11 7 17s-2 12-7 17c-5-5-7-11-7-17s2-12 7-17zM10 14h28M10 34h28" /></>,
	psn: <><path d="M17 38V9l10 3c5 2 8 6 8 11 0 5-3 8-8 8l-5-1" /><path d="m11 36 15-5M11 40l23-7" /></>,
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

function openExternal(href?: string) {
	if (href) window.open(href, "_blank", "noopener,noreferrer");
}

export function PspXmb() {
	const [state, dispatch] = useReducer(reducer, undefined, initialState);
	const rootRef = useRef<HTMLDivElement>(null);
	const selectedItemRef = useRef<HTMLButtonElement>(null);
	const category = CATEGORIES[state.categoryIndex];
	const project = category.items[state.itemIndex];
	const screenArtwork = category.artwork;
	useEffect(() => {
		rootRef.current?.focus({ preventScroll: true });
	}, []);

	useEffect(() => {
		selectedItemRef.current?.scrollIntoView({ block: "nearest" });
	}, [state.categoryIndex, state.itemIndex]);

	function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.target !== event.currentTarget) return;
		if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
			event.preventDefault();
			dispatch({ type: "category", delta: -1 });
		} else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
			event.preventDefault();
			dispatch({ type: "category", delta: 1 });
		} else if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
			event.preventDefault();
			dispatch({ type: "item", delta: -1 });
		} else if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
			event.preventDefault();
			dispatch({ type: "item", delta: 1 });
		} else if (event.key === "Enter" || event.key.toLowerCase() === "x") {
			event.preventDefault();
			openExternal(project?.href);
		} else if (event.key === "Escape" || event.key === "Backspace") {
			event.preventDefault();
			if (state.optionsOpen) dispatch({ type: "toggle-options" });
		} else if (event.key.toLowerCase() === "o") {
			event.preventDefault();
			dispatch({ type: "toggle-options" });
		}
	}

	return (
		<div
			ref={rootRef}
			className="psp-xmb"
			style={screenArtwork ? {
				backgroundImage: `linear-gradient(90deg, rgba(0, 0, 0, 0.48) 0%, rgba(0, 0, 0, 0.2) 48%, transparent 78%), linear-gradient(180deg, rgba(0, 0, 0, 0.38), transparent 48%), linear-gradient(rgba(9, 19, 30, 0.2), rgba(2, 6, 11, 0.72)), url("${screenArtwork}")`,
				backgroundPosition: "center",
				backgroundSize: "cover",
			} : undefined}
			data-category={category.id}
			data-no-window-drag
			tabIndex={0}
			role="application"
			aria-label="PSP project browser"
			onPointerDown={(event) => event.stopPropagation()}
			onKeyDown={onKeyDown}
		>
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
					<button type="button" role="menuitem" onClick={() => openExternal(project?.href)}>Open link</button>
					<button type="button" role="menuitem" onClick={() => dispatch({ type: "toggle-options" })}>Close</button>
				</div>
			) : null}
			<button className="psp-xmb__select" type="button" onClick={() => dispatch({ type: "toggle-options" })}>SELECT&nbsp; Options</button>
		</div>
	);
}
