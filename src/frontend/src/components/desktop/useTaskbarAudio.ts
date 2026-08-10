"use client";

import { useEffect, useRef, useState } from "react";
import { formatElapsed, randomTrackIndex, trackAt } from "./playlist";

type Handlers = {
	onPlay: () => void;
	onPause: () => void;
	onEnded: () => void;
	onTime: () => void;
};

/**
 * Page-lifetime audio. Not torn down on Strict Mode remount.
 * Media is only fetched on first play/unmute — avoids aborted range requests on load.
 */
let sharedAudio: HTMLAudioElement | null = null;
let sharedTrackIdx = randomTrackIndex();
let mediaStarted = false;
const handlerSet = new Set<Handlers>();

function getSharedAudio(): HTMLAudioElement {
	if (sharedAudio) return sharedAudio;
	const audio = new Audio();
	audio.preload = "none";
	audio.muted = true;
	audio.volume = 1;

	const emit = (fn: (h: Handlers) => void) => {
		for (const h of handlerSet) fn(h);
	};

	audio.addEventListener("timeupdate", () => emit((h) => h.onTime()));
	audio.addEventListener("play", () => emit((h) => h.onPlay()));
	audio.addEventListener("pause", () => emit((h) => h.onPause()));
	audio.addEventListener("ended", () => emit((h) => h.onEnded()));

	sharedAudio = audio;
	return audio;
}

function ensureSrc(audio: HTMLAudioElement) {
	if (audio.src) return;
	audio.src = trackAt(sharedTrackIdx).src;
}

function setAudioMuted(audio: HTMLAudioElement, muted: boolean) {
	audio.muted = muted;
}

async function startPlayback(audio: HTMLAudioElement): Promise<boolean> {
	ensureSrc(audio);
	mediaStarted = true;
	try {
		await audio.play();
		return true;
	} catch {
		return false;
	}
}

/** Playlist + mute/play for the Spotify tab and speaker. */
export function useTaskbarAudio() {
	const audio = getSharedAudio();
	const [muted, setMuted] = useState(() => audio.muted);
	const [playing, setPlaying] = useState(() => !audio.paused && mediaStarted);
	const [trackIdx, setTrackIdx] = useState(() => sharedTrackIdx);
	const elapsedElRef = useRef<HTMLElement | null>(null);
	const lastSec = useRef(-1);
	const trackIdxRef = useRef(trackIdx);

	useEffect(() => {
		trackIdxRef.current = trackIdx;
	}, [trackIdx]);

	useEffect(() => {
		const writeElapsed = (sec: number) => {
			if (sec === lastSec.current) return;
			lastSec.current = sec;
			const el = elapsedElRef.current;
			if (el) el.textContent = formatElapsed(sec);
		};

		const handlers: Handlers = {
			onPlay: () => setPlaying(true),
			onPause: () => setPlaying(false),
			onTime: () => writeElapsed(Math.floor(audio.currentTime || 0)),
			onEnded: () => {
				const next = randomTrackIndex(trackIdxRef.current);
				const t = trackAt(next);
				sharedTrackIdx = next;
				trackIdxRef.current = next;
				setTrackIdx(next);
				writeElapsed(0);
				audio.src = t.src;
				void audio.play().catch(() => setPlaying(false));
			},
		};

		handlerSet.add(handlers);
		if (mediaStarted) writeElapsed(Math.floor(audio.currentTime || 0));

		return () => {
			handlerSet.delete(handlers);
		};
	}, [audio]);

	const toggleMute = () => {
		const next = !audio.muted;
		setAudioMuted(audio, next);
		setMuted(next);
		// Unmute also starts transport if idle
		if (!next) {
			void startPlayback(audio).then((ok) => {
				if (!ok) setPlaying(false);
			});
		}
	};

	const togglePlay = () => {
		if (mediaStarted && !audio.paused) {
			audio.pause();
			return;
		}
		setAudioMuted(audio, false);
		setMuted(false);
		void startPlayback(audio).then((ok) => {
			if (!ok) setPlaying(false);
		});
	};

	const track = trackAt(trackIdx);
	const trackLabel = `${track.artist} - ${track.title}`;

	return {
		muted,
		playing,
		trackLabel,
		elapsedElRef,
		toggleMute,
		togglePlay,
	};
}
