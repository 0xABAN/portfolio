"use client";

import { prepareWithSegments } from "@chenglou/pretext";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  fragmentsEqual,
  layoutFragmentsFromFrame,
  measureBox,
  sampleVideoFrame,
  type BoxMeasurement,
  type PositionedFragment,
} from "../pretext-video-flow";
const cornerStyles: Record<string, CSSProperties> = {
  tl: { top: -20, left: -20, borderTop: "2px solid #fff", borderLeft: "2px solid #fff" },
  tr: { top: -20, right: -20, borderTop: "2px solid #fff", borderRight: "2px solid #fff" },
  bl: { bottom: -20, left: -20, borderBottom: "2px solid #fff", borderLeft: "2px solid #fff" },
  br: { bottom: -20, right: -20, borderBottom: "2px solid #fff", borderRight: "2px solid #fff" },
};

function Corners() {
  return (
    <>
      {Object.values(cornerStyles).map((style, i) => (
        <div key={i} style={{ position: "absolute", width: 20, height: 20, ...style }} />
      ))}
    </>
  );
}

function highlight(text: string) {
  return text.split(/(Adam|Torres|Encarnacion)/).map((part, i) =>
    ["Adam", "Torres", "Encarnacion"].includes(part)
      ? <span key={i} style={{ color: "#6B6EBF" }}>{part}</span>
      : part
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay },
  }),
};

const HERO_COPY = "Adam Torres Encarnacion is a Penn State student who builds AI that ships. Not demos, not repos that never get touched again — actual systems, running in production. He interned at IBM and Amazon, and somewhere in between found time to win hackathons: first at YHacks, first at HackPrinceton, second at ByteDance (solo, that one). The pattern is pretty consistent. He picks something that should exist and makes it work. ".repeat(15).trim();

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: unknown) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fragments, setFragments] = useState<PositionedFragment[]>([]);
  const [measurement, setMeasurement] = useState<BoxMeasurement | null>(null);
  const [textFont, setTextFont] = useState<string>("");

  const refreshTextMetrics = useCallback(() => {
    const textLayer = textLayerRef.current;
    if (textLayer === null) return;

    const nextMeasurement = measureBox(textLayer);
    const nextFont = window.getComputedStyle(textLayer).font;

    if (nextMeasurement.width <= 0 || nextMeasurement.height <= 0 || nextFont.length === 0) return;

    setMeasurement((previous) => {
      if (
        previous !== null &&
        previous.width === nextMeasurement.width &&
        previous.height === nextMeasurement.height &&
        previous.paddingLeft === nextMeasurement.paddingLeft &&
        previous.paddingTop === nextMeasurement.paddingTop &&
        previous.paddingRight === nextMeasurement.paddingRight &&
        previous.paddingBottom === nextMeasurement.paddingBottom &&
        previous.lineHeight === nextMeasurement.lineHeight
      ) {
        return previous;
      }
      return nextMeasurement;
    });
    setTextFont((previous) => (previous === nextFont ? previous : nextFont));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => { if (!cancelled) refreshTextMetrics(); };

    refresh();
    document.fonts.ready.then(refresh).catch(() => {});

    const textLayer = textLayerRef.current;
    if (textLayer === null) return () => { cancelled = true; };

    const observer = new ResizeObserver(refresh);
    observer.observe(textLayer);

    return () => { cancelled = true; observer.disconnect(); };
  }, [refreshTextMetrics]);

  const preparedText = useMemo(() => {
    if (textFont.length === 0) return null;
    return prepareWithSegments(HERO_COPY, textFont);
  }, [textFont]);

  const computeTextLayout = useCallback(() => {
    const video = videoRef.current;
    if (video === null || measurement === null || preparedText === null) return;

    if (canvasRef.current === null) canvasRef.current = document.createElement("canvas");

    const frame = sampleVideoFrame(video, canvasRef.current, measurement, 1.12);
    if (frame === null) {
      setFragments((previous) => (previous.length === 0 ? previous : []));
      return;
    }

    const nextFragments = layoutFragmentsFromFrame(preparedText, measurement, frame, { minSlotWidth: 100 });
    setFragments((previous) => (fragmentsEqual(previous, nextFragments) ? previous : nextFragments));
  }, [measurement, preparedText]);

  useEffect(() => {
    if (measurement === null || preparedText === null) return;

    const video = videoRef.current as VideoWithFrameCallback | null;
    if (video === null || typeof video.requestVideoFrameCallback !== "function") return;

    let active = true;
    let videoFrameId = 0;

    const schedule = () => {
      if (!active) return;
      videoFrameId = video.requestVideoFrameCallback(() => { computeTextLayout(); schedule(); });
    };

    schedule();

    return () => {
      active = false;
      if (videoFrameId !== 0 && typeof video.cancelVideoFrameCallback === "function") {
        video.cancelVideoFrameCallback(videoFrameId);
      }
    };
  }, [computeTextLayout, measurement, preparedText]);

  return (
    <section style={{
      height: "100vh", padding: "4rem", paddingTop: "8rem",
      boxSizing: "border-box", display: "flex", flexDirection: "row",
      gap: "3rem", position: "relative", zIndex: 2,
    }}>
      <motion.div
        variants={fadeUp} initial="hidden" animate="visible" custom={0}
        style={{ flex: "0 0 51%", background: "rgba(0,0,0,0.7)", position: "relative", height: "85%", alignSelf: "flex-start" }}
      >
        <Corners />
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <video
            ref={videoRef}
            autoPlay loop muted playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", objectPosition: "left top", transform: "scale(1.12)", transformOrigin: "left top" }}
          >
            <source src="/asset1.webm" type="video/webm" />
          </video>
          <div
            ref={textLayerRef}
            aria-label="Hero copy wrapped around video"
            style={{
              position: "absolute", inset: 0, margin: 0, padding: "1rem",
              color: "#5a5954", fontSize: "0.875rem", lineHeight: 1.6,
              overflow: "hidden", userSelect: "text",
            }}
          >
            {fragments.map((fragment) => (
              <span
                key={fragment.key}
                style={{ position: "absolute", left: fragment.x, top: fragment.y, whiteSpace: "pre" }}
              >
                {highlight(fragment.text)}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
        <motion.h1
          variants={fadeUp} initial="hidden" animate="visible" custom={0.15}
          style={{ margin: 0, fontSize: "clamp(3rem, 4.5vw, 5.5rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05 }}
        >
          Adam<br />
          <em style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400 }}>
            Torres Encarnacion
          </em>
        </motion.h1>
        <motion.p
          variants={fadeUp} initial="hidden" animate="visible" custom={0.3}
          style={{ margin: "1rem 0 0", color: "#fff", fontSize: "1rem" }}
        >
          Designer &amp; Developer
        </motion.p>
      </div>
    </section>
  );
}
