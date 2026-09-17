"use client";

import type { useCdPlayerAudio } from "./useCdPlayerAudio";
import "./cd-player.css";

function Field({
	label,
	value,
	onPrev,
	onNext,
}: {
	label: string;
	value: string;
	onPrev: () => void;
	onNext: () => void;
}) {
	return (
		<div className="cd-player__field">
			<span className="cd-player__label">{label}</span>
			<div className="cd-player__combo">
				<div className="cd-player__combo-face chrome-sunken" title={value}>
					{value}
				</div>
				<div className="cd-player__spin">
					<button
						type="button"
						className="cd-player__spin-btn chrome-raised"
						aria-label="Previous track"
						onClick={onPrev}
					>
						<span className="cd-player__spin-ico cd-player__spin-ico--up" />
					</button>
					<button
						type="button"
						className="cd-player__spin-btn chrome-raised"
						aria-label="Next track"
						onClick={onNext}
					>
						<span className="cd-player__spin-ico cd-player__spin-ico--down" />
					</button>
				</div>
			</div>
		</div>
	);
}

/** Window positioning, activation, minimization and closing belong to Desktop. */
export function CdPlayer({
	track,
	playing,
	volume,
	bindElapsed,
	togglePlay,
	playPrev,
	playNext,
	setVolume,
	stop,
}: ReturnType<typeof useCdPlayerAudio>) {
	const transport: [string, () => void, string][] = [
		["Previous track", playPrev, "prev"],
		["Next track", playNext, "next"],
		[playing ? "Pause" : "Play", togglePlay, playing ? "pause" : "play"],
		["Stop", stop, "stop"],
	];

	return (
		<div className="cd-player__body">
			<div className="cd-player__row">
				<div className="cd-player__art chrome-sunken" aria-hidden>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={track.cover} alt="" draggable={false} />
				</div>

				<div className="cd-player__fields">
					<Field label="Artist:" value={track.artist} onPrev={playPrev} onNext={playNext} />
					<Field label="Track:" value={track.title} onPrev={playPrev} onNext={playNext} />

					<div className="cd-player__transport" role="toolbar" aria-label="Playback">
						{transport.map(([label, onClick, glyph], i) => (
							<button
								key={i}
								type="button"
								className="cd-player__tbtn chrome-raised"
								aria-label={label}
								onClick={onClick}
							>
								<span className={`cd-player__glyph cd-player__glyph--${glyph}`} />
							</button>
						))}
					</div>

					<label className="cd-player__vol">
						<span className="cd-player__vol-label">Volume:</span>
						<input
							className="cd-player__trackbar"
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={volume}
							aria-label="Volume"
							onChange={(e) => setVolume(Number(e.target.value))}
						/>
					</label>
				</div>
			</div>
			<div aria-label="Elapsed time"><span ref={bindElapsed}>0:00</span></div>
		</div>
	);
}
