"use client";

import { memo, useRef, useState } from "react";
import "./fracture.css";

const INTRO = "/fracture/intro.mp4";
const LOOP = "/fracture/loop.mp4";

/**
 * Downloads the intro ahead of time, so the screen shatters as soon as the
 * desktop mounts. Call it while something else is on screen, such as the boot
 * screen; the intro's video then finds the clip in the HTTP cache.
 */
export function prefetchFracture() {
	// Reading the body lets the whole clip land in the cache.
	fetch(INTRO).then((response) => response.blob());
}

/**
 * The broken-screen wallpaper, played from two recordings: the screen
 * shatters in a short intro, then settles into a seamless loop.
 *
 * The loop's first frame follows straight on from the intro's last, so the
 * loop waits underneath, paused on that frame. The intro stays on top until
 * the loop is actually playing, so a slow download holds a frame rather than
 * showing a gap. The loop only starts downloading once the intro can play
 * through, so it does not slow the shatter down on a slow connection.
 * Reduced motion skips the intro and leaves the loop paused.
 *
 * `onShownAction` fires once the wallpaper is on screen: when the screen
 * shatters, or for reduced motion, when the still frame has loaded.
 */
export const FractureBackground = memo(function FractureBackground({ onShownAction }: { onShownAction: () => void }) {
	const loopRef = useRef<HTMLVideoElement>(null);
	// Read once, like the other effects: a later change does not restart or stop the wallpaper.
	const [still] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
	const [intro, setIntro] = useState(!still);
	const [loopSrc, setLoopSrc] = useState(still ? LOOP : undefined);

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
				onLoadedData={still ? onShownAction : undefined}
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
