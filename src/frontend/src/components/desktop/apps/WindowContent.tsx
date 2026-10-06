import { memo, type CSSProperties } from "react";
import { CdPlayer } from "./cd-player/CdPlayer";
import type { useCdPlayerAudio } from "./cd-player/useCdPlayerAudio";
import { Explorer } from "./explorer/Explorer";
import { RecycleBin } from "./recycle-bin/RecycleBin";
import { GitHubGraph } from "./github/GitHubGraph";
import { Paint } from "./paint/Paint";
import { Experience } from "./experience/Experience";
import { SystemMessage } from "../window/SystemMessage";
import { Terminal } from "./terminal/Terminal";
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
	folderId: string;
};

/** Maps a desktop window kind to its app content; window chrome stays in the host. */
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

	// Plain picture windows: the beep boop GIF, and the magnifying glass's crop of the overlay photo.
	/* eslint-disable @next/next/no-img-element */
	if (src) return <img className="win-fill" src={src} alt="" draggable={false} />;
	if (cropStyle) return <img className="win-fill-crop" src="/photos/overlay.webp" alt="" draggable={false} style={cropStyle} />;
	/* eslint-enable @next/next/no-img-element */
	return null;
});
