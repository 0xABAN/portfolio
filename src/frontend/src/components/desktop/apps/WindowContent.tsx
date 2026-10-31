import { memo, type CSSProperties } from "react";
import { CdPlayer, type useCdPlayerAudio } from "./CdPlayer";
import { Experience } from "./Experience";
import { Explorer } from "./Explorer";
import { GitHubGraph } from "./GitHubGraph";
import { Paint } from "./Paint";
import { RecycleBin } from "./RecycleBin";
import { Terminal } from "./Terminal";
import type { DesktopWindow } from "../windows";

function SystemMessage({ onOkAction }: { onOkAction: () => void }) {
	return (
		<div className="sysmsg">
			<div className="sysmsg__row">
				<span className="sysmsg__icon" aria-hidden>×</span>
				<span className="sysmsg__text">Critical error</span>
			</div>
			<div className="sysmsg__actions">
				<button type="button" className="sysmsg__ok chrome-raised" onClick={onOkAction}>Ok</button>
			</div>
		</div>
	);
}

type Props = {
	id: string;
	kind: DesktopWindow["kind"];
	src?: string;
	active: boolean;
	cropStyle?: CSSProperties;
	audio?: ReturnType<typeof useCdPlayerAudio>;
	onMinimize: (id: string) => void;
	onClose: (id: string) => void;
	onOpenShell: (id: string) => void;
	folderId: string;
};

export const WindowContent = memo(function WindowContent({ id, kind, src, active, cropStyle, audio, onMinimize, onClose, onOpenShell, folderId }: Props) {
	switch (kind) {
		case "cd-player":
			return audio ? <CdPlayer {...audio} /> : null;
		case "error":
			return <SystemMessage onOkAction={() => onMinimize(id)} />;
		case "paint":
			return src ? <Paint src={src} active={active} /> : null;
		case "github":
			return <GitHubGraph />;
		case "experience":
			return <Experience onClose={() => onClose(id)} />;
		case "terminal":
			return <Terminal />;
		case "recycle-bin":
			return <RecycleBin onCloseAction={() => onClose(id)} />;
		case "explorer":
			return <Explorer folderId={folderId} onOpenAction={onOpenShell} />;
	}

	if (src) return <img className="win-fill" src={src} alt="" draggable={false} />;
	if (cropStyle) return <img className="win-fill-crop" src="/desktop/overlay.jpg" alt="" draggable={false} style={cropStyle} />;
	return null;
});
