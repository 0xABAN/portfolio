import {
	EXPLORER_FILES,
	EXPLORER_MENUS,
	EXPLORER_PATH,
	EXPLORER_TOOLBAR,
	type ExplorerFile,
} from "./explorerData";
import { ExplorerHeader, ExplorerStatus } from "./ExplorerChrome";

type Props = {
	/** *Action suffix satisfies Next TS 71007 */
	onOpenFileAction: (file: ExplorerFile) => void;
};

export function Explorer({ onOpenFileAction }: Props) {
	return (
		<div className="explorer" aria-label="File explorer">
			<ExplorerHeader prefix="explorer" menus={EXPLORER_MENUS} tools={EXPLORER_TOOLBAR} address={EXPLORER_PATH} />

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

			<ExplorerStatus prefix="explorer" count={EXPLORER_FILES.length} />
		</div>
	);
}
