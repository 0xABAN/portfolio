"use client";

import { useEffect, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { ALL_ITEMS, type Project } from "./experienceData";

type PspIconName = "folder" | "link" | "info";

type TemplateItem = {
	id: string;
	label: string;
	description: string;
	icon: PspIconName;
};

type ViewState = {
	projectIndex: number;
	itemIndex: number;
	detailId: string | null;
	optionsOpen: boolean;
};

type ViewAction =
	| { type: "project"; delta: number }
	| { type: "select-project"; index: number }
	| { type: "item"; delta: number }
	| { type: "select-item"; index: number }
	| { type: "open" }
	| { type: "back" }
	| { type: "toggle-options" };

export const TEMPLATE_ITEMS: readonly TemplateItem[] = [
	{ id: "item-1", label: "Item 1", description: "Template item 1.", icon: "folder" },
	{ id: "item-2", label: "Item 2", description: "Template item 2.", icon: "folder" },
	{ id: "item-3", label: "Item 3", description: "Template item 3.", icon: "folder" },
];

export const PROJECTS_RAIL: readonly Project[] = ALL_ITEMS;

const wrap = (value: number, length: number) => (value + length) % length;

export function initialState(): ViewState {
	return { projectIndex: 0, itemIndex: 0, detailId: null, optionsOpen: false };
}

export function reducer(state: ViewState, action: ViewAction): ViewState {
	switch (action.type) {
		case "project": {
			const projectIndex = wrap(state.projectIndex + action.delta, PROJECTS_RAIL.length);
			return { ...state, projectIndex, detailId: null, optionsOpen: false };
		}
		case "select-project":
			return { ...state, projectIndex: action.index, detailId: null, optionsOpen: false };
		case "item":
			return {
				...state,
				itemIndex: wrap(state.itemIndex + action.delta, TEMPLATE_ITEMS.length),
				detailId: null,
				optionsOpen: false,
			};
		case "select-item":
			return { ...state, itemIndex: action.index, detailId: null, optionsOpen: false };
		case "open":
			return { ...state, detailId: PROJECTS_RAIL[state.projectIndex]?.id ?? null, optionsOpen: false };
		case "back":
			return { ...state, detailId: null, optionsOpen: false };
		case "toggle-options":
			return { ...state, optionsOpen: !state.optionsOpen };
	}
}

function Icon({ name }: { name: PspIconName }) {
	const paths: Record<PspIconName, ReactNode> = {
		folder: <><path d="M5 13h13l4 4h17v19H5z" /><path d="M5 18h34" /></>,
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

function Detail({ project, item, onBack }: { project: Project; item: TemplateItem; onBack: () => void }) {
	return (
		<div className="psp-xmb__detail" data-page="detail">
			<button type="button" className="psp-xmb__back" onClick={onBack}>◀ Back</button>
			<div className="psp-xmb__detail-body">
				<div className="psp-xmb__detail-icon"><Icon name={item.icon} /></div>
				<div>
					<h2>{project.title}</h2>
					<strong className="psp-xmb__detail-item">{item.label}</strong>
					<p>{project.blurb}</p>
					{project.src ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img className="psp-xmb__detail-image" src={project.src} alt="" />
					) : null}
					{project.href ? <a className="psp-xmb__detail-link" href={project.href} target="_blank" rel="noreferrer">Open ▶</a> : null}
				</div>
			</div>
			<div className="psp-xmb__hint">○ Back&nbsp;&nbsp; × Select</div>
		</div>
	);
}

export function PspXmb() {
	const [state, dispatch] = useReducer(reducer, undefined, initialState);
	const rootRef = useRef<HTMLDivElement>(null);
	const project = PROJECTS_RAIL[state.projectIndex];
	const item = TEMPLATE_ITEMS[state.itemIndex];
	const detailOpen = state.detailId !== null;

	useEffect(() => {
		rootRef.current?.focus({ preventScroll: true });
	}, []);

	function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.target !== event.currentTarget) return;
		if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
			event.preventDefault();
			dispatch({ type: "project", delta: -1 });
		} else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
			event.preventDefault();
			dispatch({ type: "project", delta: 1 });
		} else if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
			event.preventDefault();
			dispatch({ type: "item", delta: -1 });
		} else if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
			event.preventDefault();
			dispatch({ type: "item", delta: 1 });
		} else if (event.key === "Enter" || event.key.toLowerCase() === "x") {
			event.preventDefault();
			dispatch({ type: "open" });
		} else if (event.key === "Escape" || event.key === "Backspace") {
			event.preventDefault();
			if (detailOpen) dispatch({ type: "back" });
			else if (state.optionsOpen) dispatch({ type: "toggle-options" });
		} else if (event.key.toLowerCase() === "o") {
			event.preventDefault();
			dispatch({ type: "toggle-options" });
		}
	}

	return (
		<div
			ref={rootRef}
			className="psp-xmb"
			data-project={project.id}
			data-no-window-drag
			tabIndex={0}
			role="application"
			aria-label="PSP project browser"
			onPointerDown={(event) => event.stopPropagation()}
			onKeyDown={onKeyDown}
		>
			<div className="psp-xmb__wave" aria-hidden="true" />
			<StatusBar />
			{detailOpen ? (
				<Detail project={project} item={item} onBack={() => dispatch({ type: "back" })} />
			) : (
				<>
					<div
						className="psp-xmb__project-rail"
						style={{ "--project-index": state.projectIndex } as CSSProperties}
						role="listbox"
						aria-label="Projects"
					>
						{PROJECTS_RAIL.map((entry, index) => (
							<button
								key={entry.id}
								type="button"
								className={index === state.projectIndex ? "psp-xmb__project is-selected" : "psp-xmb__project"}
								role="option"
								aria-selected={index === state.projectIndex}
								aria-label={entry.title}
								onClick={() => index === state.projectIndex
									? dispatch({ type: "open" })
									: dispatch({ type: "select-project", index })}
							>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={entry.src} alt="" draggable={false} />
								<span>{entry.title}</span>
							</button>
						))}
					</div>
					<div className="psp-xmb__selected-project">
						<strong>{project.title}</strong>
						<span>Memory Stick™ · {project.blurb}</span>
					</div>
					<div className="psp-xmb__items" role="listbox" aria-label="Project items">
						{TEMPLATE_ITEMS.map((entry, index) => (
							<button
								key={entry.id}
								type="button"
								className={index === state.itemIndex ? "psp-xmb__item is-selected" : "psp-xmb__item"}
								role="option"
								aria-selected={index === state.itemIndex}
								onClick={() => index === state.itemIndex
									? dispatch({ type: "open" })
									: dispatch({ type: "select-item", index })}
							>
								<Icon name={entry.icon} />
								<span>{entry.label}</span>
							</button>
						))}
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
