"use client";

import { useEffect, useRef } from "react";
import { GitHubCalendar } from "react-github-calendar";
import { GITHUB_USER } from "./windows";
import "./github-graph.css";

export function GitHubGraph() {
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;

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
			const all = root.querySelectorAll<SVGRectElement>(
				".react-activity-calendar__calendar rect[data-level]",
			);
			if (all.length === 0) {
				timer = window.setTimeout(tick, 120);
				return;
			}
			const active = Array.from(all).filter((e) => Number(e.dataset.level) > 0);
			const n = 1 + Math.floor(Math.random() * 2);
			for (let i = 0; i < n; i++) {
				const pool = active.length > 0 && Math.random() < 0.75 ? active : all;
				const el = pool[Math.floor(Math.random() * pool.length)];
				if (el) pop(el);
			}
			timer = window.setTimeout(tick, 60 + 140 * Math.random());
		};

		tick();

		return () => {
			stopped = true;
			mo.disconnect();
			window.clearTimeout(timer);
		};
	}, []);

	return (
		<div className="gh-graph" ref={rootRef}>
			<GitHubCalendar
				username={GITHUB_USER}
				colorScheme="dark"
				blockSize={10}
				blockMargin={3}
				fontSize={11}
				showColorLegend={false}
				showTotalCount={false}
				theme={{
					dark: ["#1a1a1a", "#3d1515", "#6b1c1c", "#9a2222", "#af0000"],
				}}
			/>
		</div>
	);
}
