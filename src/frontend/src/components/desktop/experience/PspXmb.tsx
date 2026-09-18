"use client";

import { useEffect, useReducer, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { GITHUB_URL } from "../windows";
import { ALL_ITEMS, PROJECTS, WORK, type Project } from "./experienceData";

type PspItem = {
	id: string;
	label: string;
	description: string;
	icon: PspIconName;
	project?: Project;
	href?: string;
};

type PspCategory = {
	id: string;
	label: string;
	icon: PspIconName;
	items: readonly PspItem[];
};

type PspIconName =
	| "settings"
	| "photo"
	| "music"
	| "video"
	| "game"
	| "network"
	| "psn"
	| "folder"
	| "memory-stick"
	| "link"
	| "info";

type ViewState = {
	categoryIndex: number;
	itemIndex: number;
	detailId: string | null;
	optionsOpen: boolean;
};

type ViewAction =
	| { type: "category"; delta: number }
	| { type: "select-category"; index: number }
	| { type: "item"; delta: number }
	| { type: "select-item"; index: number }
	| { type: "open" }
	| { type: "back" }
	| { type: "toggle-options" };

const wrap = (value: number, length: number) => (value + length) % length;

const projectItems = (projects: readonly Project[], icon: PspIconName): PspItem[] => projects.map((project) => ({
	id: project.id,
	label: project.title,
	description: project.blurb,
	icon,
	project,
	href: project.href,
}));

export const CATEGORIES: readonly PspCategory[] = [
	{
		id: "settings",
		label: "Settings",
		icon: "settings",
		items: [
			{ id: "about", label: "About this site", description: "A small portfolio running inside a PSP-style interface.", icon: "info" },
			{ id: "resume", label: "Resume", description: "Open the resume from the Win95 desktop.", icon: "folder" },
		],
	},
	{
		id: "photo",
		label: "Photo",
		icon: "photo",
		items: projectItems(WORK, "photo"),
	},
	{
		id: "music",
		label: "Music",
		icon: "music",
		items: [
			{ id: "memory-stick", label: "Memory Stick™", description: "Portfolio soundtrack and audio experiments.", icon: "memory-stick" },
			{ id: "soundtrack", label: "CD Player", description: "The desktop CD Player is available from the taskbar.", icon: "music" },
		],
	},
	{
		id: "video",
		label: "Video",
		icon: "video",
		items: projectItems(PROJECTS.slice(0, 3), "video"),
	},
	{
		id: "game",
		label: "Game",
		icon: "game",
		items: projectItems(ALL_ITEMS, "game"),
	},
	{
		id: "network",
		label: "Network",
		icon: "network",
		items: [
			{ id: "github", label: "GitHub", description: "Browse the source behind this portfolio.", icon: "link", href: GITHUB_URL },
			{ id: "linkedin", label: "LinkedIn", description: "Connect professionally.", icon: "link", href: "https://www.linkedin.com/in/adam-torres-encarnacion/" },
			{ id: "x", label: "X", description: "Follow along on X.", icon: "link", href: "https://x.com/0xABANN" },
		],
	},
	{
		id: "psn",
		label: "PlayStation®Network",
		icon: "psn",
		items: [
			{ id: "contact", label: "Contact", description: "Send a message and say hello.", icon: "link", href: "mailto:a@b" },
		],
	},
] as const;

export function initialState(): ViewState {
	return { categoryIndex: 2, itemIndex: 0, detailId: null, optionsOpen: false };
}

export function reducer(state: ViewState, action: ViewAction): ViewState {
	const category = CATEGORIES[state.categoryIndex];

	switch (action.type) {
		case "category": {
			const categoryIndex = wrap(state.categoryIndex + action.delta, CATEGORIES.length);
			return { categoryIndex, itemIndex: 0, detailId: null, optionsOpen: false };
		}
		case "select-category":
			return { categoryIndex: action.index, itemIndex: 0, detailId: null, optionsOpen: false };
		case "item":
			return {
				...state,
				itemIndex: wrap(state.itemIndex + action.delta, category.items.length),
				detailId: null,
				optionsOpen: false,
			};
		case "select-item":
			return { ...state, itemIndex: action.index, detailId: null, optionsOpen: false };
		case "open":
			return { ...state, detailId: category.items[state.itemIndex]?.id ?? null, optionsOpen: false };
		case "back":
			return { ...state, detailId: null, optionsOpen: false };
		case "toggle-options":
			return { ...state, optionsOpen: !state.optionsOpen };
	}
}

function Icon({ name }: { name: PspIconName }) {
	const paths: Record<PspIconName, ReactNode> = {
		settings: <><path d="m24 6 3 4 5-1 2 5-4 3 1 5 5 2-2 5-5-1-3 4-4-3-4 3-3-4-5 1-2-5 4-2-1-5-4-3 2-5 5 1 3-4z" /><circle cx="24" cy="24" r="6" /></>,
		photo: <><rect x="7" y="12" width="34" height="25" rx="3" /><path d="m11 32 8-8 6 6 5-5 7 7" /><circle cx="29" cy="20" r="3" /></>,
		music: <><path d="M17 35V11l19-4v24" /><path d="M17 31c0 4-11 6-11 1s11-7 11-1Zm19-4c0 4-11 6-11 1s11-7 11-1Z" /></>,
		video: <><rect x="6" y="11" width="28" height="26" rx="3" /><path d="m34 19 8-5v20l-8-5zM18 18l9 6-9 6z" /></>,
		game: <><path d="M12 31 8 20c-2-7 7-11 12-6h8c5-5 14-1 12 6l-4 11c-1 4-6 4-9 0l-2-3h-6l-2 3c-3 4-8 4-9 0Z" /><path d="M15 19v8m-4-4h8m13-3h.1m5 5h.1" /></>,
		network: <><circle cx="24" cy="24" r="16" /><path d="M8 24h32M24 8c5 5 7 11 7 16s-2 11-7 16c-5-5-7-11-7-16s2-11 7-16Z" /></>,
		psn: <><circle cx="24" cy="24" r="16" /><path d="M16 29c3-5 7-8 15-8M13 34c7-4 15-6 22-5M24 8c4 5 5 10 4 16" /></>,
		folder: <><path d="M5 13h13l4 4h17v19H5z" /><path d="M5 18h34" /></>,
		"memory-stick": <><path d="M14 7h16l5 5v25H14z" /><path d="M20 7v8m5-8v8m5-8v8M20 25h10m-10 5h10" /></>,
		link: <><path d="M19 29 15 33a6 6 0 0 1-9-8l7-7a6 6 0 0 1 9 0" /><path d="m29 19 4-4a6 6 0 0 1 9 8l-7 7a6 6 0 0 1-9 0" /><path d="m16 28 16-16" /></>,
		info: <><circle cx="24" cy="24" r="17" /><path d="M24 21v11M24 15v1" /></>,
	};

	return <svg className="psp-xmb__icon" viewBox="0 0 48 48" aria-hidden="true">{paths[name]}</svg>;
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

function Detail({ item, onBack }: { item: PspItem; onBack: () => void }) {
	return (
		<div className="psp-xmb__detail" data-page="detail">
			<button type="button" className="psp-xmb__back" onClick={onBack}>◀ Back</button>
			<div className="psp-xmb__detail-body">
				<div className="psp-xmb__detail-icon"><Icon name={item.icon} /></div>
				<div>
					<h2>{item.label}</h2>
					<p>{item.description}</p>
					{item.project?.src ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img className="psp-xmb__detail-image" src={item.project.src} alt="" />
					) : null}
					{item.href ? <a className="psp-xmb__detail-link" href={item.href} target="_blank" rel="noreferrer">Open ▶</a> : null}
				</div>
			</div>
			<div className="psp-xmb__hint">○ Back&nbsp;&nbsp; × Select</div>
		</div>
	);
}

export function PspXmb() {
	const [state, dispatch] = useReducer(reducer, undefined, initialState);
	const rootRef = useRef<HTMLDivElement>(null);
	const category = CATEGORIES[state.categoryIndex];
	const detailItem = state.detailId ? category.items.find((item) => item.id === state.detailId) : null;

	useEffect(() => {
		rootRef.current?.focus({ preventScroll: true });
	}, []);

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
		} else if (event.key === "Enter" || event.key === "x") {
			event.preventDefault();
			dispatch({ type: "open" });
		} else if (event.key === "Escape" || event.key === "Backspace" || event.key === "o") {
			event.preventDefault();
			if (state.detailId) dispatch({ type: "back" });
			else if (event.key === "o") dispatch({ type: "toggle-options" });
		}
	}

	return (
		<div
			ref={rootRef}
			className="psp-xmb"
			data-category={category.id}
			data-no-window-drag
			tabIndex={0}
			role="application"
			aria-label="PSP XrossMediaBar"
			onPointerDown={(event) => event.stopPropagation()}
			onKeyDown={onKeyDown}
		>
			<div className="psp-xmb__wave" aria-hidden="true" />
			<StatusBar />
			{detailItem ? (
				<Detail item={detailItem} onBack={() => dispatch({ type: "back" })} />
			) : (
				<>
					<div className="psp-xmb__categories" role="tablist" aria-label="Categories">
						{CATEGORIES.map((item, index) => (
							<button
								key={item.id}
								type="button"
								className={index === state.categoryIndex ? "psp-xmb__category is-selected" : "psp-xmb__category"}
								role="tab"
								aria-selected={index === state.categoryIndex}
								onClick={() => dispatch({ type: "select-category", index })}
							>
								<Icon name={item.icon} />
								<span>{item.label}</span>
							</button>
						))}
					</div>
					<div className="psp-xmb__selection">
						<div className="psp-xmb__selected-heading">
							<Icon name={category.icon} />
							<div><strong>{category.label}</strong><span>Memory Stick™</span></div>
						</div>
						<div className="psp-xmb__items" role="listbox" aria-label={`${category.label} items`}>
							{category.items.map((item, index) => (
								<button
									key={item.id}
									type="button"
									className={index === state.itemIndex ? "psp-xmb__item is-selected" : "psp-xmb__item"}
									role="option"
									aria-selected={index === state.itemIndex}
									onClick={() => {
										if (index === state.itemIndex) dispatch({ type: "open" });
										else dispatch({ type: "select-item", index });
									}}
								>
									<Icon name={item.icon} />
									<span>{item.label}</span>
								</button>
							))}
						</div>
					</div>
					{state.optionsOpen ? (
						<div className="psp-xmb__options" role="menu">
							<button type="button" role="menuitem" onClick={() => dispatch({ type: "open" })}>Information</button>
							<button type="button" role="menuitem" onClick={() => dispatch({ type: "toggle-options" })}>Close</button>
						</div>
					) : null}
					<button className="psp-xmb__select" type="button" onClick={() => dispatch({ type: "toggle-options" })}>SELECT&nbsp; Options</button>
				</>
			)}
		</div>
	);
}
