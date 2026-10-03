"use client";

import { useEffect, useRef, useState } from "react";
import { ActivityCalendar, type Activity } from "react-activity-calendar";
import { GITHUB_USER } from "../../files/catalog";
import "./github-graph.css";

const API = "https://github-contributions-api.jogruber.de/v4/";
const THEME = {
	dark: ["#1a1a1a", "#3d1515", "#6b1c1c", "#9a2222", "#af0000"],
};

/** One fetch per page load — avoids AbortError from Strict Mode remount. */
let contributionsRequest: Promise<Activity[]> | null = null;

function loadContributions(): Promise<Activity[]> {
	contributionsRequest ??= fetch(`${API}${GITHUB_USER}?y=last`)
		.then(async (res) => {
			const data = (await res.json()) as {
				contributions?: Activity[];
				error?: string;
			};
			if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
			return data.contributions ?? [];
		})
		.catch((err: unknown) => {
			contributionsRequest = null;
			throw err;
		});
	return contributionsRequest;
}

export function GitHubGraph() {
	const rootRef = useRef<HTMLDivElement>(null);
	const [data, setData] = useState<Activity[] | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let alive = true;
		void loadContributions()
			.then((rows) => {
				if (alive) setData(rows);
			})
			.catch(() => {
				if (alive) setFailed(true);
			});
		return () => {
			alive = false;
		};
	}, []);

	useEffect(() => {
		const root = rootRef.current;
		if (!root || !data) return;

		// With loading=false the calendar commits its scroll container with data.
		const sc = root.querySelector<HTMLElement>(".react-activity-calendar__scroll-container");
		if (!sc) return;
		sc.scrollLeft = sc.scrollWidth;

		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
		if (reducedMotion.matches) return;

		let stopped = false;
		let timer = 0;
		let all: SVGRectElement[] = [];
		let active: SVGRectElement[] = [];
		const popping = new Map<SVGRectElement, Animation>();

		// Chrome cannot animate SVG shapes on the compositor, so popping a cell itself
		// repaints the calendar on every frame. Instead an HTML copy of the cell pops
		// above it while the cell hides, and the calendar repaints only as a pop
		// starts and ends. The copies live in a layer the size of the SVG, so a pop
		// never changes how far the calendar scrolls.
		const layer = document.createElement("div");
		layer.className = "git-cell-pops";

		/** Caches the cells and lines the layer up with them; false until the calendar has committed them. */
		const prepare = () => {
			all = [...root.querySelectorAll<SVGRectElement>(
				".react-activity-calendar__calendar rect[data-level]",
			)];
			active = all.filter((e) => Number(e.dataset.level) > 0);
			const svg = all[0]?.ownerSVGElement;
			if (!svg) return false;

			// The SVG is the scroll container's only child and a block, so it starts at the padding edge.
			const { paddingLeft, paddingTop } = getComputedStyle(sc);
			Object.assign(layer.style, {
				left: paddingLeft,
				top: paddingTop,
				width: `${svg.width.baseVal.value}px`,
				height: `${svg.height.baseVal.value}px`,
			});
			sc.append(layer);
			return true;
		};

		const pop = (cell: SVGRectElement) => {
			const current = popping.get(cell);
			if (current) {
				current.currentTime = 0;
				return;
			}

			// Read from attributes, not layout. Each week of cells is a translated group.
			const week = (cell.parentNode as SVGGElement).transform.baseVal.consolidate()?.matrix;
			const copy = document.createElement("span");
			copy.className = "git-cell-pop";
			copy.dataset.date = cell.dataset.date;
			Object.assign(copy.style, {
				left: `${cell.x.baseVal.value + (week?.e ?? 0)}px`,
				top: `${cell.y.baseVal.value + (week?.f ?? 0)}px`,
				width: `${cell.width.baseVal.value}px`,
				height: `${cell.height.baseVal.value}px`,
				borderRadius: `${cell.rx.baseVal.value}px`,
				backgroundColor: getComputedStyle(cell).fill,
			});
			layer.append(copy);

			// Keep CSS as the timing/keyframe source.
			const animation = copy.getAnimations().find((animation) =>
				animation instanceof CSSAnimation && animation.animationName === "git-cell-pop");
			if (!animation) throw new Error("The git-cell-pop animation did not start");

			cell.classList.add("git-cell-popping");
			popping.set(cell, animation);
			const end = () => {
				copy.remove();
				cell.classList.remove("git-cell-popping");
				popping.delete(cell);
			};
			// Reduced motion or cleanup cancels the animation instead of finishing it.
			animation.finished.then(end, end);
		};

		const tick = () => {
			if (stopped) return;
			// Reduced motion can also switch on after the calendar has loaded.
			if (document.hidden || reducedMotion.matches) {
				timer = window.setTimeout(tick, 800);
				return;
			}
			// Cells keep their DOM identity until data changes and this effect restarts.
			// Retry only if the calendar has not committed its cells yet.
			if (all.length === 0 && !prepare()) {
				timer = window.setTimeout(tick, 200);
				return;
			}
			const pool = active.length > 0 && Math.random() < 0.75 ? active : all;
			const cell = pool[Math.floor(Math.random() * pool.length)];
			if (cell) pop(cell);
			timer = window.setTimeout(tick, 200 + 180 * Math.random());
		};

		tick();
		return () => {
			stopped = true;
			window.clearTimeout(timer);
			// Removing the copies cancels their pops, which shows the cells again.
			layer.remove();
		};
	}, [data]);

	return (
		<div className="gh-app" ref={rootRef}>
			{failed ? (
				<span className="gh-app__err">couldn&apos;t load activity</span>
			) : (
				<ActivityCalendar
					data={data ?? []}
					loading={!data}
					colorScheme="dark"
					blockSize={11}
					blockMargin={3}
					fontSize={11}
					maxLevel={4}
					showColorLegend={false}
					showTotalCount={false}
					theme={THEME}
				/>
			)}
		</div>
	);
}
