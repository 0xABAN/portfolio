"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import "./cd-player.css";

export const PLAYLIST_URL = "https://soundcloud.com/0x-aban/sets/portfolio";

export type ScSound = {
	id: number;
	title?: string;
	user?: { username?: string };
	artwork_url?: string | null;
};

export type Track = {
	title: string;
	artist: string;
	cover: string | null;
};

export function toTrack(sound: ScSound & { title: string }): Track {
	return {
		title: sound.title,
		artist: sound.user?.username ?? "",
		cover: sound.artwork_url ? coverUrl(sound.artwork_url) : null,
	};
}

export function coverUrl(artworkUrl: string) {
	return artworkUrl.replace(/-large(\.\w+)$/, "-t500x500$1");
}

export type Shuffle = { order: number[]; position: number };

export function shuffledOrder(count: number, notFirst?: number): number[] {
	if (count <= 0) throw new Error("playlist is empty");

	const order = Array.from({ length: count }, (_, i) => i);
	for (let i = count - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[order[i], order[j]] = [order[j], order[i]];
	}

	if (count > 1 && order[0] === notFirst) {
		const j = 1 + Math.floor(Math.random() * (count - 1));
		[order[0], order[j]] = [order[j], order[0]];
	}
	return order;
}

export function stepShuffle({ order, position }: Shuffle, direction: 1 | -1): Shuffle {
	const next = position + direction;
	if (next >= order.length) return { order: shuffledOrder(order.length, order[position]), position: 0 };
	if (next < 0) return { order, position: order.length - 1 };
	return { order, position: next };
}

export function formatElapsed(sec: number) {
	if (!Number.isFinite(sec) || sec < 0) sec = 0;
	const s = Math.floor(sec);
	return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

type ScEvents = { READY: string; PLAY: string; PAUSE: string; FINISH: string; PLAY_PROGRESS: string };

type ScWidget = {
	bind: (event: string, listener: (data?: { currentPosition?: number }) => void) => void;
	unbind: (event: string) => void;
	play: () => unknown;
	pause: () => void;
	skip: (index: number) => unknown;
	seekTo: (milliseconds: number) => void;
	setVolume: (volume: number) => void;
	getSounds: (callback: (sounds: ScSound[]) => void) => void;
};

type ScApi = { Widget: ((iframe: HTMLIFrameElement) => ScWidget) & { Events: ScEvents } };

const FADE_MS = 10_000;
const API_SRC = "https://w.soundcloud.com/player/api.js";
const GETTER_TIMEOUT_MS = 2000;
const RETRIES = 40;
const RETRY_MS = 250;

type Session = {
	widget: ScWidget;
	iframe: HTMLIFrameElement;
	events: ScEvents;
	sounds: ScSound[];
	shuffle: Shuffle;
	widgetIndex: number;
	ready: PromiseWithResolvers<void>;
	isReady: boolean;
};

let session: Session | null = null;
let starting: Promise<Session> | null = null;
let apiPromise: Promise<ScApi> | null = null;
let userVolume = 1;
let fadeProgress = 0;
let mediaStarted = false;
let wantPlaying = false;
let autoplayBlocked = false;
let generation = 0;
let lastWidgetVolume = -1;
let lastElapsed = -1;
let track: Track | null = null;
const elapsedNodes = new Set<HTMLElement>();
const playListeners = new Set<() => void>();

const transport = {
	muted: false,
	volume: 0,
	paused: true,
	currentTime: 0,
	get src() {
		return session ? PLAYLIST_URL : "";
	},
	get readyState() {
		return session?.isReady ? 4 : 0;
	},
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

type View = { playing: boolean; track: Track | null; muted: boolean; volume: number };
let view: View = { playing: false, track: null, muted: false, volume: userVolume };
const viewers = new Set<() => void>();

function publish() {
	const next: View = { playing: !transport.paused, track, muted: transport.muted, volume: userVolume };
	if (next.playing === view.playing && next.track === view.track && next.muted === view.muted && next.volume === view.volume) return;
	view = next;
	for (const notify of viewers) notify();
}

function subscribe(notify: () => void) {
	viewers.add(notify);
	return () => { viewers.delete(notify); };
}

const trackIndex = (s: Session) => s.shuffle.order[s.shuffle.position] ?? 0;
const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function ask<T>(request: (answer: (value: T) => void) => void): Promise<T | undefined> {
	return new Promise((resolve) => {
		const timer = window.setTimeout(() => resolve(undefined), GETTER_TIMEOUT_MS);
		request((value) => {
			window.clearTimeout(timer);
			resolve(value);
		});
	});
}

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
		iframe.style.cssText = "position:fixed;left:0;top:0;width:300px;height:166px;opacity:0;pointer-events:none;border:0;overflow:hidden";
		if (document.querySelector(`script[src="${API_SRC}"]`)) {
			iframe.src = `https://w.soundcloud.com/player/?${new URLSearchParams({ url: PLAYLIST_URL, auto_play: "false" })}`;
		}
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
	widget.bind(events.FINISH, () => {
		s.widgetIndex = -1;
		if (mediaStarted) step(1);
	});
	widget.bind(events.PLAY_PROGRESS, (data) => {
		transport.currentTime = Math.floor((data?.currentPosition ?? 0) / 1000);
		writeElapsed();
	});
}

async function loadPlaylist(s: Session) {
	for (let attempt = 0; attempt < RETRIES && !s.isReady; attempt++) {
		const sounds = await ask<ScSound[]>((answer) => s.widget.getSounds(answer));
		if (s !== session) return;
		if (sounds?.length && sounds.every((sound) => sound.title)) {
			s.sounds = sounds;
			s.shuffle = { order: shuffledOrder(sounds.length), position: 0 };
			s.isReady = true;
			showTrack();
			s.ready.resolve();
			return;
		}
		await sleep(RETRY_MS);
	}
	if (!s.isReady) console.error(`CD Player: SoundCloud did not describe every track of ${PLAYLIST_URL}.`);
}

function showTrack() {
	const sound = session?.isReady ? session.sounds[trackIndex(session)] : undefined;
	track = sound?.title ? toTrack({ ...sound, title: sound.title }) : null;
	publish();
}

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
	transport.volume = 0;
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

export function useCdPlayerAudio(bootComplete: boolean, running: boolean) {
	const { playing, track, muted, volume } = useSyncExternalStore(subscribe, () => view, () => view);

	useEffect(() => {
		void ensureSession();
		const retry = () => { if (autoplayBlocked && !transport.muted) void startPlayback(); };
		window.addEventListener("click", retry);
		window.addEventListener("keydown", retry);
		return () => {
			window.removeEventListener("click", retry);
			window.removeEventListener("keydown", retry);
		};
	}, []);

	useEffect(() => {
		if (!running) quit();
		else if (!mediaStarted) void startPlayback();
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
		track,
		trackLabel: track ? `${track.artist} - ${track.title}` : "",
		volume,
		bindElapsed,
		toggleMute,
		togglePlay,
		playPrev: () => step(-1),
		playNext: () => step(1),
		stop,
		setVolume,
	}), [muted, playing, track, volume]);
}

function Field({ label, value, onPrev, onNext }: { label: string; value: string; onPrev: () => void; onNext: () => void }) {
	return (
		<div className="cd-player__field">
			<span className="cd-player__label">{label}</span>
			<div className="cd-player__combo">
				<div className="cd-player__combo-face chrome-sunken" title={value}>{value}</div>
				<div className="cd-player__spin">
					<button type="button" className="cd-player__spin-btn chrome-raised" aria-label="Previous track" onClick={onPrev}>
						<span className="cd-player__spin-ico cd-player__spin-ico--up" />
					</button>
					<button type="button" className="cd-player__spin-btn chrome-raised" aria-label="Next track" onClick={onNext}>
						<span className="cd-player__spin-ico cd-player__spin-ico--down" />
					</button>
				</div>
			</div>
		</div>
	);
}

export function CdPlayer({ track, playing, volume, bindElapsed, togglePlay, playPrev, playNext, setVolume, stop }: ReturnType<typeof useCdPlayerAudio>) {
	const controls: [label: string, action: () => void, glyph: string][] = [
		["Previous track", playPrev, "prev"],
		["Next track", playNext, "next"],
		[playing ? "Pause" : "Play", togglePlay, playing ? "pause" : "play"],
		["Stop", stop, "stop"],
	];

	return (
		<div className="cd-player__body">
			<div className="cd-player__row">
				<div className="cd-player__art chrome-sunken" aria-hidden>
					{track?.cover && <img src={track.cover} alt="" draggable={false} />}
				</div>

				<div className="cd-player__fields">
					<Field label="Artist:" value={track?.artist ?? ""} onPrev={playPrev} onNext={playNext} />
					<Field label="Track:" value={track?.title ?? ""} onPrev={playPrev} onNext={playNext} />

					<div className="cd-player__transport" role="toolbar" aria-label="Playback">
						{controls.map(([label, action, glyph], index) => (
							<button key={index} type="button" className="cd-player__tbtn chrome-raised" aria-label={label} onClick={action}>
								<span className={`cd-player__glyph cd-player__glyph--${glyph}`} />
							</button>
						))}
					</div>

					<label className="cd-player__vol">
						<span className="cd-player__vol-label">Volume:</span>
						<input className="cd-player__trackbar" type="range" min={0} max={1} step={0.01} value={volume} aria-label="Volume"
							onChange={(event) => setVolume(Number(event.target.value))} />
					</label>
				</div>
			</div>
			<div aria-label="Elapsed time"><span ref={bindElapsed}>0:00</span></div>
		</div>
	);
}
