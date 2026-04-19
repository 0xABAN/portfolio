"use client";

import GlassSurface from "./GlassSurface/GlassSurface";
import TargetCursor from "./TargetCursor/TargetCursor";

export function Navbar() {
  return (
    <>
      <TargetCursor spinDuration={2} hideDefaultCursor={false} parallaxOn hoverDuration={0.2} />

      <nav
        style={{ position: "fixed", top: "1rem", left: 0, right: 0, width: "fit-content", margin: "0 auto", zIndex: 100 }}
      >
        <GlassSurface
          width={320}
          height={56}
          borderRadius={16}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {["Work", "About", "Contact"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="cursor-target"
                style={{
                  color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "0.875rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "6.5rem", height: "56px",
                }}
              >
                {link}
              </a>
            ))}
          </div>
        </GlassSurface>
      </nav>
    </>
  );
}
