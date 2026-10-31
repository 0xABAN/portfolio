import { memo, type CSSProperties } from "react";
import "./desktop-sparks.css";

const SHAPES = [
	"8,20 65,0 100,45 70,100 0,65",
	"0,10 100,35 35,100 20,55",
	"25,0 85,15 65,50 100,80 20,100 0,45",
	"10,35 50,0 100,30 75,80 30,100 0,65",
	"0,25 80,0 100,60 55,50 30,100",
].map((points) => {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${points}" fill="black"/></svg>`;
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
});

const round = (value: number) => Number(value.toFixed(2));

const SPARKS = Array.from({ length: 24 }, (_, index) => {
	const heading = index * 137.5 * Math.PI / 180;
	const travel = 12 + (index * 11) % 24;
	const x = Math.cos(heading) * travel;
	const y = Math.sin(heading) * travel - 6;
	const bend = (index * 13) % 9 - 4;
	const angle = (index * 83) % 360;
	const spin = (index * 67) % 540 - 270;

	const pose = (progress: number, dx: number, dy: number, scale: string) =>
		`transform: translate3d(${round(x * progress + dx)}vmin, ${round(y * progress + dy)}vmin, 0) rotate(${round(angle + spin * progress)}deg) scale(${scale});`;

	const name = `desktop-spark-${index}`;
	const keyframes = `@keyframes ${name} {
	0% { ${pose(0, 0, 0, "0")} }
	12% { ${pose(0.12, 0, 0, "1")} }
	45% { ${pose(0.45, bend, -bend, "0.7, 1")} }
	80% { ${pose(0.8, -bend * 0.4, bend * 0.4, "1, 0.7")} }
	100% { ${pose(1, 0, 0, "0")} }
}`;

	return {
		keyframes,
		style: {
			left: `${(index * 37) % 100}%`,
			top: `${(index * 61) % 100}%`,
			width: 5 + (index * 7) % 10,
			height: 4 + (index * 11) % 7,
			backgroundImage: SHAPES[index % SHAPES.length],
			animationDuration: `${3.2 + ((index * 7) % 17) / 5}s`,
			animationDelay: `${-((index * 13) % 41) / 5}s`,
			"--spark-motion": name,
		} as CSSProperties,
	};
});

const KEYFRAMES = SPARKS.map((spark) => spark.keyframes).join("\n");

export const DesktopSparks = memo(function DesktopSparks() {
	return (
		<div className="desktop-sparks" aria-hidden="true">
			<style href="desktop-sparks" precedence="default">{KEYFRAMES}</style>
			{SPARKS.map(({ style }, index) => <span key={index} className="desktop-sparks__spark" style={style} />)}
		</div>
	);
});
