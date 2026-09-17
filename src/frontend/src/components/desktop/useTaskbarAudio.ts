"use client";

import { useEffect, useState } from "react";
import { formatElapsed, PLAYLIST, randomTrackIndex, trackAt } from "./playlist";

/**
 * Page-lifetime audio. Not torn down on Strict Mode remount.
 * Transport starts silently on Desktop mount; the fade waits for boot to finish.
 */
let sharedAudio: HTMLAudioElement | null = null;
let sharedTrackIdx = randomTrackIndex();
let sharedVolume = 1;
let fadeProgress = 0;
const FADE_MS = 10_000;
let mediaStarted = false;
let autoplayBlocked = false;
let loadGen = 0;
const elapsedNodes = new Set<HTMLElement>();
let lastElapsedSec = -1;

// React setState bridges for the shared media element (latest mount wins).
let setTrackIdxBridge: ((n: number) => void) | null = null;
let setPlayingBridge: ((b: boolean) => void) | null = null;

function getSharedAudio(): HTMLAudioElement {
	if (sharedAudio) return sharedAudio;
	const el = new Audio();
	el.preload = "none";
	el.muted = false;
	el.volume = 0;
	sharedAudio = el;
	return el;
}

async function startPlayback(el: HTMLAudioElement): Promise<boolean> {
	if (!el.src) el.src = trackAt(sharedTrackIdx).src;
	mediaStarted = true;
	autoplayBlocked = false;
	try {
		await el.play();
		return true;
	} catch (error) {
		autoplayBlocked = error instanceof DOMException && error.name === "NotAllowedError";
		return false;
	}
}

function writeElapsed(sec: number) {
	if (sec === lastElapsedSec) return;
	lastElapsedSec = sec;
	const text = formatElapsed(sec);
	for (const node of elapsedNodes) node.textContent = text;
}

function bindElapsed(node: HTMLElement | null) {
	if (!node) return undefined;
	elapsedNodes.add(node);
	node.textContent = formatElapsed(
		sharedAudio ? Math.floor(sharedAudio.currentTime || 0) : 0,
	);
	return () => {
		elapsedNodes.delete(node);
	};
}

function loadTrack(idx: number, play: boolean) {
	const el = getSharedAudio();
	const n = PLAYLIST.length;
	const next = ((idx % n) + n) % n;
	const t = trackAt(next);
	const gen = ++loadGen;
	sharedTrackIdx = next;
	setTrackIdxBridge?.(next);
	lastElapsedSec = -1;
	writeElapsed(0);
	el.src = t.src;
	el.load();
	if (!play) return;
	mediaStarted = true;
	const go = () => {
		if (gen !== loadGen) return;
		void startPlayback(el).then((ok) => {
			if (!ok && gen === loadGen) setPlayingBridge?.(false);
		});
	};
	// play() right after src change often rejects until the element can start
	if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) go();
	else el.addEventListener("canplay", go, { once: true });
}

/** Playlist + mute/play for the CD Player tab and speaker. */
export function useTaskbarAudio(bootComplete: boolean) {
	const [muted, setMuted] = useState(() => getSharedAudio().muted);
	const [playing, setPlaying] = useState(() => {
		const el = getSharedAudio();
		return !el.paused && mediaStarted;
	});
	const [trackIdx, setTrackIdx] = useState(() => sharedTrackIdx);
	// The slider selects the final volume, independently of the startup fade.
	const [volume, setVolumeState] = useState(() => sharedVolume);

	useEffect(() => {
		setTrackIdxBridge = setTrackIdx;
		setPlayingBridge = setPlaying;
		const el = getSharedAudio();
		const onTime = () => writeElapsed(Math.floor(el.currentTime || 0));
		const listeners = Object.entries({
			play: () => setPlaying(true),
			pause: () => setPlaying(false),
			timeupdate: onTime,
			durationchange: onTime,
			ended: () => loadTrack(randomTrackIndex(sharedTrackIdx), true),
		});
		for (const [event, listener] of listeners) el.addEventListener(event, listener);
		if (mediaStarted) writeElapsed(Math.floor(el.currentTime || 0));

		// Some browsers still require a gesture, even when starting at zero volume.
		const retryPlayback = () => {
			if (autoplayBlocked && !el.muted) void startPlayback(el);
		};
		window.addEventListener("click", retryPlayback);
		window.addEventListener("keydown", retryPlayback);
		if (!mediaStarted) {
			void startPlayback(el).then((ok) => {
				if (!ok) setPlaying(false);
			});
		}

		return () => {
			if (setTrackIdxBridge === setTrackIdx) setTrackIdxBridge = null;
			if (setPlayingBridge === setPlaying) setPlayingBridge = null;
			for (const [event, listener] of listeners) el.removeEventListener(event, listener);
			window.removeEventListener("click", retryPlayback);
			window.removeEventListener("keydown", retryPlayback);
		};
	}, []);

	useEffect(() => {
		if (!bootComplete || fadeProgress === 1) return;
		const el = getSharedAudio();
		let frame = 0;

		const beginFade = () => {
			if (frame || fadeProgress === 1) return;
			const startedAt = performance.now() - fadeProgress * FADE_MS;
			const fade = (now: number) => {
				fadeProgress = Math.min(1, (now - startedAt) / FADE_MS);
				// Quadratic easing leaves extra time near silence to reach Mute.
				el.volume = sharedVolume * fadeProgress ** 2;
				if (fadeProgress < 1) frame = requestAnimationFrame(fade);
			};
			frame = requestAnimationFrame(fade);
		};

		// Blocked or buffering playback gets the full fade when it actually starts.
		el.addEventListener("playing", beginFade);
		if (!el.paused && el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) beginFade();
		return () => {
			cancelAnimationFrame(frame);
			el.removeEventListener("playing", beginFade);
		};
	}, [bootComplete]);

	const tryPlay = () => {
		void startPlayback(getSharedAudio()).then((ok) => {
			if (!ok) setPlaying(false);
		});
	};

	const toggleMute = () => {
		const el = getSharedAudio();
		const next = !el.muted;
		el.muted = next;
		setMuted(next);
		// This click can also unlock playback if autoplay was blocked.
		if (!next && el.paused) tryPlay();
	};

	const togglePlay = () => {
		const el = getSharedAudio();
		if (mediaStarted && !el.paused) {
			el.pause();
			return;
		}
		el.muted = false;
		setMuted(false);
		tryPlay();
	};

	const stop = () => {
		const el = getSharedAudio();
		autoplayBlocked = false;
		el.pause();
		el.currentTime = 0;
		lastElapsedSec = -1;
		writeElapsed(0);
	};

	const setVolume = (v: number) => {
		const next = Math.min(1, Math.max(0, v));
		sharedVolume = next;
		getSharedAudio().volume = next * fadeProgress ** 2;
		setVolumeState(next);
	};

	const track = trackAt(trackIdx);

	return {
		muted,
		playing,
		track,
		trackLabel: `${track.artist} - ${track.title}`,
		volume,
		bindElapsed,
		toggleMute,
		togglePlay,
		playPrev: () => loadTrack(trackIdx - 1, true),
		playNext: () => loadTrack(trackIdx + 1, true),
		stop,
		setVolume,
	};
}
