"use client";

import { useEffect, useRef, useState } from "react";
import { SectionFade } from "./SectionFade";
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
      url: "/Work/zon.jpg",
      text: "amazon",
      pos: "50% 50%",
      by: "AWS Infrastructure · Cupertino, CA",
    },
  },
  {
    common: "IBM",
    binomial: "AI Engineering Intern · May 2025 — Present",
    photo: {
      url: "/Work/ibm.png",
      text: "ibm",
      pos: "50% 50%",
      by: "LLM Microservices · Remote",
    },
  },
  {
    common: "LOCKHEED MARTIN",
    binomial: "Machine Learning Intern · Spring 2025",
    photo: {
      url: "/Work/lockheed.jpg",
      text: "lockheed martin",
      pos: "50% 50%",
      by: "Virus Forecasting Research · University Park, PA",
    },
  },
  {
    common: "CLAUDE BUILDER CLUB",
    binomial: "Founder · Aug 2025 — Jan 2026",
    photo: {
      url: "/Work/anthropic.webp",
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
      className="relative w-full h-[220vh] md:h-[260vh] lg:h-[300vh]"
      style={{ background: "#060712" }}
    >
      <SectionFade edge="top" height="18vh" />

      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute left-0 right-0 top-20 z-20 mx-auto flex max-w-[1440px] items-end justify-between border-b border-white/10 px-4 pb-4 sm:top-24 sm:px-8 sm:pb-6">
          <div>
            <span
              className="block text-[11px] tracking-[0.28em] text-white/40"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              EXPERIENCE — 2025 / 2026
            </span>
            <h2
              className="mt-2 text-white/90"
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "clamp(2.25rem, 4vw, 3.5rem)",
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
              }}
            >
              where i&rsquo;ve been
            </h2>
          </div>
          <div
            className="hidden shrink-0 items-baseline gap-2 text-white/60 sm:flex"
            style={{
              fontFamily: "var(--font-sans)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span className="text-[11px] tracking-[0.28em]">ROLES</span>
            <span className="text-sm text-white/80">
              {String(experiences.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2 text-center">
          <span
            className="block text-[10px] tracking-[0.32em] text-white/40"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            SCROLL TO ROTATE
          </span>
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

      <SectionFade edge="bottom" height="18vh" />
    </section>
  );
}
