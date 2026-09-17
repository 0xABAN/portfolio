"use client";

import { useEffect, useRef, useState } from "react";
import { ActivityCalendar, type Activity } from "react-activity-calendar";
import { GITHUB_USER } from "./windows";
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
		if (sc) sc.scrollLeft = sc.scrollWidth;

		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		let stopped = false;
		let timer = 0;
		let all: SVGRectElement[] = [];
		let active: SVGRectElement[] = [];

		const pop = (el: Element) => {
			el.classList.add("git-cell-pop");
			const animation = el.getAnimations().find((animation) =>
				animation instanceof CSSAnimation && animation.animationName === "git-cell-pop");
			// Keep CSS as the timing/keyframe source, including its reduced-motion rule.
			if (!animation) return;
			animation.currentTime = 0;
			animation.onfinish = () => el.classList.remove("git-cell-pop");
		};

		const tick = () => {
			if (stopped) return;
			if (document.hidden) {
				timer = window.setTimeout(tick, 800);
				return;
			}
			// Cells keep their DOM identity until data changes and this effect restarts.
			// Retry only if the calendar has not committed its cells yet.
			if (all.length === 0) {
				all = [...root.querySelectorAll<SVGRectElement>(
					".react-activity-calendar__calendar rect[data-level]",
				)];
				active = all.filter((e) => Number(e.dataset.level) > 0);
				if (all.length === 0) {
					timer = window.setTimeout(tick, 200);
					return;
				}
			}
			const pool = active.length > 0 && Math.random() < 0.75 ? active : all;
			const el = pool[Math.floor(Math.random() * pool.length)];
			if (el) pop(el);
			timer = window.setTimeout(tick, 200 + 180 * Math.random());
		};

		tick();
		return () => {
			stopped = true;
			window.clearTimeout(timer);
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
