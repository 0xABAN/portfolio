"use client";

import { useEffect, useState } from "react";
import { formatElapsed, PLAYLIST, randomTrackIndex, trackAt } from "./playlist";

/**
 * Page-lifetime audio. Not torn down on Strict Mode remount.
 * Transport starts muted on Desktop mount (post-intro); unmute only reveals sound.
 */
let sharedAudio: HTMLAudioElement | null = null;
let sharedTrackIdx = randomTrackIndex();
let mediaStarted = false;
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
	el.muted = true;
	el.volume = 1;
	sharedAudio = el;
	return el;
}

async function startPlayback(el: HTMLAudioElement): Promise<boolean> {
	if (!el.src) el.src = trackAt(sharedTrackIdx).src;
	mediaStarted = true;
	try {
		await el.play();
		return true;
	} catch {
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
		void el.play().catch(() => {
			if (gen === loadGen) setPlayingBridge?.(false);
		});
	};
	// play() right after src change often rejects until the element can start
	if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) go();
	else el.addEventListener("canplay", go, { once: true });
}

/** Playlist + mute/play for the CD Player tab and speaker. */
export function useTaskbarAudio() {
	const [muted, setMuted] = useState(() => getSharedAudio().muted);
	const [playing, setPlaying] = useState(() => {
		const el = getSharedAudio();
		return !el.paused && mediaStarted;
	});
	const [trackIdx, setTrackIdx] = useState(() => sharedTrackIdx);
	const [volume, setVolumeState] = useState(() => getSharedAudio().volume);

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

		// Muted autoplay is allowed without a gesture — start once Desktop mounts.
		if (!mediaStarted || el.paused) {
			void startPlayback(el).then((ok) => {
				if (!ok) setPlaying(false);
			});
		}

		return () => {
			if (setTrackIdxBridge === setTrackIdx) setTrackIdxBridge = null;
			if (setPlayingBridge === setPlaying) setPlayingBridge = null;
			for (const [event, listener] of listeners) el.removeEventListener(event, listener);
		};
	}, []);

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
		// If muted autoplay was blocked, this click is the gesture that unlocks it.
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
		el.pause();
		el.currentTime = 0;
		lastElapsedSec = -1;
		writeElapsed(0);
	};

	const setVolume = (v: number) => {
		const next = Math.min(1, Math.max(0, v));
		getSharedAudio().volume = next;
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
