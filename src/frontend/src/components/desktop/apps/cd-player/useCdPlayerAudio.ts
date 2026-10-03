"use client";

import { useEffect, useMemo, useState } from "react";
import {
	formatElapsed,
	randomTrackIndex,
	skipUnmapped,
	trackAt,
	wrapIndex,
} from "./playlist";

/**
 * Shared transport survives minimization and Strict Mode; only Quit unloads it.
 * SoundCloud Widget is hidden; the Win9x CD Player remains the visible UI.
 */
type ScWidget = {
	bind: (eventName: string, listener: (data?: { currentPosition?: number }) => void) => void;
	unbind: (eventName: string) => void;
	play: () => unknown;
	pause: () => void;
	seekTo: (milliseconds: number) => void;
	setVolume: (volume: number) => void;
	load: (url: string, options?: { callback?: () => void; auto_play?: boolean }) => void;
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

let sharedTrackIdx = randomTrackIndex();
let sharedVolume = 1;
let fadeProgress = 0;
let mediaStarted = false;
let autoplayBlocked = false;
let loadGen = 0;
let sharedWidget: ScWidget | null = null;
let sharedIframe: HTMLIFrameElement | null = null;
let widgetPromise: Promise<ScWidget> | null = null;
let apiPromise: Promise<ScApi> | null = null;
let widgetReady = false;
let wantPlaying = false;
let streamFails = 0;
let lastWidgetVolume = -1;
let boundEvents: ScApi["Widget"]["Events"] | null = null;
const readyWaiters: Array<() => void> = [];
const playingListeners = new Set<() => void>();
const elapsedNodes = new Set<HTMLElement>();
let lastElapsedSec = -1;

let setTrackIdxBridge: ((n: number) => void) | null = null;
let setPlayingBridge: ((b: boolean) => void) | null = null;

const transport: Transport = {
	muted: false,
	volume: 0,
	paused: true,
	currentTime: 0,
	src: "",
	readyState: 0,
	play: async () => {
		await Promise.resolve(sharedWidget?.play());
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

function whenWidgetReady() {
	if (widgetReady) return Promise.resolve();
	return new Promise<void>((resolve) => readyWaiters.push(resolve));
}

function applyVolume() {
	const faded = sharedVolume * fadeProgress ** 2;
	transport.volume = faded;
	const out = Math.round((transport.muted ? 0 : faded) * 100);
	if (out === lastWidgetVolume) return;
	lastWidgetVolume = out;
	sharedWidget?.setVolume(out);
}

function markReady() {
	widgetReady = true;
	applyVolume();
	for (const wait of readyWaiters.splice(0)) wait();
}

function bindWidget(widget: ScWidget, events: ScApi["Widget"]["Events"]) {
	boundEvents = events;
	widget.bind(events.READY, markReady);
	widget.bind(events.PLAY, () => {
		transport.paused = false;
		setPlayingBridge?.(true);
		for (const listener of playingListeners) listener();
	});
	widget.bind(events.PAUSE, () => {
		transport.paused = true;
		setPlayingBridge?.(false);
		// Official/monetized URLs often PLAY then immediately PAUSE at 0:00 (stream 404).
		if (wantPlaying && mediaStarted && transport.currentTime < 1) {
			if (++streamFails > 8) {
				wantPlaying = false;
				return;
			}
			loadTrack(skipUnmapped(sharedTrackIdx), true);
		}
	});
	widget.bind(events.FINISH, () => {
		if (mediaStarted) loadTrack(randomTrackIndex(sharedTrackIdx), true);
	});
	widget.bind(events.PLAY_PROGRESS, (data) => {
		const sec = Math.floor((data?.currentPosition ?? 0) / 1000);
		transport.currentTime = sec;
		if (sec > 0) streamFails = 0;
		writeElapsed(sec);
	});
	if (events.ERROR) {
		widget.bind(events.ERROR, () => {
			if (mediaStarted) loadTrack(skipUnmapped(sharedTrackIdx), true);
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
		const first = trackAt(sharedTrackIdx).src;
		// Widget() reads iframe.src; a blank frame throws. Tests stub SC without api.js.
		if (first && livePlayer()) {
			iframe.src = widgetSrc(first);
			transport.src = first;
			transport.readyState = 2;
		}
		document.body.appendChild(iframe);
		sharedIframe = iframe;
		const widget = api.Widget(iframe);
		bindWidget(widget, api.Widget.Events);
		sharedWidget = widget;
		return widget;
	})().catch((error) => {
		widgetPromise = null;
		throw error;
	});
	return widgetPromise;
}

async function startPlayback(): Promise<void> {
	const gen = loadGen;
	const track = trackAt(sharedTrackIdx);
	if (!track.src) {
		loadTrack(skipUnmapped(sharedTrackIdx), true);
		return;
	}
	await ensureWidget();
	if (gen !== loadGen) return;
	if (transport.src !== track.src) {
		loadTrack(sharedTrackIdx, true);
		return;
	}
	await whenWidgetReady();
	if (gen !== loadGen) return;
	mediaStarted = true;
	wantPlaying = true;
	autoplayBlocked = false;
	try {
		await transport.play();
	} catch (error) {
		if (gen !== loadGen) return;
		autoplayBlocked = error instanceof DOMException && error.name === "NotAllowedError";
		setPlayingBridge?.(false);
	}
	window.setTimeout(() => {
		if (gen !== loadGen) return;
		if (wantPlaying && transport.paused) autoplayBlocked = true;
	}, 1000);
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
	node.textContent = formatElapsed(Math.floor(transport.currentTime || 0));
	return () => {
		elapsedNodes.delete(node);
	};
}

function loadTrack(idx: number, play: boolean) {
	const next = wrapIndex(idx);
	const track = trackAt(next);
	const gen = ++loadGen;
	autoplayBlocked = false;
	sharedTrackIdx = next;
	setTrackIdxBridge?.(next);
	lastElapsedSec = -1;
	writeElapsed(0);
	transport.currentTime = 0;
	transport.src = track.src ?? "";
	transport.readyState = track.src ? 2 : 0;

	if (!track.src) {
		sharedWidget?.pause();
		transport.paused = true;
		setPlayingBridge?.(false);
		if (play) {
			const mapped = skipUnmapped(next);
			if (mapped !== next) loadTrack(mapped, true);
		}
		return;
	}

	void ensureWidget().then((widget) => {
		if (gen !== loadGen) return;
		widgetReady = false;
		widget.load(track.src!, {
			auto_play: false,
			callback() {
				if (gen !== loadGen) return;
				transport.readyState = 4;
				markReady();
				if (play) void startPlayback();
			},
		});
	});
}

/** Desktop owns the transport so minimizing the app does not stop its music. */
export function useCdPlayerAudio(bootComplete: boolean, running: boolean) {
	const [muted, setMuted] = useState(() => transport.muted);
	const [playing, setPlaying] = useState(() => mediaStarted && !transport.paused);
	const [trackIdx, setTrackIdx] = useState(() => sharedTrackIdx);
	const [volume, setVolumeState] = useState(() => sharedVolume);

	useEffect(() => {
		setTrackIdxBridge = setTrackIdx;
		setPlayingBridge = setPlaying;
		void ensureWidget();
		if (mediaStarted) writeElapsed(Math.floor(transport.currentTime || 0));

		const retryPlayback = () => {
			if (autoplayBlocked && !transport.muted) void startPlayback();
		};
		window.addEventListener("click", retryPlayback);
		window.addEventListener("keydown", retryPlayback);

		return () => {
			if (setTrackIdxBridge === setTrackIdx) setTrackIdxBridge = null;
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
			if (!trackAt(trackIdx).src) {
				loadTrack(skipUnmapped(trackIdx), true);
				return;
			}
			transport.muted = false;
			setMuted(false);
			applyVolume();
			tryPlay();
		};

		const stop = () => {
			++loadGen;
			wantPlaying = false;
			autoplayBlocked = false;
			transport.pause();
			sharedWidget?.seekTo(0);
			setPlaying(false);
			transport.currentTime = 0;
			lastElapsedSec = -1;
			writeElapsed(0);
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
			widgetReady = false;
			readyWaiters.length = 0;
		};

		const setVolume = (v: number) => {
			sharedVolume = Math.min(1, Math.max(0, v));
			applyVolume();
			setVolumeState(sharedVolume);
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
			playPrev: () => loadTrack(trackIdx - 1, Boolean(trackAt(trackIdx - 1).src)),
			playNext: () => loadTrack(trackIdx + 1, Boolean(trackAt(trackIdx + 1).src)),
			stop,
			quit,
			setVolume,
		};
	}, [muted, playing, trackIdx, volume]);
}
