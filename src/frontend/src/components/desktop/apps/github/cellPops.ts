/**
 * Pops random cells of the contribution calendar, mostly active days, until
 * the returned cleanup runs. Holds off while the tab is hidden or reduced
 * motion is on, and does not start at all if it is on from the outset.
 *
 * Chrome cannot animate SVG shapes on the compositor, so popping a cell itself
 * repaints the calendar on every frame. Instead an HTML copy of the cell pops
 * above it while the cell hides, and the calendar repaints only as a pop
 * starts and ends. The copies live in a layer the size of the SVG, so a pop
 * never changes how far the calendar scrolls.
 *
 * `scroller` is the calendar's scroll container, which holds its SVG.
 */
export function runCellPops(scroller: HTMLElement) {
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	if (reducedMotion.matches) return () => {};

	let stopped = false;
	let timer = 0;
	let all: SVGRectElement[] = [];
	let active: SVGRectElement[] = [];
	const popping = new Map<SVGRectElement, Animation>();
	const layer = document.createElement("div");
	layer.className = "git-cell-pops";

	/** Caches the cells and lines the layer up with them; false until the calendar has committed them. */
	const prepare = () => {
		all = [...scroller.querySelectorAll<SVGRectElement>("rect[data-level]")];
		active = all.filter((e) => Number(e.dataset.level) > 0);
		const svg = all[0]?.ownerSVGElement;
		if (!svg) return false;

		// The SVG is the scroll container's only child and a block, so it starts at the padding edge.
		const { paddingLeft, paddingTop } = getComputedStyle(scroller);
		Object.assign(layer.style, {
			left: paddingLeft,
			top: paddingTop,
			width: `${svg.width.baseVal.value}px`,
			height: `${svg.height.baseVal.value}px`,
		});
		scroller.append(layer);
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
		// Cells keep their DOM identity until the calendar's data changes, which
		// restarts the pops. Retry only if the calendar has not committed its cells yet.
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
}
