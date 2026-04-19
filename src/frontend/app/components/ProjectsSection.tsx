"use client";

import type { ReactNode } from "react";
import { CardBody, CardContainer, CardItem } from "./ThreeDCard";
import { StickyScroll, type StickyScrollItem } from "./StickyScrollReveal";

type Project = {
  id: string;
  index: string;
  year: string;
  role: string;
  stack: string[];
  titleRoman: string;
  titleItalic: string;
  blurb: ReactNode;
  image: string;
  accent: string;
  href: string;
  award: string;
};

const projects: Project[] = [
  {
    id: "nexdraw",
    index: "Nº 01",
    year: "2026",
    role: "Solo build",
    stack: ["Next.js", "Gemini", "Supabase", "tldraw"],
    titleRoman: "",
    titleItalic: "nexdraw",
    blurb: (
      <>
        cursor but for artists, basically. you sketch, gemini reads the canvas, it
        edits back. i built it <strong>solo</strong>{" "}for nexhacks &rsquo;26 and
        somehow came out of 1500 entries with <strong>2nd place</strong>. tldraw
        handles the drawing, supabase handles the memory.
      </>
    ),
    image:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2560&auto=format&fit=crop",
    accent: "#d7b6ff",
    href: "https://github.com/AdamPSU/maestro",
    award: "NexHacks '26 · ByteDance 2nd place",
  },
  {
    id: "simulacra",
    index: "Nº 02",
    year: "2026",
    role: "Hackathon build",
    stack: ["LangGraph", "Phaser", "FastAPI", "Socket.IO"],
    titleRoman: "",
    titleItalic: "simulacra",
    blurb: (
      <>
        pixel-art policy sim where <strong>100 llm agents</strong>{" "}react to whatever
        rules you throw at them. each agent gets a 6-trait persona and one of 8 roles.
        langgraph fans them out in parallel over socket.io, so the round doesn&rsquo;t
        wait on a slow call. fifteen rounds per run. took the{" "}
        <strong>k2 think v2 track at yhack &rsquo;26</strong>.
      </>
    ),
    image:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2560&auto=format&fit=crop",
    accent: "#a4e0c2",
    href: "https://github.com/AdamPSU/simulacra",
    award: "YHack '26 · K2 Think V2 track winner",
  },
  {
    id: "terrar-ai",
    index: "Nº 03",
    year: "2025",
    role: "Team build",
    stack: ["C#", "tModLoader", "xAI"],
    titleRoman: "terrar",
    titleItalic: ".ai",
    blurb: (
      <>
        terraria mod that drops react agents into the game. grok-4-fast runs the loop
        with <strong>10+ tools</strong>{" "}wired in, and i got it to about 50 agents
        before the fps tanks. won{" "}
        <strong>1st at hackprinceton &rsquo;25 out of 600+ entries</strong>. c# on
        tmodloader.
      </>
    ),
    image:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop",
    accent: "#e8b67a",
    href: "https://github.com/SlothfulDreams/terrar.ai",
    award: "HackPrinceton '25 · xAI 1st place",
  },
  {
    id: "fit-check",
    index: "Nº 04",
    year: "2026",
    role: "Side project",
    stack: ["Next.js", "FastAPI", "TRIBEv2", "V-JEPA2"],
    titleRoman: "",
    titleItalic: "fit-check",
    blurb: (
      <>
        record a 360&deg; spin of your outfit in the browser. the backend runs it
        through <strong>TRIBEv2 video-only inference</strong>{" "}and returns an mp4 of
        your predicted <strong>brain activity</strong>{" "}rendered on a cortical surface.
        v-jepa2 does the encoding, so the first request takes about a minute. built it
        for a hackathon, didn&rsquo;t win. i just wanted to see what my brain does
        when it looks at clothes.
      </>
    ),
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2560&auto=format&fit=crop",
    accent: "#7cc9e8",
    href: "https://github.com/AdamPSU/fit-check",
    award: "Hackathon entry · April 2026",
  },
];

function ProjectCard({ project }: { project: Project }) {
  return (
    <CardContainer containerClassName="py-0">
      <CardBody className="group/card relative h-auto w-[28rem] rounded-2xl p-0">
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,22,34,0.9) 0%, rgba(10,12,22,0.96) 100%)",
            boxShadow:
              "0 40px 80px -30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <CardItem translateZ={80} className="relative block w-full">
            <div className="relative aspect-[4/5] w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.image}
                alt={project.titleItalic}
                className="h-full w-full scale-105 object-cover transition-transform duration-700 group-hover/card:scale-110"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(6,7,18,0) 40%, rgba(6,7,18,0.85) 90%, rgba(6,7,18,1) 100%)",
                }}
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-60 mix-blend-soft-light"
                style={{
                  background: `radial-gradient(120% 80% at 80% 0%, ${project.accent}55 0%, transparent 55%)`,
                }}
              />

              <CardItem
                translateZ={120}
                className="absolute left-5 top-5 flex items-center gap-3 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 backdrop-blur"
              >
                <span
                  className="block rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    background: project.accent,
                    boxShadow: `0 0 10px ${project.accent}`,
                  }}
                />
                <span
                  className="text-[10px] tracking-[0.28em] text-white/80"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {project.index} · {project.year}
                </span>
              </CardItem>

              <CardItem
                translateZ={140}
                className="absolute bottom-6 left-6 right-6"
              >
                <div
                  className="text-white"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "2rem",
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  <span>{project.titleRoman}</span>
                  <em style={{ fontStyle: "italic" }}>{project.titleItalic}</em>
                </div>
                <div
                  className="mt-2 text-[10px] tracking-[0.2em] text-white/60"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {project.award.toUpperCase()}
                </div>
              </CardItem>
            </div>
          </CardItem>

          <div className="relative flex items-center justify-between gap-4 border-t border-white/5 px-5 py-4">
            <CardItem
              translateZ={40}
              as="span"
              className="text-[10px] tracking-[0.28em] text-white/50"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {project.role.toUpperCase()}
            </CardItem>
            <CardItem
              translateZ={40}
              as="span"
              className="text-[10px] tracking-[0.28em] text-white/35"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {project.stack.join(" · ").toUpperCase()}
            </CardItem>
          </div>
        </div>
      </CardBody>
    </CardContainer>
  );
}

const scrollContent: StickyScrollItem[] = projects.map((project) => ({
  id: project.id,
  index: project.index,
  year: project.year,
  role: project.role,
  stack: project.stack,
  title: (
    <>
      {project.titleRoman}
      <em style={{ fontStyle: "italic" }}>{project.titleItalic}</em>
    </>
  ),
  description: project.blurb,
  content: <ProjectCard project={project} />,
  href: project.href,
  ctaLabel: "VIEW SOURCE",
}));

const NOISE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>`,
  );

export function ProjectsSection() {
  return (
    <section
      id="work"
      style={{
        position: "relative",
        zIndex: 5,
        background: "#060712",
        padding: "6rem 0 4rem",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `url("${NOISE}")`,
            backgroundSize: "180px 180px",
            opacity: 0.08,
            mixBlendMode: "overlay",
          }}
        />
      </div>
      <StickyScroll content={scrollContent} />
    </section>
  );
}
