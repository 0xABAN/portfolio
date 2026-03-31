"use client";

import { prepareWithSegments } from "@chenglou/pretext";
import { motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  fragmentsEqual,
  layoutFragmentsFromFrame,
  measureBox,
  sampleVideoFrame,
  type BoxMeasurement,
  type PositionedFragment,
} from "./pretext-video-flow";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay },
  }),
};

const HERO_COPY = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. ".repeat(20).trim();

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: unknown) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

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

function NavIcon({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="liquid-glass"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "50%", width: 36, height: 36,
        color: "#fff", textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}

export default function Home() {
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

    if (nextMeasurement.width <= 0 || nextMeasurement.height <= 0 || nextFont.length === 0) {
      return;
    }

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
    const refresh = () => {
      if (!cancelled) refreshTextMetrics();
    };

    refresh();
    document.fonts.ready.then(refresh).catch(() => {});

    const textLayer = textLayerRef.current;
    if (textLayer === null) {
      return () => {
        cancelled = true;
      };
    }

    const observer = new ResizeObserver(refresh);
    observer.observe(textLayer);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [refreshTextMetrics]);

  const preparedText = useMemo(() => {
    if (textFont.length === 0) return null;
    return prepareWithSegments(HERO_COPY, textFont);
  }, [textFont]);

  const computeTextLayout = useCallback(() => {
    const video = videoRef.current;
    if (video === null || measurement === null || preparedText === null) return;

    if (canvasRef.current === null) {
      canvasRef.current = document.createElement("canvas");
    }

    const frame = sampleVideoFrame(video, canvasRef.current, measurement);
    if (frame === null) {
      setFragments((previous) => (previous.length === 0 ? previous : []));
      return;
    }

    const nextFragments = layoutFragmentsFromFrame(preparedText, measurement, frame);
    setFragments((previous) => (fragmentsEqual(previous, nextFragments) ? previous : nextFragments));
  }, [measurement, preparedText]);

  useEffect(() => {
    if (measurement === null || preparedText === null) return;

    const video = videoRef.current as VideoWithFrameCallback | null;
    if (video === null) return;
    if (typeof video.requestVideoFrameCallback !== "function") return;

    let active = true;
    let videoFrameId = 0;

    const schedule = () => {
      if (!active) return;
      videoFrameId = video.requestVideoFrameCallback(() => {
        computeTextLayout();
        schedule();
      });
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
    <main style={{ position: "relative", minHeight: "100vh" }}>
      <video
        autoPlay loop muted playsInline
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: -1 }}
      >
        <source src="/background.webm" type="video/webm" />
        <source src="/background.mp4" type="video/mp4" />
      </video>

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: "16rem",
        background: "linear-gradient(to bottom, transparent, #000)",
        zIndex: 1, pointerEvents: "none",
      }} />

      {/* Navbar */}
      <nav
        className="liquid-glass"
        style={{
          position: "fixed", top: "1.5rem", left: "50%", transform: "translateX(-50%)",
          zIndex: 50, display: "flex", alignItems: "center", gap: "2rem",
          padding: "0.5rem 1.25rem", borderRadius: "9999px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3" stroke="white" strokeWidth="1" />
            <circle cx="10" cy="10" r="6" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
            <circle cx="10" cy="10" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>ATE</span>
        </div>

        <div style={{ display: "flex", gap: "1.25rem" }}>
          {["Work", "About", "Contact"].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              style={{ color: "#fff", textDecoration: "none", fontSize: "0.875rem" }}
            >
              {link}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <NavIcon href="https://github.com">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </NavIcon>
          <NavIcon href="https://linkedin.com">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </NavIcon>
          <NavIcon href="https://twitter.com">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </NavIcon>
        </div>
      </nav>

      {/* Hero — two-column split */}
      <section style={{
        height: "100vh", padding: "4rem", paddingTop: "8rem",
        boxSizing: "border-box", display: "flex", flexDirection: "row",
        gap: "3rem", position: "relative", zIndex: 2,
      }}>
        {/* Left: black box with video */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={0}
          style={{ flex: "0 0 60%", background: "rgba(0,0,0,0.7)", position: "relative", height: "85%", alignSelf: "flex-start" }}
        >
          <Corners />
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <video
              ref={videoRef}
              autoPlay loop muted playsInline
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", objectPosition: "left top" }}
            >
              <source src="/asset1.webm" type="video/webm" />
            </video>
            <div
              ref={textLayerRef}
              aria-label="Hero copy wrapped around video"
              style={{
                position: "absolute",
                inset: 0,
                margin: 0,
                padding: "1rem",
                color: "#fff",
                fontSize: "0.875rem",
                lineHeight: 1.6,
                overflow: "hidden",
                userSelect: "text",
              }}
            >
              {fragments.map((fragment) => (
                <span
                  key={fragment.key}
                  style={{
                    position: "absolute",
                    left: fragment.x,
                    top: fragment.y,
                    whiteSpace: "pre",
                  }}
                >
                  {fragment.text}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right: name + title */}
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
    </main>
  );
}
