"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { PLAYLIST_URL, formatElapsed, shuffledOrder, stepShuffle, toTrack, type ScSound, type Shuffle, type Track } from "./playlist";

/**
 * A hidden SoundCloud Widget plays the playlist; the Win9x CD Player is only
 * the visible UI. Everything lives at module scope, so playback survives
 * minimization and Strict Mode; only Quit unloads it.
 */

type ScEvents = { READY: string; PLAY: string; PAUSE: string; FINISH: string; PLAY_PROGRESS: string };

type ScWidget = {
	bind: (event: string, listener: (data?: { currentPosition?: number }) => void) => void;
	unbind: (event: string) => void;
	play: () => unknown;
	pause: () => void;
	/** Jumps to a sound of the playlist and starts playing it. */
	skip: (index: number) => unknown;
	seekTo: (milliseconds: number) => void;
	setVolume: (volume: number) => void;
	getSounds: (callback: (sounds: ScSound[]) => void) => void;
};

type ScApi = { Widget: ((iframe: HTMLIFrameElement) => ScWidget) & { Events: ScEvents } };

const FADE_MS = 10_000;
const API_SRC = "https://w.soundcloud.com/player/api.js";
/** Widget getters answer by postMessage, and not at all while the widget is busy. */
const GETTER_TIMEOUT_MS = 2000;
/** READY can arrive before the widget lists and describes the whole playlist. */
const RETRIES = 40;
const RETRY_MS = 250;

/** The widget and the playlist it described. Quit discards it, so a relaunch reads the playlist afresh. */
type Session = {
	widget: ScWidget;
	iframe: HTMLIFrameElement;
	events: ScEvents;
	sounds: ScSound[];
	shuffle: Shuffle;
	/** The sound the widget is on: it opens on the first one, and -1 once it moves on by itself. */
	widgetIndex: number;
	/** Settles once SoundCloud has described every sound; a skip to an undescribed one never plays. */
	ready: PromiseWithResolvers<void>;
	isReady: boolean;
};

let session: Session | null = null;
let starting: Promise<Session> | null = null;
let apiPromise: Promise<ScApi> | null = null;
let userVolume = 1;
let fadeProgress = 0;
/** Playback was requested since launch; Quit clears it. */
let mediaStarted = false;
/** The listener wants music, so a browser-blocked start is retried on their next gesture. */
let wantPlaying = false;
let autoplayBlocked = false;
/** Bumped whenever the track or play state changes, so stale async work can tell. */
let generation = 0;
let lastWidgetVolume = -1;
let lastElapsed = -1;
let track: Track | null = null;
const elapsedNodes = new Set<HTMLElement>();
const playListeners = new Set<() => void>();

/** Playback state, exposed as window.taskbarAudio for the browser checks. */
const transport = {
	muted: false,
	/** The volume after the boot fade, before muting. */
	volume: 0,
	paused: true,
	currentTime: 0,
	src: "",
	readyState: 0,
	async play() {
		if (!session) return;
		applyVolume(true);
		const index = trackIndex(session);
		if (session.widgetIndex === index) {
			await session.widget.play();
		} else {
			session.widgetIndex = index;
			await session.widget.skip(index);
		}
	},
	pause() {
		session?.widget.pause();
		transport.paused = true;
	},
	getAttribute: (name: string) => (name === "src" ? transport.src || null : null),
};

if (typeof window !== "undefined") Object.assign(window, { taskbarAudio: transport });

/** What React renders; republished after every change to it. */
type View = { playing: boolean; track: Track | null; muted: boolean; volume: number };
let view: View = { playing: false, track: null, muted: false, volume: userVolume };
const viewers = new Set<() => void>();

function publish() {
	view = { playing: !transport.paused, track, muted: transport.muted, volume: userVolume };
	for (const notify of viewers) notify();
}

function subscribe(notify: () => void) {
	viewers.add(notify);
	return () => { viewers.delete(notify); };
}

const trackIndex = (s: Session) => s.shuffle.order[s.shuffle.position] ?? 0;
const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

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

/** Re-sends the volume when forced: switching tracks can reset the widget's to full. */
function applyVolume(force = false) {
	transport.volume = userVolume * fadeProgress ** 2;
	const out = Math.round((transport.muted ? 0 : transport.volume) * 100);
	if (out === lastWidgetVolume && !force) return;
	lastWidgetVolume = out;
	session?.widget.setVolume(out);
}

function loadApi(): Promise<ScApi> {
	const existing = (window as { SC?: ScApi }).SC;
	if (existing?.Widget) return Promise.resolve(existing);
	apiPromise ??= new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = API_SRC;
		script.async = true;
		script.onload = () => {
			const api = (window as { SC?: ScApi }).SC;
			if (api?.Widget) resolve(api);
			else reject(new Error("SoundCloud Widget API missing"));
		};
		script.onerror = () => reject(new Error("SoundCloud Widget API failed to load"));
		document.head.append(script);
	});
	return apiPromise;
}

function ensureSession(): Promise<Session> {
	if (session) return Promise.resolve(session);
	starting ??= (async () => {
		const api = await loadApi();
		const iframe = document.createElement("iframe");
		Object.assign(iframe, { id: "sc-cd-player", title: "SoundCloud", allow: "autoplay; encrypted-media", tabIndex: -1 });
		iframe.setAttribute("aria-hidden", "true");
		// Keep the iframe paintable; display:none often suspends media.
		iframe.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0;overflow:hidden";
		// Widget() reads iframe.src and throws on a blank frame. The browser checks stub SC without api.js.
		if (document.querySelector(`script[src="${API_SRC}"]`)) {
			iframe.src = `https://w.soundcloud.com/player/?${new URLSearchParams({ url: PLAYLIST_URL, auto_play: "false" })}`;
		}
		transport.src = PLAYLIST_URL;
		document.body.append(iframe);
		session = {
			widget: api.Widget(iframe), iframe, events: api.Widget.Events,
			sounds: [], shuffle: { order: [], position: 0 }, widgetIndex: 0,
			ready: Promise.withResolvers(), isReady: false,
		};
		bindEvents(session);
		return session;
	})().catch((error) => {
		starting = null;
		throw error;
	});
	return starting;
}

function bindEvents(s: Session) {
	const { widget, events } = s;
	widget.bind(events.READY, () => void loadPlaylist(s));
	widget.bind(events.PLAY, () => {
		transport.paused = false;
		applyVolume(true);
		publish();
		for (const listener of playListeners) listener();
	});
	widget.bind(events.PAUSE, () => {
		transport.paused = true;
		publish();
	});
	// The widget moves on to the next sound of the playlist by itself; follow the shuffle instead.
	widget.bind(events.FINISH, () => {
		s.widgetIndex = -1;
		if (mediaStarted) step(1);
	});
	widget.bind(events.PLAY_PROGRESS, (data) => {
		transport.currentTime = Math.floor((data?.currentPosition ?? 0) / 1000);
		writeElapsed();
	});
}

/** Deals the first shuffled round once the widget has described every sound of the playlist. */
async function loadPlaylist(s: Session) {
	for (let attempt = 0; attempt < RETRIES && !s.isReady; attempt++) {
		const sounds = await ask<ScSound[]>((answer) => s.widget.getSounds(answer));
		if (s !== session) return;
		if (sounds?.length && sounds.every((sound) => sound.title)) {
			s.sounds = sounds;
			s.shuffle = { order: shuffledOrder(sounds.length), position: 0 };
			s.isReady = true;
			transport.readyState = 4;
			showTrack();
			s.ready.resolve();
			return;
		}
		await sleep(RETRY_MS);
	}
	if (!s.isReady) console.error(`CD Player: SoundCloud did not describe every track of ${PLAYLIST_URL}.`);
}

/** Shows the current track's details, or blank fields when there is none. */
function showTrack() {
	const sound = session?.isReady ? session.sounds[trackIndex(session)] : undefined;
	track = sound?.title ? toTrack({ ...sound, title: sound.title }) : null;
	publish();
}

/** Moves one track through the shuffled round and plays it. */
function step(direction: 1 | -1) {
	if (!session?.isReady) return;
	generation++;
	session.shuffle = stepShuffle(session.shuffle, direction);
	autoplayBlocked = false;
	resetElapsed();
	showTrack();
	void startPlayback();
}

async function startPlayback() {
	const current = generation;
	await (await ensureSession()).ready.promise;
	if (current !== generation) return;
	mediaStarted = wantPlaying = true;
	autoplayBlocked = false;
	try {
		await transport.play();
	} catch (error) {
		if (current !== generation) return;
		autoplayBlocked = error instanceof DOMException && error.name === "NotAllowedError";
		publish();
	}
	// A browser can also hold play() without rejecting it; still paused a second later means blocked.
	window.setTimeout(() => {
		if (current === generation && wantPlaying && transport.paused) autoplayBlocked = true;
	}, 1000);
}

function writeElapsed() {
	if (transport.currentTime === lastElapsed) return;
	lastElapsed = transport.currentTime;
	for (const node of elapsedNodes) node.textContent = formatElapsed(lastElapsed);
}

function resetElapsed() {
	transport.currentTime = 0;
	lastElapsed = -1;
	writeElapsed();
}

/** Ref callback for every element showing the elapsed time; written directly, not rendered. */
function bindElapsed(node: HTMLElement | null) {
	if (!node) return;
	elapsedNodes.add(node);
	node.textContent = formatElapsed(transport.currentTime);
	return () => { elapsedNodes.delete(node); };
}

function toggleMute() {
	transport.muted = !transport.muted;
	applyVolume();
	publish();
	if (!transport.muted && transport.paused && mediaStarted) void startPlayback();
}

function togglePlay() {
	if (mediaStarted && !transport.paused) {
		wantPlaying = false;
		transport.pause();
		publish();
		return;
	}
	transport.muted = false;
	applyVolume();
	publish();
	void startPlayback();
}

function stop() {
	generation++;
	wantPlaying = autoplayBlocked = false;
	transport.pause();
	session?.widget.seekTo(0);
	resetElapsed();
	publish();
}

function quit() {
	stop();
	mediaStarted = false;
	fadeProgress = 0;
	lastWidgetVolume = -1;
	Object.assign(transport, { volume: 0, src: "", readyState: 0 });
	if (session) {
		for (const name of Object.values(session.events)) session.widget.unbind(name);
		session.iframe.remove();
	}
	session = null;
	starting = null;
	showTrack();
}

function setVolume(value: number) {
	userVolume = Math.min(1, Math.max(0, value));
	applyVolume();
	publish();
}

/** Desktop owns the transport so minimizing the app does not stop its music. */
export function useCdPlayerAudio(bootComplete: boolean, running: boolean) {
	const { playing, track, muted, volume } = useSyncExternalStore(subscribe, () => view, () => view);

	useEffect(() => {
		void ensureSession();
		// A gesture retries a start the browser blocked, unless the listener muted the music.
		const retry = () => { if (autoplayBlocked && !transport.muted) void startPlayback(); };
		window.addEventListener("click", retry);
		window.addEventListener("keydown", retry);
		return () => {
			window.removeEventListener("click", retry);
			window.removeEventListener("keydown", retry);
		};
	}, []);

	useEffect(() => {
		if (running && !mediaStarted) void startPlayback();
	}, [running]);

	// Once the desktop has booted, the music fades in over FADE_MS, resuming where an interrupted fade stopped.
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

		playListeners.add(beginFade);
		if (!transport.paused && transport.readyState >= 2) beginFade();
		return () => {
			cancelAnimationFrame(frame);
			playListeners.delete(beginFade);
		};
	}, [bootComplete, running]);

	return useMemo(() => ({
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
	}), [muted, playing, track, volume]);
}
