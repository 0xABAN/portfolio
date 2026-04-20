"use client";

import { useEffect, useState } from "react";
import GlassSurface from "./GlassSurface/GlassSurface";
import TargetCursor from "./TargetCursor/TargetCursor";

const LINKS = [
  { label: "Home", id: "home" },
  { label: "About", id: "about" },
  { label: "Work", id: "experience" },
  { label: "Contact", id: "contact" },
];

export function Navbar() {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const updateActive = () => {
      const probe = window.innerHeight / 2;
      for (const { id } of LINKS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= probe && rect.bottom > probe) {
          setActiveId(id);
          return;
        }
      }
    };

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, []);

  return (
    <>
      <TargetCursor spinDuration={2} hideDefaultCursor={false} parallaxOn hoverDuration={0.2} />

      <nav
        className="fixed left-0 right-0 top-3 z-[100] mx-auto sm:top-4"
        style={{ width: "min(96vw, 420px)" }}
      >
        <GlassSurface
          width="100%"
          height={56}
          borderRadius={16}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          <div className="flex w-full items-center">
            {LINKS.map(({ label, id }) => {
              const isActive = activeId === id;
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  className="cursor-target relative flex h-14 flex-1 items-center justify-center text-xs transition-colors duration-[250ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-sm"
                  style={{
                    color: isActive ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.55)",
                    textDecoration: "none",
                  }}
                >
                  {label}
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      bottom: 12,
                      left: "50%",
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "#fff",
                      transform: `translateX(-50%) scale(${isActive ? 1 : 0})`,
                      transition: "transform 0.25s ease",
                    }}
                  />
                </a>
              );
            })}
          </div>
        </GlassSurface>
      </nav>
    </>
  );
}
