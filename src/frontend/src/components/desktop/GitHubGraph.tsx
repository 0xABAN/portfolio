"use client";

import { useEffect, useRef, useState } from "react";
import { ActivityCalendar, type Activity } from "react-activity-calendar";
import { GITHUB_USER } from "./windows";
import "./github-graph.css";

const API = "https://github-contributions-api.jogruber.de/v4/";

/** One fetch per page load — avoids AbortError from Strict Mode remount. */
const contribCache = new Map<string, Promise<Activity[]>>();

function loadContributions(username: string): Promise<Activity[]> {
	const key = `${username}:last`;
	let p = contribCache.get(key);
	if (!p) {
		p = fetch(`${API}${username}?y=last`)
			.then(async (res) => {
				const data = (await res.json()) as {
					contributions?: Activity[];
					error?: string;
				};
				if (!res.ok) {
					throw new Error(data.error || `HTTP ${res.status}`);
				}
				return data.contributions ?? [];
			})
			.catch((err: unknown) => {
				// Allow retry on real failures (not aborts)
				contribCache.delete(key);
				throw err;
			});
		contribCache.set(key, p);
	}
	return p;
}

export function GitHubGraph() {
	const rootRef = useRef<HTMLDivElement>(null);
	const [data, setData] = useState<Activity[] | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let alive = true;
		void loadContributions(GITHUB_USER)
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

		const scrollEnd = () => {
			const sc = root.querySelector<HTMLElement>(
				".react-activity-calendar__scroll-container",
			);
			if (!sc) return false;
			sc.scrollLeft = sc.scrollWidth;
			return true;
		};

		const mo = new MutationObserver(() => {
			if (scrollEnd()) mo.disconnect();
		});
		mo.observe(root, { childList: true, subtree: true });
		if (scrollEnd()) mo.disconnect();

		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			return () => mo.disconnect();
		}

		let stopped = false;
		let timer = 0;

		const pop = (el: Element) => {
			el.classList.remove("git-cell-pop");
			void (el as SVGElement).getBoundingClientRect();
			el.classList.add("git-cell-pop");
			const done = () => {
				el.classList.remove("git-cell-pop");
				el.removeEventListener("animationend", done);
			};
			el.addEventListener("animationend", done);
		};

		const tick = () => {
			if (stopped) return;
			if (document.hidden) {
				timer = window.setTimeout(tick, 800);
				return;
			}
			const all = root.querySelectorAll<SVGRectElement>(
				".react-activity-calendar__calendar rect[data-level]",
			);
			if (all.length === 0) {
				timer = window.setTimeout(tick, 200);
				return;
			}
			const active = Array.from(all).filter((e) => Number(e.dataset.level) > 0);
			const pool = active.length > 0 && Math.random() < 0.75 ? active : all;
			const el = pool[Math.floor(Math.random() * pool.length)];
			if (el) pop(el);
			timer = window.setTimeout(tick, 200 + 180 * Math.random());
		};

		tick();

		return () => {
			stopped = true;
			mo.disconnect();
			window.clearTimeout(timer);
		};
	}, [data]);

	if (failed) {
		return (
			<div className="gh-graph" ref={rootRef}>
				<span className="gh-graph__err">couldn&apos;t load github</span>
			</div>
		);
	}

	return (
		<div className="gh-graph" ref={rootRef}>
			<ActivityCalendar
				data={data ?? []}
				loading={!data}
				colorScheme="dark"
				blockSize={10}
				blockMargin={3}
				fontSize={11}
				maxLevel={4}
				showColorLegend={false}
				showTotalCount={false}
				theme={{
					dark: ["#1a1a1a", "#3d1515", "#6b1c1c", "#9a2222", "#af0000"],
				}}
			/>
		</div>
	);
}
