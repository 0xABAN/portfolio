"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import "./BentoGlow.css";

interface BentoGlowProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  spotlightRadius?: number;
  enableTilt?: boolean;
}

const clamp = (v: number, min = 0, max = 100) => Math.min(Math.max(v, min), max);
const round = (v: number, p = 3) => parseFloat(v.toFixed(p));

const ENTER_TRANSITION_MS = 180;
const TILT_TAU = 0.14;

const BentoGlow: React.FC<BentoGlowProps> = ({
  children,
  className = "",
  style,
  glowColor = "132, 0, 255",
  backgroundColor,
  borderRadius = 20,
  borderWidth = 6,
  spotlightRadius = 300,
  enableTilt = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const enterTimerRef = useRef<number | null>(null);
  const leaveRafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--bento-glow-x", `${x}%`);
      el.style.setProperty("--bento-glow-y", `${y}%`);
      el.style.setProperty("--bento-glow-intensity", "1");
    };
    const handleLeave = () => {
      el.style.setProperty("--bento-glow-intensity", "0");
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  const tiltEngine = useMemo(() => {
    if (!enableTilt) return null;

    let rafId: number | null = null;
    let running = false;
    let lastTs = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const setVarsFromXY = (x: number, y: number) => {
      const el = ref.current;
      if (!el) return;
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      const pctX = clamp((100 / w) * x);
      const pctY = clamp((100 / h) * y);
      const cx = pctX - 50;
      const cy = pctY - 50;
      el.style.setProperty("--rotate-x", `${round(-(cx / 10))}deg`);
      el.style.setProperty("--rotate-y", `${round(cy / 8)}deg`);
    };

    const step = (ts: number) => {
      if (!running) return;
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const k = 1 - Math.exp(-dt / TILT_TAU);
      currentX += (targetX - currentX) * k;
      currentY += (targetY - currentY) * k;
      setVarsFromXY(currentX, currentY);

      const stillFar = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;
      if (stillFar) {
        rafId = requestAnimationFrame(step);
      } else {
        running = false;
        lastTs = 0;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(step);
    };

    return {
      setTarget(x: number, y: number) {
        targetX = x;
        targetY = y;
        start();
      },
      toCenter() {
        const el = ref.current;
        if (!el) return;
        this.setTarget(el.clientWidth / 2, el.clientHeight / 2);
      },
      getCurrent() {
        return { x: currentX, y: currentY, tx: targetX, ty: targetY };
      },
      cancel() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        running = false;
        lastTs = 0;
      },
    };
  }, [enableTilt]);

  const getOffset = (e: PointerEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerEnter = useCallback(
    (e: PointerEvent) => {
      const el = ref.current;
      if (!el || !tiltEngine) return;
      el.classList.add("active", "entering");
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = window.setTimeout(() => {
        el.classList.remove("entering");
      }, ENTER_TRANSITION_MS);
      const { x, y } = getOffset(e, el);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const el = ref.current;
      if (!el || !tiltEngine) return;
      const { x, y } = getOffset(e, el);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine]
  );

  const handlePointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el || !tiltEngine) return;
    tiltEngine.toCenter();
    const settle = () => {
      const { x, y, tx, ty } = tiltEngine.getCurrent();
      if (Math.hypot(tx - x, ty - y) < 0.6) {
        el.classList.remove("active");
        leaveRafRef.current = null;
      } else {
        leaveRafRef.current = requestAnimationFrame(settle);
      }
    };
    if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
    leaveRafRef.current = requestAnimationFrame(settle);
  }, [tiltEngine]);

  useEffect(() => {
    if (!enableTilt || !tiltEngine) return;
    const el = ref.current;
    if (!el) return;

    const enter = handlePointerEnter as EventListener;
    const move = handlePointerMove as EventListener;
    const leave = handlePointerLeave as EventListener;

    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);

    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
      tiltEngine.cancel();
      el.classList.remove("active", "entering");
    };
  }, [enableTilt, tiltEngine, handlePointerEnter, handlePointerMove, handlePointerLeave]);

  const cssVars = {
    "--bento-glow-color": glowColor,
    "--bento-glow-radius": `${spotlightRadius}px`,
    "--bento-glow-border-radius": `${borderRadius}px`,
    "--bento-glow-border-width": `${borderWidth}px`,
    ...(backgroundColor !== undefined ? { "--bento-glow-bg": backgroundColor } : {}),
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={`bento-glow ${enableTilt ? "bento-glow--tilt" : ""} ${className}`.trim()}
      style={{ ...cssVars, ...style }}
    >
      {children}
    </div>
  );
};

export default BentoGlow;
