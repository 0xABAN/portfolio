"use client";

import { useState } from "react";
import { GITHUB_URL } from "../windows";
import {
	ALL_ITEMS,
	PROJECTS,
	EXP_MENUS,
	EXP_TOOLBAR,
	WORK,
	type Project,
} from "./experienceData";
import "./experience.css";

const FAVS = ["Home", "Recents"] as const;

function openExternal(href: string) {
	window.open(href, "_blank", "noopener,noreferrer");
}

function Card({
	p,
	selected,
	onSelect,
}: {
	p: Project;
	selected: boolean;
	onSelect: (p: Project) => void;
}) {
	return (
		<button
			type="button"
			className={selected ? "exp__card exp__card--selected" : "exp__card"}
			onClick={() => onSelect(p)}
		>
			<div className="exp__thumb">
				{p.src ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={p.src} alt="" draggable={false} />
				) : (
					<span className="exp__thumb-mono" aria-hidden>
						{p.title.slice(0, 1).toUpperCase()}
					</span>
				)}
			</div>
			<span className="exp__card-title">{p.title}</span>
			<span className="exp__card-blurb">{p.blurb}</span>
		</button>
	);
}

function CardGrid({
	items,
	selected,
	onSelect,
}: {
	items: readonly Project[];
	selected: string;
	onSelect: (p: Project) => void;
}) {
	return (
		<ul className="exp__grid">
			{items.map((p) => (
				<li key={p.id}>
					<Card p={p} selected={p.id === selected} onSelect={onSelect} />
				</li>
			))}
		</ul>
	);
}

export function Experience() {
	const [selected, setSelected] = useState(ALL_ITEMS[0]?.id ?? "");

	const pick = (p: Project) => {
		setSelected(p.id);
		if (p.href) openExternal(p.href);
	};

	return (
		<div className="exp" aria-label="Experience">
			<div className="exp__menu" aria-hidden>
				{EXP_MENUS.map((m) => (
					<span key={m} className="exp__menu-item">
						{m}
					</span>
				))}
			</div>

			<div className="exp__toolbar" aria-hidden>
				{EXP_TOOLBAR.map((t) => (
					<span key={t} className="exp__tool">
						{t}
					</span>
				))}
			</div>

			<div className="exp__address" aria-hidden>
				<span className="exp__address-label">Address</span>
				<div className="exp__address-field">experience</div>
			</div>

			<div className="exp__search">
				<div className="exp__search-field" aria-hidden>
					Search experience…
				</div>
				<button
					type="button"
					className="exp__search-btn"
					onClick={() => openExternal(GITHUB_URL)}
				>
					GitHub
				</button>
			</div>

			<div className="exp__body">
				<aside className="exp__side">
					<div className="exp__side-group">
						<div className="exp__side-heading">Favorites</div>
						<ul className="exp__side-list">
							{FAVS.map((label, i) => (
								<li key={label}>
									<span
										className={
											i === 0
												? "exp__side-item exp__side-item--active"
												: "exp__side-item"
										}
									>
										{label}
									</span>
								</li>
							))}
						</ul>
					</div>
					<div className="exp__side-group">
						<div className="exp__side-heading">Favorite Files</div>
						<ul className="exp__side-list">
							{ALL_ITEMS.map((p) => (
								<li key={p.id}>
									<button
										type="button"
										className={
											p.id === selected
												? "exp__side-item exp__side-item--active"
												: "exp__side-item"
										}
										onClick={() => pick(p)}
									>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src="/icons/notepad.svg"
											alt=""
											width={14}
											height={14}
											draggable={false}
										/>
										<span>{p.fileName}</span>
									</button>
								</li>
							))}
						</ul>
					</div>
				</aside>

				<main className="exp__main">
					<div className="exp__section-label">Work</div>
					<CardGrid items={WORK} selected={selected} onSelect={pick} />

					<div className="exp__rule" role="separator" />

					<div className="exp__section-label">Projects</div>
					<CardGrid items={PROJECTS} selected={selected} onSelect={pick} />
				</main>
			</div>

			<div className="exp__status" aria-live="polite">
				{ALL_ITEMS.length} object{ALL_ITEMS.length === 1 ? "" : "s"}
			</div>
		</div>
	);
}
