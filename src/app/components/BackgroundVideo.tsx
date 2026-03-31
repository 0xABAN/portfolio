"use client";

import { useEffect, useRef } from "react";

const GRAIN_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")";

export function BackgroundVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = 1;
  }, []);

  return (
    <>
      <video
        ref={ref}
        autoPlay loop muted playsInline
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: -1 }}
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: GRAIN_SVG,
        opacity: 0.6, mixBlendMode: "overlay",
      }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: "16rem",
        background: "linear-gradient(to bottom, transparent, #000)",
        zIndex: 1, pointerEvents: "none",
      }} />
    </>
  );
}
