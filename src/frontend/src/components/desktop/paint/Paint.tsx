import "./paint.css";

/** Classic MS Paint tool order (Win95–XP) — icons from jspaint classic sprite */
const TOOLS = [
	"Free-Form Select",
	"Select",
	"Eraser/Color Eraser",
	"Fill With Color",
	"Pick Color",
	"Magnifier",
	"Pencil",
	"Brush",
	"Airbrush",
	"Text",
	"Line",
	"Curve",
	"Rectangle",
	"Polygon",
	"Ellipse",
	"Rounded Rectangle",
] as const;

/** Default palette from classic Paint (jspaint color-data.js) — 2×14 */
const PALETTE = [
	"rgb(0,0,0)",
	"rgb(128,128,128)",
	"rgb(128,0,0)",
	"rgb(128,128,0)",
	"rgb(0,128,0)",
	"rgb(0,128,128)",
	"rgb(0,0,128)",
	"rgb(128,0,128)",
	"rgb(128,128,64)",
	"rgb(0,64,64)",
	"rgb(0,128,255)",
	"rgb(0,64,128)",
	"rgb(64,0,255)",
	"rgb(128,64,0)",
	"rgb(255,255,255)",
	"rgb(192,192,192)",
	"rgb(255,0,0)",
	"rgb(255,255,0)",
	"rgb(0,255,0)",
	"rgb(0,255,255)",
	"rgb(0,0,255)",
	"rgb(255,0,255)",
	"rgb(255,255,128)",
	"rgb(0,255,128)",
	"rgb(128,255,255)",
	"rgb(128,128,255)",
	"rgb(255,0,128)",
	"rgb(255,128,64)",
];

const MENUS = ["File", "Edit", "View", "Image", "Colors", "Help"] as const;
const SELECTED_TOOL = TOOLS.indexOf("Pencil");

type Props = {
	src: string;
};

export function Paint({ src }: Props) {
	return (
		<div className="paint">
			<div className="paint__menu" role="menubar" aria-label="Paint menu">
				{MENUS.map((m) => (
					<span key={m} className="paint__menu-item" role="menuitem">
						<span className="paint__menu-hot">{m[0]}</span>
						{m.slice(1)}
					</span>
				))}
			</div>

			<div className="paint__main">
				<div className="paint__tools-col">
					<div className="paint__tools" role="toolbar" aria-label="Tools">
						{TOOLS.map((name, i) => (
							<button
								key={name}
								type="button"
								className={`paint__tool${i === SELECTED_TOOL ? " paint__tool--selected paint-dither" : ""}`}
								title={name}
								aria-label={name}
								aria-pressed={i === SELECTED_TOOL}
							>
								<span
									className="paint__tool-icon"
									style={{ ["--icon-index" as string]: i }}
								/>
							</button>
						))}
					</div>
					<div className="paint__tool-options" aria-hidden>
						<span className="paint__pen-dot paint__pen-dot--sm" />
						<span className="paint__pen-dot paint__pen-dot--md paint__pen-dot--on" />
						<span className="paint__pen-dot paint__pen-dot--lg" />
					</div>
				</div>

				<div className="paint__canvas-wrap paint__sunken">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img className="paint__canvas" src={src} alt="" draggable={false} />
				</div>
			</div>

			<div className="paint__colors" aria-label="Colors">
				<div className="paint__current paint-dither" aria-hidden>
					<span className="paint__swatch paint__swatch--bg paint__sunken" />
					<span className="paint__swatch paint__swatch--fg paint__sunken" />
				</div>
				<div className="paint__palette">
					{PALETTE.map((c) => (
						<button
							key={c}
							type="button"
							className="paint__color paint__sunken"
							style={{ background: c }}
							aria-label={c}
						/>
					))}
				</div>
			</div>

			<div className="paint__status" role="status">
				<span className="paint__status-text paint__sunken">
					For Help, click Help Topics on the Help Menu.
				</span>
				<span className="paint__status-coords paint__sunken">70, 42</span>
			</div>
		</div>
	);
}
