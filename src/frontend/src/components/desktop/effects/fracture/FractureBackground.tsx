"use client";

import { memo, useRef, useState } from "react";
import "./fracture.css";

const INTRO = "/fracture/intro.mp4";
const LOOP = "/fracture/loop.mp4";

export function prefetchFracture() {
	fetch(INTRO).then((response) => response.blob());
}

export const FractureBackground = memo(function FractureBackground({ onShownAction }: { onShownAction: () => void }) {
	const loopRef = useRef<HTMLVideoElement>(null);
	const [intro, setIntro] = useState(true);
	const [loopSrc, setLoopSrc] = useState<string>();

	return (
		<div className="fracture-background" aria-hidden="true">
			<video
				ref={loopRef}
				className="fracture-background__video"
				src={loopSrc}
				muted
				loop
				playsInline
				preload="auto"
				onPlaying={() => setIntro(false)}
			/>
			{intro ? (
				<video
					className="fracture-background__video"
					src={INTRO}
					muted
					autoPlay
					playsInline
					onCanPlayThrough={() => setLoopSrc(LOOP)}
					onPlaying={onShownAction}
					onEnded={() => loopRef.current?.play()}
				/>
			) : null}
		</div>
	);
});
