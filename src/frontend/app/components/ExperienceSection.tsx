"use client";

import { useEffect, useRef, useState } from "react";
import { CircularGallery, type GalleryItem } from "./ui/circular-gallery";

function computeGallerySize(vw: number) {
  const w = Math.min(vw, 1440);
  const cardWidth = Math.round(Math.max(140, w * 0.19));
  const cardHeight = Math.round(cardWidth * 1.33);
  const radius = Math.round(Math.max(260, w * 0.36));
  return { radius, cardWidth, cardHeight };
}

function useGallerySize() {
  const [size, setSize] = useState(() => computeGallerySize(1440));

  useEffect(() => {
    const compute = () => setSize(computeGallerySize(document.documentElement.clientWidth));
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  return size;
}

const experiences: GalleryItem[] = [
  {
    common: "AMAZON",
    binomial: "Software Engineering Intern · Summer 2026",
    photo: {
      url: "/Work/amazon.jpg",
      text: "amazon",
      pos: "50% 50%",
      by: "AWS Infrastructure · Cupertino, CA",
    },
  },
  {
    common: "IBM",
    binomial: "AI Engineering Intern · May 2025 — Present",
    photo: {
      url: "/Work/ibm.jpg",
      text: "ibm",
      pos: "50% 50%",
      by: "LLM Microservices · Remote",
    },
  },
  {
    common: "LOCKHEED MARTIN",
    binomial: "Machine Learning Intern · Spring 2025",
    photo: {
      url: "/Work/lockheed_martin.jpg",
      text: "lockheed martin",
      pos: "50% 50%",
      by: "Virus Forecasting Research · University Park, PA",
    },
  },
  {
    common: "CLAUDE BUILDER CLUB",
    binomial: "Founder · Aug 2025 — Jan 2026",
    photo: {
      url: "/Work/anthropic.jpg",
      text: "claude builder club",
      pos: "50% 50%",
      by: "260+ Members · University Park, PA",
    },
  },
  {
    common: "EPOCH AI",
    binomial: "Director · Jan 2025 — Jan 2026",
    photo: {
      url: "/Work/epoch.jpg",
      text: "epoch ai",
      pos: "50% 50%",
      by: "AI Research Reading Group · University Park, PA",
    },
  },
];

export function ExperienceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { radius, cardWidth, cardHeight } = useGallerySize();

  return (
    <section
      ref={sectionRef}
      id="experience"
      className="relative z-10 w-full h-[220vh] md:h-[260vh] lg:h-[300vh]"
      style={{ background: "#FFFDF6" }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          zIndex: 7,
          pointerEvents: "none",
          background:
            "linear-gradient(to right, transparent 0%, rgba(25,21,18,0.10) 20%, rgba(25,21,18,0.10) 80%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          mixBlendMode: "multiply",
          opacity: 0.07,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "220px 220px",
        }}
      />
      <svg
        aria-hidden
        viewBox="0 0 1000 200"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "14vh",
          zIndex: 4,
          pointerEvents: "none",
          display: "block",
        }}
      >
        <path
          d="M0,0 L1000,0 L1000,160 C800,160 600,40 0,40 Z"
          fill="#060712"
        />
      </svg>

      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute left-0 right-0 top-[105px] z-20 mx-auto flex max-w-[1440px] items-end justify-between px-4 sm:top-[121px] sm:px-8">
          <div className="border-b border-[#191512]/10 pb-4 sm:pb-6">
            <h2
              className="text-[#191512]"
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "clamp(2.25rem, 4vw, 3.5rem)",
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
              }}
            >
              where{" "}
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontStyle: "normal",
                }}
              >
                i&rsquo;ve
              </span>{" "}
              been
            </h2>
          </div>
        </div>

        <CircularGallery
          items={experiences}
          radius={radius}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          autoRotateSpeed={0.03}
          scrollTarget={sectionRef}
          className="pt-28 sm:pt-40"
        />
      </div>

      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "1px",
          zIndex: 7,
          pointerEvents: "none",
          background:
            "linear-gradient(to right, transparent 0%, rgba(25,21,18,0.10) 20%, rgba(25,21,18,0.10) 80%, transparent 100%)",
        }}
      />
    </section>
  );
}
