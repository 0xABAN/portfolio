"use client";

import { useEffect, useRef } from "react";

const GRAIN_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")";

export function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 1;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const hero = document.getElementById("home");
    if (!video || !hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: "200px", threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const hero = document.getElementById("home");
    if (!wrapper || !hero) return;

    const onScroll = () => {
      const heroHeight = hero.offsetHeight;
      const scrollY = window.scrollY;
      const fadeStart = heroHeight * 0.5;
      const fadeEnd = heroHeight * 1.1;
      const opacity = scrollY <= fadeStart
        ? 1
        : scrollY >= fadeEnd
          ? 0
          : 1 - (scrollY - fadeStart) / (fadeEnd - fadeStart);
      wrapper.style.opacity = String(opacity);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div ref={wrapperRef} style={{ position: "fixed", inset: 0, zIndex: -1 }}>
        <video
          ref={videoRef}
          loop muted playsInline preload="auto"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        >
          <source src="/Videos/background.mp4" type="video/mp4" />
        </video>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: GRAIN_SVG,
          opacity: 0.6, mixBlendMode: "overlay",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "15vh",
          background: "linear-gradient(to bottom, rgba(6,7,18,0) 0%, rgba(6,7,18,0.01) 8.1%, rgba(6,7,18,0.04) 15.5%, rgba(6,7,18,0.09) 22.5%, rgba(6,7,18,0.15) 29%, rgba(6,7,18,0.24) 35.3%, rgba(6,7,18,0.34) 41.2%, rgba(6,7,18,0.45) 47.1%, rgba(6,7,18,0.56) 52.9%, rgba(6,7,18,0.68) 58.8%, rgba(6,7,18,0.78) 64.7%, rgba(6,7,18,0.87) 71%, rgba(6,7,18,0.93) 77.5%, rgba(6,7,18,0.97) 84.5%, rgba(6,7,18,0.99) 91.9%, #060712 100%)",
          pointerEvents: "none",
        }} />
      </div>
    </>
  );
}
