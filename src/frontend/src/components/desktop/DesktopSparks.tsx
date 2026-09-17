import "./desktop-sparks.css";

// Fixed variation avoids hydration mismatches and reshuffling on desktop updates.
const SPARKS = Array.from({ length: 48 }, (_, index) => ({
	left: `${(index * 37) % 120 - 15}%`,
	top: `${(index * 61) % 130}%`,
	width: 3 + (index * 7) % 11,
	height: 1 + (index % 3) * 0.5,
	animationDuration: `${3.2 + ((index * 7) % 17) / 5}s`,
	animationDelay: `${-((index * 13) % 41) / 5}s`,
}));

/** Decorative, click-through sparks; CSS owns motion and reduced-motion handling. */
export function DesktopSparks() {
	return (
		<div className="desktop-sparks" aria-hidden="true">
			{SPARKS.map((style, index) => <span key={index} className="desktop-sparks__spark" style={style} />)}
		</div>
	);
}
