import type { NoteSegment } from "./windows";
import "./notepad.css";

type Props = {
	segments?: readonly NoteSegment[];
	src?: string;
};

function openExternal(href: string) {
	window.open(href, "_blank", "noopener,noreferrer");
}

export function Notepad({ segments, src }: Props) {
	return (
		<div className="notepad" aria-label="Notepad">
			{segments && segments.length > 0 ? (
				<p className="notepad__text">
					{segments.map((s, i) =>
						s.href ? (
							<button
								key={i}
								type="button"
								className="notepad__link"
								onClick={() => openExternal(s.href!)}
							>
								{s.t}
							</button>
						) : (
							<span key={i}>{s.t}</span>
						),
					)}
				</p>
			) : null}
			{src ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img className="notepad__img" src={src} alt="" draggable={false} />
			) : null}
		</div>
	);
}
