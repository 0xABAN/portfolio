"use client";

import { useEffect, useRef, useState } from "react";
import { formatElapsed, randomTrackIndex, trackAt } from "./playlist";

/** Muted autoplay playlist shared by the Spotify tab + speaker. */
export function useTaskbarAudio() {
	const [muted, setMuted] = useState(true);
	const [playing, setPlaying] = useState(false);
	const [trackIdx, setTrackIdx] = useState(() => randomTrackIndex());
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const trackIdxRef = useRef(trackIdx);
	const elapsedElRef = useRef<HTMLElement | null>(null);
	const lastSec = useRef(-1);

	const selectTrack = (i: number) => {
		trackIdxRef.current = i;
		setTrackIdx(i);
	};

	useEffect(() => {
		const first = trackAt(trackIdxRef.current);
		const audio = new Audio(first.src);
		audio.preload = "metadata";
		audio.muted = true;
		audio.volume = 1;
		audioRef.current = audio;

		const writeElapsed = (sec: number) => {
			if (sec === lastSec.current) return;
			lastSec.current = sec;
			const el = elapsedElRef.current;
			if (el) el.textContent = formatElapsed(sec);
		};

		const onTime = () => writeElapsed(Math.floor(audio.currentTime || 0));
		const onPlay = () => setPlaying(true);
		const onPause = () => setPlaying(false);
		const onEnded = () => {
			const next = randomTrackIndex(trackIdxRef.current);
			const t = trackAt(next);
			selectTrack(next);
			writeElapsed(0);
			audio.src = t.src;
			void audio.play().catch(() => setPlaying(false));
		};

		audio.addEventListener("timeupdate", onTime);
		audio.addEventListener("play", onPlay);
		audio.addEventListener("pause", onPause);
		audio.addEventListener("ended", onEnded);
		void audio.play().catch(() => setPlaying(false));

		return () => {
			audio.pause();
			audio.removeEventListener("timeupdate", onTime);
			audio.removeEventListener("play", onPlay);
			audio.removeEventListener("pause", onPause);
			audio.removeEventListener("ended", onEnded);
			audioRef.current = null;
		};
	}, []);

	const play = () => {
		void audioRef.current?.play().catch(() => setPlaying(false));
	};

	const toggleMute = () => {
		const audio = audioRef.current;
		if (!audio) return;
		const next = !audio.muted;
		audio.muted = next;
		setMuted(next);
		if (!next) play();
	};

	const togglePlay = () => {
		const audio = audioRef.current;
		if (!audio) return;
		if (!audio.paused) {
			audio.pause();
			return;
		}
		audio.muted = false;
		setMuted(false);
		play();
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
