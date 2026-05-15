"use client";

import createGlobe from "cobe";
import { useSpring } from "@react-spring/web";
import { useEffect, useRef } from "react";

type LatLng = [number, number];

interface PolaroidPoint {
  id: string;
  location: LatLng;
  label: string;
  tilt: number;
  image?: string;
}

const POINTS: PolaroidPoint[] = [
  { id: "pr", location: [18.4655, -66.1057], label: "puerto rico", tilt: -5 },
  { id: "dr", location: [18.4861, -69.9312], label: "dominican republic", tilt: 4 },
  { id: "pa", location: [40.7934, -77.8600], label: "pennsylvania", tilt: -7 },
];

const BASE_PHI = 5.5;
const BASE_THETA = 0.32;

function latLngTo3D([lat, lng]: LatLng): [number, number, number] {
  const r = (lat * Math.PI) / 180;
  const a = (lng * Math.PI) / 180 - Math.PI;
  const cr = Math.cos(r);
  return [-cr * Math.cos(a), Math.sin(r), cr * Math.sin(a)];
}

function project(p: [number, number, number], phi: number, theta: number) {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  const x = cp * p[0] + sp * p[2];
  const y = sp * st * p[0] + ct * p[1] - cp * st * p[2];
  const z = -sp * ct * p[0] + st * p[1] + cp * ct * p[2];
  return { x, y, z };
}

interface GlobeProps {
  size?: number;
}

export default function Globe({ size = 480 }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const polaroidRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);

  const [{ r }, api] = useSpring(() => ({
    r: 0,
    config: { mass: 1, tension: 280, friction: 30, precision: 0.001 },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;

    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: size,
      height: size,
      phi: BASE_PHI,
      theta: BASE_THETA,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.55, 0.55, 0.65],
      markerColor: [0.45, 0.75, 1.0],
      glowColor: [0.35, 0.4, 0.55],
      markers: POINTS.map((p) => ({ location: p.location, size: 0.045 })),
    });

    const points = POINTS.map((p) => latLngTo3D(p.location));

    const tick = () => {
      const phi = BASE_PHI + r.get();
      globe.update({ phi });
      for (let i = 0; i < POINTS.length; i++) {
        const el = polaroidRefs.current[i];
        if (!el) continue;
        const { x, y, z } = project(points[i], phi, BASE_THETA);
        el.style.left = `${((x + 1) / 2) * 100}%`;
        el.style.top = `${((-y + 1) / 2) * 100}%`;
        const fade = z >= 0 ? Math.min(1, z * 4) : 0;
        el.style.opacity = fade.toFixed(3);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      globe.destroy();
    };
  }, [size, r]);

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        position: "relative",
        flex: "0 0 auto",
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current =
            e.clientX - pointerInteractionMovement.current;
          (e.currentTarget as HTMLCanvasElement).style.cursor = "grabbing";
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerUp={(e) => {
          pointerInteracting.current = null;
          (e.currentTarget as HTMLCanvasElement).style.cursor = "grab";
        }}
        onPointerOut={(e) => {
          pointerInteracting.current = null;
          (e.currentTarget as HTMLCanvasElement).style.cursor = "grab";
        }}
        onPointerMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            api.start({ r: delta / 200 });
          }
        }}
        style={{
          display: "block",
          width: size,
          height: size,
          cursor: "grab",
          touchAction: "pan-y",
        }}
      />
      {POINTS.map((p, i) => (
        <div
          key={p.id}
          ref={(el) => {
            polaroidRefs.current[i] = el;
          }}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) rotate(${p.tilt}deg)`,
            opacity: 0,
            pointerEvents: "none",
            background: "#fafaf7",
            color: "#111",
            padding: "4px 4px 7px",
            boxShadow:
              "0 4px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.35)",
            transition: "opacity 0.2s ease",
            fontFamily: "var(--font-sans, system-ui)",
            fontSize: 9,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
            willChange: "left, top, opacity",
            userSelect: "none",
          }}
        >
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image}
              alt={p.label}
              style={{
                display: "block",
                width: 40,
                height: 40,
                objectFit: "cover",
                marginBottom: 3,
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                marginBottom: 3,
                background:
                  "linear-gradient(135deg, #2a3a55 0%, #1a2438 60%, #0e1626 100%)",
              }}
            />
          )}
          <span
            style={{
              fontFamily: "var(--font-serif, ui-serif, Georgia, serif)",
              fontStyle: "italic",
              display: "block",
              textAlign: "center",
              fontSize: 9,
            }}
          >
            {p.label}
          </span>
        </div>
      ))}
    </div>
  );
}
