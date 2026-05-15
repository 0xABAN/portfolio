"use client";

import { prepareWithSegments } from "@chenglou/pretext";
import { m as motion, type Variants } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fragmentsEqual,
  layoutFragmentsFromFrame,
  measureBox,
  sampleVideoFrame,
  type BoxMeasurement,
  type PositionedFragment,
} from "../pretext-video-flow";
import { blobPositions } from "./BlobCursor/blobPositions";
import { useInView } from "../hooks/useInView";
import BentoGlow from "./BentoGlow/BentoGlow";
import LightRays from "./LightRays/LightRays";
import SpotlightCard from "./SpotlightCard/SpotlightCard";

const NAME_WORDS = new Set(["adam", "torres", "encarnacion"]);
const PLACE_WORDS = new Set(["puerto", "rico", "dominican", "republic", "pennsylvania"]);
const HIGHLIGHT_PATTERN = /(adam|torres|encarnacion|puerto|rico|dominican|republic|pennsylvania)/g;

function highlight(text: string) {
  let offset = 0;
  return text.split(HIGHLIGHT_PATTERN).map((part) => {
    const at = offset;
    offset += part.length;
    if (NAME_WORDS.has(part)) {
      return (
        <span key={`n-${part}@${at}`} style={{ color: "#FFFFFF", fontWeight: 700 }}>
          {part}
        </span>
      );
    }
    if (PLACE_WORDS.has(part)) {
      return (
        <span key={`p-${part}@${at}`} style={{ color: "#FFFFFF", fontStyle: "italic", fontWeight: 600 }}>
          {part}
        </span>
      );
    }
    return part;
  });
}

const HERO_COPY = "adam torres encarnacion. data science + stats at penn state. software engineering intern at amazon, summer 2026. ai engineering intern at ibm. previously machine learning intern at lockheed martin. founder of the claude builder club. director of epoch ai. born in puerto rico, raised in the dominican republic, based in pennsylvania. ".repeat(5).trim();

type VideoFrameMetadata = { mediaTime: number; presentedFrames: number };
type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: VideoFrameMetadata) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay },
  }),
};

export function BioSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerRectRef = useRef<DOMRect | null>(null);
  const cursorPosRef = useRef<{ x: number; y: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastSignatureRef = useRef<string>("");
  const [fragments, setFragments] = useState<PositionedFragment[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const isInView = useInView(containerRef);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);
  const [measurement, setMeasurement] = useState<BoxMeasurement | null>(null);
  const [textFont, setTextFont] = useState<string>("");

  useEffect(() => {
    const update = () => {
      containerRectRef.current = containerRef.current?.getBoundingClientRect() ?? null;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      window.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

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

  const computeTextLayout = useCallback((mediaTime: number) => {
    const video = videoRef.current;
    const textLayer = textLayerRef.current;
    if (video === null || textLayer === null || measurement === null || preparedText === null) return;

    const cursor = cursorPosRef.current;
    const signature = `${mediaTime}|${cursor === null ? "n" : `${cursor.x},${cursor.y}`}`;
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;

    if (canvasRef.current === null) canvasRef.current = document.createElement("canvas");

    const frame = sampleVideoFrame(video, canvasRef.current, measurement, 1.12);
    if (frame === null) {
      setFragments((previous) => (previous.length === 0 ? previous : []));
      return;
    }

    const rect = containerRectRef.current;
    const textRect = textLayer.getBoundingClientRect();
    const offsetX = rect ? textRect.left - rect.left : 0;
    const offsetY = rect ? textRect.top - rect.top : 0;
    const circles = rect
      ? blobPositions.map((b) => ({
          x: b.x - rect.left - offsetX,
          y: b.y - rect.top - offsetY,
          radius: b.radius,
        }))
      : [];
    if (cursor) circles.push({ x: cursor.x - offsetX, y: cursor.y - offsetY, radius: 52 });

    const nextFragments = layoutFragmentsFromFrame(preparedText, measurement, frame, {
      minSlotWidth: isMobile ? 60 : 100,
      cursorCircles: circles.length > 0 ? circles : undefined,
    });
    setFragments((previous) => (fragmentsEqual(previous, nextFragments) ? previous : nextFragments));
  }, [measurement, preparedText, isMobile]);

  useEffect(() => {
    const video = videoRef.current as VideoWithFrameCallback | null;
    if (video === null) return;

    if (isInView) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isInView]);

  useEffect(() => {
    if (!isInView || measurement === null || preparedText === null) return;

    const video = videoRef.current as VideoWithFrameCallback | null;
    if (video === null) return;

    let active = true;
    let handle = 0;

    if (typeof video.requestVideoFrameCallback === "function") {
      const schedule = () => {
        if (!active) return;
        handle = video.requestVideoFrameCallback!((_now, metadata) => {
          computeTextLayout(metadata.mediaTime);
          schedule();
        });
      };
      schedule();
      return () => {
        active = false;
        if (handle !== 0 && typeof video.cancelVideoFrameCallback === "function") {
          video.cancelVideoFrameCallback(handle);
        }
      };
    }

    const tick = () => {
      if (!active) return;
      if (!video.paused && !video.ended) computeTextLayout(video.currentTime);
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => { active = false; cancelAnimationFrame(handle); };
  }, [computeTextLayout, measurement, preparedText, isInView]);

  return (
    <motion.div
      ref={containerRef}
      variants={fadeUp} initial="hidden" animate="visible" custom={0}
      className="relative self-start w-full aspect-video lg:aspect-auto lg:flex-[0_0_51%] lg:h-[85%]"
      style={{ zIndex: 20 }}
      onMouseMove={(e) => {
        const rect = containerRectRef.current;
        if (rect) {
          cursorPosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
      }}
      onMouseLeave={() => {
        cursorPosRef.current = null;
      }}
    >
      <BentoGlow
        className="bio-border-glow"
        glowColor="255, 255, 255"
        backgroundColor="#FFFDF6"
        borderRadius={6}
        spotlightRadius={300}
        enableTilt
      >
      <SpotlightCard
        className="bio-spotlight"
        spotlightColor="rgba(255, 250, 235, 0.35)"
        style={{
          position: "absolute",
          inset: 0,
          padding: 0,
          border: "none",
          borderRadius: 6,
          backgroundColor: "transparent",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "4.5%",
            left: "4.5%",
            right: "4.5%",
            bottom: "17%",
            overflow: "hidden",
            backgroundImage: "url('/Photos/clouds.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
          }}
        >
          <video
            ref={videoRef}
            autoPlay loop muted playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", objectPosition: "left top", transform: "scale(1.12)", transformOrigin: "left top" }}
          >
            <source src="/Videos/asset1.webm" type="video/webm" />
          </video>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "linear-gradient(to right, transparent 20%, rgba(0,0,0,0.35) 100%)",
            }}
          />
          <div
            ref={textLayerRef}
            aria-label="hero copy wrapped around video"
            className="text-white"
            style={{
              position: "absolute", inset: 0, margin: 0, padding: "0.75rem 0.875rem",
              fontSize: isMobile ? "0.6rem" : "1rem", lineHeight: 1.5,
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
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen", opacity: 0.6 }}>
            <LightRays
              raysOrigin="top-center"
              raysColor="#ffffff"
              raysSpeed={1}
              lightSpread={0.8}
              rayLength={1.2}
              followMouse
              mouseInfluence={0.1}
              noiseAmount={0.08}
              distortion={0.03}
            />
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: "4.5%",
            right: "4.5%",
            bottom: 0,
            height: "17%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: "calc(6% - 15px)",
            fontFamily: "var(--font-handwritten)",
            fontWeight: 400,
            color: "#0A1F44",
            fontSize: "clamp(0.9rem, 1.6vw, 1.4rem)",
            letterSpacing: "0.01em",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              lineHeight: 1,
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: "rotate(-5deg)",
                transformOrigin: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.55rem",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#0A1F44",
                marginBottom: "-0.1rem",
                WebkitTextStroke: "0",
              }}
            >
              signed by
            </span>
            <span
              style={{
                display: "inline-block",
                transform: "rotate(-5deg)",
                transformOrigin: "center",
                fontWeight: 700,
                WebkitTextStroke: "0.5px currentColor",
              }}
            >
              adam torres encarnacion
            </span>
          </span>
        </div>
      </SpotlightCard>
      </BentoGlow>
    </motion.div>
  );
}
