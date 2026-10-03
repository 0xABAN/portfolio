import { memo, type CSSProperties } from "react";
import "./desktop-sparks.css";

const SHAPES = [
	"polygon(8% 20%, 65% 0, 100% 45%, 70% 100%, 0 65%)",
	"polygon(0 10%, 100% 35%, 35% 100%, 20% 55%)",
	"polygon(25% 0, 85% 15%, 65% 50%, 100% 80%, 20% 100%, 0 45%)",
	"polygon(10% 35%, 50% 0, 100% 30%, 75% 80%, 30% 100%, 0 65%)",
	"polygon(0 25%, 80% 0, 100% 60%, 55% 50%, 30% 100%)",
];

// Fixed variation avoids hydration mismatches and reshuffling on desktop updates.
const SPARKS = Array.from({ length: 24 }, (_, index) => {
	// Golden-angle spacing scatters headings; the upward bias keeps an ember-like drift.
	const heading = index * 137.5 * Math.PI / 180;
	const travel = 12 + (index * 11) % 24;

	return {
		left: `${(index * 37) % 100}%`,
		top: `${(index * 61) % 100}%`,
		width: 5 + (index * 7) % 10,
		height: 4 + (index * 11) % 7,
		clipPath: SHAPES[index % SHAPES.length],
		animationDuration: `${3.2 + ((index * 7) % 17) / 5}s`,
		animationDelay: `${-((index * 13) % 41) / 5}s`,
		"--spark-x": `${Math.cos(heading) * travel}vmin`,
		"--spark-y": `${Math.sin(heading) * travel - 6}vmin`,
		"--spark-bend": `${(index * 13) % 9 - 4}vmin`,
		"--spark-angle": `${(index * 83) % 360}deg`,
		"--spark-spin": `${(index * 67) % 540 - 270}deg`,
	} as CSSProperties;
});

/** Decorative, click-through sparks; CSS owns motion and reduced-motion handling. */
export const DesktopSparks = memo(function DesktopSparks() {
	return (
		<div className="desktop-sparks" aria-hidden="true">
			{SPARKS.map((style, index) => <span key={index} className="desktop-sparks__spark" style={style} />)}
		</div>
	);
});
