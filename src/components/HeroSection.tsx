"use client";

import { useEffect, useRef } from "react";
import { Play } from "lucide-react";

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.75;
  }, []);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src="/hero_background.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />

      {/* Grain overlay */}
      <svg className="absolute inset-0 w-full h-full z-[1] pointer-events-none opacity-20" aria-hidden="true">
        <filter id="grain-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch">
            <animate attributeName="seed" from="0" to="100" dur="0.5s" repeatCount="indefinite" />
          </feTurbulence>
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-filter)" />
      </svg>

      {/* Bottom gradient fade */}
      <div 
        className="absolute inset-x-0 bottom-0 h-[45%] z-[2] pointer-events-none"
        style={{
          background: "linear-gradient(to top, #040200 0%, rgba(4, 2, 0, 0.8) 20%, rgba(4, 2, 0, 0.4) 50%, transparent 100%)"
        }}
      />

<div className="relative z-10 w-full flex flex-col items-start text-left gap-5 pl-16 pr-[45%]">
        <h1
          className="font-sans font-bold text-hero text-white leading-none m-0 uppercase tracking-tightest"
          style={{ textShadow: "0 2px 40px rgba(0,0,0,0.3)" }}
        >
          Adam Torres
        </h1>

        <p className="font-serif italic text-[48px] md:text-[64px] text-white/80 leading-none m-0">
          software with meaning
        </p>

        <p className="font-sans font-medium text-[18px] text-white/60 m-0">
          The perfect mix of Mofongo and Mangú, now in the USA.
        </p>

        <a
          href="#works"
          className="mt-2 flex items-center gap-3 liquid-glass-strong text-white font-sans font-medium text-[16px] px-6 py-3 rounded-lg hover:bg-white/10 transition-colors duration-200 no-underline"
        >
          <span className="flex items-center justify-center w-[28px] h-[28px] rounded-md bg-white/20 text-white flex-shrink-0">
            <Play className="w-[11px] h-[11px] translate-x-[1px]" fill="currentColor" strokeWidth={0} />
          </span>
          See work
        </a>
      </div>
    </section>
  );
}
