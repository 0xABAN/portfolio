"use client";

import { useEffect, useMemo, useState } from "react";
import { PLAYLIST_URL, formatElapsed, shuffledOrder, stepShuffle, toTrack, type ScSound, type Shuffle, type Track } from "./playlist";

/**
 * Shared transport survives minimization and Strict Mode; only Quit unloads it.
 * A hidden SoundCloud Widget plays the playlist; the Win9x CD Player remains the visible UI.
 */
type ScWidget = {
	bind: (eventName: string, listener: (data?: { currentPosition?: number }) => void) => void;
	unbind: (eventName: string) => void;
	play: () => unknown;
	pause: () => void;
	/** Jumps to a sound of the playlist and starts playing it. */
	skip: (soundIndex: number) => unknown;
	seekTo: (milliseconds: number) => void;
	setVolume: (volume: number) => void;
	getSounds: (callback: (sounds: ScSound[]) => void) => void;
};

type ScApi = {
	Widget: ((el: HTMLIFrameElement) => ScWidget) & {
		Events: {
			READY: string;
			PLAY: string;
			PAUSE: string;
			FINISH: string;
			PLAY_PROGRESS: string;
			ERROR?: string;
		};
	};
};

type Transport = {
	muted: boolean;
	volume: number;
	paused: boolean;
	currentTime: number;
	src: string;
	readyState: number;
	play: () => Promise<void>;
	pause: () => void;
	getAttribute: (name: string) => string | null;
};

const FADE_MS = 10_000;
const API_SRC = "https://w.soundcloud.com/player/api.js";
/** Widget getters answer by postMessage, and not at all while the widget is busy. */
const GETTER_TIMEOUT_MS = 2000;
/** READY can arrive before the widget lists and describes the whole playlist. */
const RETRIES = 40;
const RETRY_MS = 250;
/** A pause at 0:00 that lasts this long means the upload's stream is unavailable. */
const STALLED_PAUSE_MS = 1500;
const MAX_UNPLAYABLE = 8;

let sharedVolume = 1;
let fadeProgress = 0;
let mediaStarted = false;
let autoplayBlocked = false;
/** Bumped whenever the track or play state changes, so stale async work can tell. */
let switchGen = 0;
let sharedWidget: ScWidget | null = null;
let sharedIframe: HTMLIFrameElement | null = null;
let widgetPromise: Promise<ScWidget> | null = null;
let apiPromise: Promise<ScApi> | null = null;
let wantPlaying = false;
let unplayableInARow = 0;
let lastWidgetVolume = -1;
let boundEvents: ScApi["Widget"]["Events"] | null = null;
const playingListeners = new Set<() => void>();
const elapsedNodes = new Set<HTMLElement>();
let lastElapsedSec = -1;

/** The playlist as the widget lists it, once every sound is described. */
let sounds: ScSound[] = [];
let playlistReady = false;
const readyWaiters: Array<() => void> = [];
let shuffle: Shuffle = { order: [], position: 0 };
let trackIdx = 0;
/** The way the listener last moved through the shuffle. */
let lastDirection: 1 | -1 = 1;
/** The sound the widget is on: it opens on the first one, and -1 once it moves on by itself. */
let widgetIdx = 0;
let currentTrack: Track | null = null;

let setTrackBridge: ((track: Track | null) => void) | null = null;
let setPlayingBridge: ((b: boolean) => void) | null = null;

/** Exposed as window.taskbarAudio for the browser checks. */
const transport: Transport = {
	muted: false,
	volume: 0,
	paused: true,
	currentTime: 0,
	src: "",
	readyState: 0,
	play: async () => {
		const widget = sharedWidget;
		if (!widget) return;

		applyVolume(true);
		if (widgetIdx === trackIdx) {
			await Promise.resolve(widget.play());
			return;
		}
		widgetIdx = trackIdx;
		await Promise.resolve(widget.skip(trackIdx));
	},
	pause: () => {
		sharedWidget?.pause();
		transport.paused = true;
	},
	getAttribute: (name) => (name === "src" ? transport.src || null : null),
};

if (typeof window !== "undefined") {
	Object.assign(window, { taskbarAudio: transport });
}

function scWindow() {
	return window as Window & { SC?: ScApi };
}

function livePlayer() {
	return Boolean(document.querySelector(`script[src="${API_SRC}"]`));
}

function widgetSrc(permalink: string) {
	const url = new URL("https://w.soundcloud.com/player/");
	url.searchParams.set("url", permalink);
	url.searchParams.set("auto_play", "false");
	return url.toString();
}

function sleep(ms: number) {
	return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

/** Calls a widget getter; resolves undefined if the widget never answers. */
function ask<T>(request: (answer: (value: T) => void) => void): Promise<T | undefined> {
	return new Promise((resolve) => {
		const timer = window.setTimeout(() => resolve(undefined), GETTER_TIMEOUT_MS);
		request((value) => {
			window.clearTimeout(timer);
			resolve(value);
		});
	});
}

function loadApi(): Promise<ScApi> {
	const existing = scWindow().SC;
	if (existing?.Widget) return Promise.resolve(existing);
	if (apiPromise) return apiPromise;
	apiPromise = new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = API_SRC;
		script.async = true;
		script.onload = () => {
			const api = scWindow().SC;
			if (!api?.Widget) reject(new Error("SoundCloud Widget API missing"));
			else resolve(api);
		};
		script.onerror = () => reject(new Error("SoundCloud Widget API failed to load"));
		document.head.appendChild(script);
	});
	return apiPromise;
}

function hideIframe(el: HTMLIFrameElement) {
	el.id = "sc-cd-player";
	el.title = "SoundCloud";
	el.allow = "autoplay; encrypted-media";
	el.tabIndex = -1;
	el.setAttribute("aria-hidden", "true");
	// Keep the iframe paintable; display:none often suspends media.
	el.style.cssText =
		"position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0;overflow:hidden";
}

/** Re-sends the volume even when unchanged; switching tracks can reset the widget's to full. */
function applyVolume(force = false) {
	const faded = sharedVolume * fadeProgress ** 2;
	transport.volume = faded;
	const out = Math.round((transport.muted ? 0 : faded) * 100);
	if (out === lastWidgetVolume && !force) return;
	lastWidgetVolume = out;
	sharedWidget?.setVolume(out);
}

function whenPlaylistReady(): Promise<ScWidget> {
	return ensureWidget().then((widget) => {
		if (playlistReady) return widget;
		return new Promise<ScWidget>((resolve) => readyWaiters.push(() => resolve(widget)));
	});
}

/**
 * Reads the playlist and deals the first shuffled round once the widget has
 * described every sound. At READY it has described only the first few, and a
 * skip to an undescribed sound selects it without ever playing it.
 */
async function loadPlaylist(widget: ScWidget) {
	if (playlistReady) return;
	for (let attempt = 0; attempt < RETRIES; attempt++) {
		const list = await ask<ScSound[]>((answer) => widget.getSounds(answer));
		if (widget !== sharedWidget) return;

		if (list?.length && list.every((sound) => sound.title)) {
			sounds = list;
			shuffle = { order: shuffledOrder(sounds.length), position: 0 };
			trackIdx = shuffle.order[0];
			showTrack(trackIdx);
			transport.readyState = 4;
			playlistReady = true;
			for (const wait of readyWaiters.splice(0)) wait();
			return;
		}
		await sleep(RETRY_MS);
	}
	console.error(`CD Player: SoundCloud did not describe every track of ${PLAYLIST_URL}.`);
}

/** Shows a track's details, or blank fields when there is no track. */
function showTrack(index: number) {
	const sound = sounds[index];
	currentTrack = sound?.title ? toTrack({ ...sound, title: sound.title }) : null;
	setTrackBridge?.(currentTrack);
}

/** Moves one track through the shuffled round and plays it. */
function step(direction: 1 | -1) {
	if (!playlistReady) return;
	++switchGen;
	lastDirection = direction;
	shuffle = stepShuffle(shuffle, direction);
	trackIdx = shuffle.order[shuffle.position];
	autoplayBlocked = false;
	resetElapsed();
	showTrack(trackIdx);
	void startPlayback();
}

/**
 * Skips an upload whose stream will not play, giving up after several in a row.
 * It keeps going the listener's way, so Previous does not bounce back off it.
 */
function skipUnplayable() {
	if (++unplayableInARow > MAX_UNPLAYABLE) {
		wantPlaying = false;
		console.error(`CD Player stopped: ${MAX_UNPLAYABLE} tracks in a row would not play.`);
		return;
	}
	step(lastDirection);
}

function bindWidget(widget: ScWidget, events: ScApi["Widget"]["Events"]) {
	boundEvents = events;
	widget.bind(events.READY, () => void loadPlaylist(widget));
	widget.bind(events.PLAY, () => {
		transport.paused = false;
		setPlayingBridge?.(true);
		applyVolume(true);
		for (const listener of playingListeners) listener();
	});
	widget.bind(events.PAUSE, (data) => {
		transport.paused = true;
		setPlayingBridge?.(false);

		// Some uploads play for a moment and then stop at 0:00 because their stream is
		// unavailable. Switching tracks also pauses, briefly, so only a lasting pause counts.
		if (!wantPlaying || !mediaStarted || (data?.currentPosition ?? 0) >= 1000) return;
		const gen = switchGen;
		window.setTimeout(() => {
			if (gen === switchGen && wantPlaying && transport.paused) skipUnplayable();
		}, STALLED_PAUSE_MS);
	});
	// The widget moves on to the next sound of the playlist by itself; follow the shuffle instead.
	widget.bind(events.FINISH, () => {
		widgetIdx = -1;
		if (mediaStarted) step(1);
	});
	widget.bind(events.PLAY_PROGRESS, (data) => {
		const sec = Math.floor((data?.currentPosition ?? 0) / 1000);
		transport.currentTime = sec;
		if (sec > 0) unplayableInARow = 0;
		writeElapsed(sec);
	});
	if (events.ERROR) {
		widget.bind(events.ERROR, () => {
			if (mediaStarted) skipUnplayable();
		});
	}
}

function ensureWidget(): Promise<ScWidget> {
	if (sharedWidget) return Promise.resolve(sharedWidget);
	if (widgetPromise) return widgetPromise;
	widgetPromise = (async () => {
		const api = await loadApi();
		const iframe = document.createElement("iframe");
		hideIframe(iframe);
		// Widget() reads iframe.src; a blank frame throws. Tests stub SC without api.js.
		if (livePlayer()) iframe.src = widgetSrc(PLAYLIST_URL);
		transport.src = PLAYLIST_URL;
		document.body.appendChild(iframe);
		sharedIframe = iframe;
		const widget = api.Widget(iframe);
		sharedWidget = widget;
		bindWidget(widget, api.Widget.Events);
		return widget;
	})().catch((error) => {
		widgetPromise = null;
		throw error;
	});
	return widgetPromise;
}

async function startPlayback(): Promise<void> {
	const gen = switchGen;
	await whenPlaylistReady();
	if (gen !== switchGen) return;
	mediaStarted = true;
	wantPlaying = true;
	autoplayBlocked = false;
	try {
		await transport.play();
	} catch (error) {
		if (gen !== switchGen) return;
		autoplayBlocked = error instanceof DOMException && error.name === "NotAllowedError";
		setPlayingBridge?.(false);
	}
	window.setTimeout(() => {
		if (gen !== switchGen) return;
		if (wantPlaying && transport.paused) autoplayBlocked = true;
	}, 1000);
}

function writeElapsed(sec: number) {
	if (sec === lastElapsedSec) return;
	lastElapsedSec = sec;
	const text = formatElapsed(sec);
	for (const node of elapsedNodes) node.textContent = text;
}

function resetElapsed() {
	transport.currentTime = 0;
	lastElapsedSec = -1;
	writeElapsed(0);
}

function bindElapsed(node: HTMLElement | null) {
	if (!node) return undefined;
	elapsedNodes.add(node);
	node.textContent = formatElapsed(transport.currentTime);
	return () => {
		elapsedNodes.delete(node);
	};
}

/** Desktop owns the transport so minimizing the app does not stop its music. */
export function useCdPlayerAudio(bootComplete: boolean, running: boolean) {
	const [muted, setMuted] = useState(() => transport.muted);
	const [playing, setPlaying] = useState(() => mediaStarted && !transport.paused);
	const [track, setTrack] = useState(() => currentTrack);
	const [volume, setVolumeState] = useState(() => sharedVolume);

	useEffect(() => {
		setTrackBridge = setTrack;
		setPlayingBridge = setPlaying;
		void ensureWidget();
		if (mediaStarted) writeElapsed(transport.currentTime);

		const retryPlayback = () => {
			if (autoplayBlocked && !transport.muted) void startPlayback();
		};
		window.addEventListener("click", retryPlayback);
		window.addEventListener("keydown", retryPlayback);

		return () => {
			if (setTrackBridge === setTrack) setTrackBridge = null;
			if (setPlayingBridge === setPlaying) setPlayingBridge = null;
			window.removeEventListener("click", retryPlayback);
			window.removeEventListener("keydown", retryPlayback);
		};
	}, []);

	useEffect(() => {
		if (running && !mediaStarted) void startPlayback();
	}, [running]);

	useEffect(() => {
		if (!running || !bootComplete || fadeProgress === 1) return;
		let frame = 0;

		const beginFade = () => {
			if (frame || fadeProgress === 1) return;
			const startedAt = performance.now() - fadeProgress * FADE_MS;
			const fade = (now: number) => {
				if (!mediaStarted) return;
				fadeProgress = Math.min(1, (now - startedAt) / FADE_MS);
				applyVolume();
				if (fadeProgress < 1) frame = requestAnimationFrame(fade);
			};
			frame = requestAnimationFrame(fade);
		};

		playingListeners.add(beginFade);
		if (!transport.paused && transport.readyState >= 2) beginFade();
		return () => {
			cancelAnimationFrame(frame);
			playingListeners.delete(beginFade);
		};
	}, [bootComplete, running]);

	return useMemo(() => {
		const tryPlay = () => {
			void startPlayback();
		};

		const toggleMute = () => {
			const next = !transport.muted;
			transport.muted = next;
			setMuted(next);
			applyVolume();
			if (!next && transport.paused && mediaStarted) tryPlay();
		};

		const togglePlay = () => {
			if (mediaStarted && !transport.paused) {
				wantPlaying = false;
				transport.pause();
				setPlaying(false);
				return;
			}
			transport.muted = false;
			setMuted(false);
			applyVolume();
			tryPlay();
		};

		const stop = () => {
			++switchGen;
			wantPlaying = false;
			autoplayBlocked = false;
			transport.pause();
			sharedWidget?.seekTo(0);
			setPlaying(false);
			resetElapsed();
		};

		const quit = () => {
			stop();
			mediaStarted = false;
			fadeProgress = 0;
			transport.volume = 0;
			transport.src = "";
			transport.readyState = 0;
			transport.currentTime = 0;
			lastWidgetVolume = -1;
			if (sharedWidget && boundEvents) {
				for (const name of Object.values(boundEvents)) {
					if (name) sharedWidget.unbind(name);
				}
			}
			sharedWidget?.pause();
			sharedIframe?.remove();
			sharedIframe = null;
			sharedWidget = null;
			boundEvents = null;
			widgetPromise = null;

			// A relaunch reads the playlist afresh, in case it changed on SoundCloud.
			sounds = [];
			playlistReady = false;
			readyWaiters.length = 0;
			shuffle = { order: [], position: 0 };
			lastDirection = 1;
			widgetIdx = 0;
			showTrack(-1);
		};

		const setVolume = (v: number) => {
			sharedVolume = Math.min(1, Math.max(0, v));
			applyVolume();
			setVolumeState(sharedVolume);
		};

		return {
			muted,
			playing,
			/** Null until SoundCloud has described the current track. */
			track,
			trackLabel: track ? `${track.artist} - ${track.title}` : "",
			volume,
			bindElapsed,
			toggleMute,
			togglePlay,
			playPrev: () => step(-1),
			playNext: () => step(1),
			stop,
			quit,
			setVolume,
		};
	}, [muted, playing, track, volume]);
}
