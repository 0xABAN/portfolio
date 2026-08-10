import {
	EXPLORER_FILES,
	EXPLORER_MENUS,
	EXPLORER_PATH,
	EXPLORER_TOOLBAR,
	type ExplorerFile,
} from "./explorerData";
import "./explorer.css";

type Props = {
	/** *Action suffix satisfies Next TS 71007 */
	onOpenFileAction: (file: ExplorerFile) => void;
};

export function Explorer({ onOpenFileAction }: Props) {
	const count = EXPLORER_FILES.length;

	return (
		<div className="explorer" aria-label="File explorer">
			<div className="explorer__menu" aria-hidden>
				{EXPLORER_MENUS.map((m) => (
					<span key={m} className="explorer__menu-item">
						{m}
					</span>
				))}
			</div>

			<div className="explorer__toolbar" aria-hidden>
				{EXPLORER_TOOLBAR.map((t) => (
					<span key={t} className="explorer__tool">
						{t}
					</span>
				))}
			</div>

			<div className="explorer__address" aria-hidden>
				<span className="explorer__address-label">Address</span>
				<div className="explorer__address-field">{EXPLORER_PATH}</div>
			</div>

			<ul className="explorer__list">
				{EXPLORER_FILES.map((file) => (
					<li key={file.id}>
						<button
							type="button"
							className="explorer__row"
							onClick={() => onOpenFileAction(file)}
						>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								className="explorer__row-icon"
								src={file.icon}
								alt=""
								width={16}
								height={16}
								draggable={false}
							/>
							<span className="explorer__row-name">{file.name}</span>
						</button>
					</li>
				))}
			</ul>

			<div className="explorer__status" aria-live="polite">
				{count} object{count === 1 ? "" : "s"}
			</div>
		</div>
	);
}
