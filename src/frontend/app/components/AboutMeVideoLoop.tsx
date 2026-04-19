"use client";

const loopPages = [0, 1, 2];

export function AboutMeVideoLoop() {
  return (
    <>
      {loopPages.map((page) => (
        <section
          key={page}
          style={{
            minHeight: "100vh",
            background: "#060712",
            position: "relative",
            zIndex: 1,
            overflow: "visible",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-26vh",
              left: 0,
              right: 0,
              height: "26vh",
              zIndex: 6,
              pointerEvents: "none",
              background:
                "linear-gradient(to top, rgba(6,7,18,0.98) 0%, rgba(6,7,18,0.82) 35%, rgba(6,7,18,0.45) 68%, rgba(6,7,18,0) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "48vh",
              zIndex: 1,
              pointerEvents: "none",
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(6,7,18,0.88) 22%, rgba(6,7,18,0.68) 42%, rgba(6,7,18,0.35) 62%, rgba(6,7,18,0) 100%)",
            }}
          />
          <video
            src="/aboutme.mp4"
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 0,
              opacity: 0.4,
              transform: page % 2 === 0 ? "scaleX(-1)" : undefined,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              pointerEvents: "none",
              background: "radial-gradient(ellipse 60% 55% at center, transparent 0%, #060712cc 50%, #060712 90%)",
            }}
          />
        </section>
      ))}
    </>
  );
}
