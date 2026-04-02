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
import { blobPositions } from "./BlobCursor/blobPositions";
import BorderGlow from "./BorderGlow/BorderGlow";

const cornerStyles: Record<string, CSSProperties> = {
  tl: { top: -20, left: -20, borderTop: "3px solid #fff", borderLeft: "3px solid #fff" },
  tr: { top: -20, right: -20, borderTop: "3px solid #fff", borderRight: "3px solid #fff" },
  bl: { bottom: -20, left: -20, borderBottom: "3px solid #fff", borderLeft: "3px solid #fff" },
  br: { bottom: -20, right: -20, borderBottom: "3px solid #fff", borderRight: "3px solid #fff" },
};

function Corners() {
  return (
    <motion.div
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      animate={{ scale: [1, 1.03, 1] }}
      transition={{ duration: 3.5, ease: "easeInOut", repeat: Infinity }}
    >
      {Object.values(cornerStyles).map((style, i) => (
        <div key={i} style={{ position: "absolute", width: 28, height: 28, zIndex: 10, ...style }} />
      ))}
    </motion.div>
  );
}

function highlight(text: string) {
  return text.split(/(adam|torres|encarnacion)/).map((part, i) =>
    ["adam", "torres", "encarnacion"].includes(part)
      ? <span key={i} style={{ color: "#6B6EBF" }}>{part}</span>
      : part
  );
}

const HERO_COPY = "adam torres encarnacion goes to penn state and builds things that actually run. not side projects. ibm, amazon, a handful of hackathons he won (first at yhacks, first at hackprinceton, second at bytedance — that one solo). he sees something missing and makes it. ".repeat(15).trim();

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: unknown) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay },
  }),
};

export function BioSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorPosRef = useRef<{ x: number; y: number } | null>(null);
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

    const rect = containerRef.current?.getBoundingClientRect();
    const circles = rect
      ? blobPositions.map((b) => ({ x: b.x - rect.left, y: b.y - rect.top, radius: b.radius }))
      : [];
    if (cursorPosRef.current) circles.push({ ...cursorPosRef.current, radius: 52 });

    const nextFragments = layoutFragmentsFromFrame(preparedText, measurement, frame, {
      minSlotWidth: 100,
      cursorCircles: circles.length > 0 ? circles : undefined,
    });
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
    <motion.div
      ref={containerRef}
      variants={fadeUp} initial="hidden" animate="visible" custom={0}
      style={{ flex: "0 0 51%", position: "relative", height: "85%", alignSelf: "flex-start" }}
      onMouseMove={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          cursorPosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          computeTextLayout();
        }
      }}
      onMouseLeave={() => {
        cursorPosRef.current = null;
        computeTextLayout();
      }}
    >
      <Corners />
      <BorderGlow
        className="bio-border-glow"
        glowColor="0 0 88"
        backgroundColor="rgba(0,0,0,0.7)"
        colors={["rgba(255,255,255,0.2)", "rgba(220,220,220,0.12)", "rgba(200,200,200,0.08)"]}
        borderRadius={0}
        fillOpacity={0.2}
        glowIntensity={2.5}
        glowRadius={60}
      >
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
          aria-label="hero copy wrapped around video"
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
        <video
          autoPlay loop muted playsInline
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.4, mixBlendMode: "screen" }}
        >
          <source src="/rain_effect.webm" type="video/webm" />
        </video>
      </div>
      </BorderGlow>
    </motion.div>
  );
}
