import { memo, type CSSProperties } from "react";
import { Bio } from "./bio/Bio";
import { CdPlayer } from "./cd-player/CdPlayer";
import type { useCdPlayerAudio } from "./cd-player/useCdPlayerAudio";
import { Explorer } from "./explorer/Explorer";
import { RecycleBin } from "./recycle-bin/RecycleBin";
import { GitHubGraph } from "./github/GitHubGraph";
import { Paint } from "./paint/Paint";
import { Experience } from "./experience/Experience";
import { SystemMessage } from "../SystemMessage";
import { Terminal } from "./terminal/Terminal";
import { Word } from "./word/Word";
import type { DesktopWindow } from "../window/layout";

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
	onNoticeAction: (message: string, title?: string) => void;
	folderId: string;
};

/** Maps a desktop window kind to its app content; window chrome stays in the host. */
export const WindowContent = memo(function WindowContent({
	id,
	kind,
	src,
	active,
	cropStyle,
	audio,
	onMinimize,
	onClose,
	onOpenShell,
	onNoticeAction,
	folderId,
}: Props) {
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
		case "bio":
			return <Bio />;
		case "word":
			return <Word onCloseAction={() => onClose(id)} onMinimizeAction={() => onMinimize(id)} onNoticeAction={onNoticeAction} />;
		case "recycle-bin":
			return <RecycleBin onCloseAction={() => onClose(id)} />;
		case "explorer":
			return <Explorer folderId={folderId} onOpenAction={onOpenShell} />;
	}

	if (src) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img className="win-fill" src={src} alt="" draggable={false} />
		);
	}

	if (cropStyle) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				className="win-fill-crop"
				src="/photos/overlay.png"
				alt=""
				draggable={false}
				style={cropStyle}
			/>
		);
	}

	return null;
});
