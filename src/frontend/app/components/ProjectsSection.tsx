"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import { CardBody, CardContainer, CardItem } from "./ThreeDCard";
import ScrollVelocity from "./ScrollVelocity/ScrollVelocity";
import { SectionFade } from "./SectionFade";
import { StickyScroll, type StickyScrollItem } from "./StickyScrollReveal";
import { useInView } from "../hooks/useInView";

function ProjectVideo({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(videoRef);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isInView) v.play().catch(() => {});
    else v.pause();
  }, [isInView]);

  return (
    <video
      ref={videoRef}
      src={src}
      loop
      muted
      playsInline
      preload="metadata"
      className={className}
    />
  );
}

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

type BadgeSpec = { label: string; color: string; logo?: string; logoColor?: string };

const BADGES: Record<string, BadgeSpec> = {
  "Next.js":    { label: "Next.js",    color: "000000", logo: "nextdotjs",    logoColor: "white" },
  "Gemini":     { label: "Gemini",     color: "8E75B2", logo: "googlegemini", logoColor: "white" },
  "Supabase":   { label: "Supabase",   color: "3ECF8E", logo: "supabase",     logoColor: "white" },
  "tldraw":     { label: "tldraw",     color: "1E1E1E" },
  "LangGraph":  { label: "LangGraph",  color: "1C3C3C", logo: "langgraph",    logoColor: "white" },
  "Phaser":     { label: "Phaser",     color: "8B5CF6", logo: "phaser",       logoColor: "white" },
  "FastAPI":    { label: "FastAPI",    color: "009688", logo: "fastapi",      logoColor: "white" },
  "Socket.IO":  { label: "Socket.IO",  color: "010101", logo: "socketdotio",  logoColor: "white" },
  "C#":         { label: "C#",         color: "239120", logo: "csharp",       logoColor: "white" },
  "tModLoader": { label: "tModLoader", color: "2F4F4F" },
  "xAI":        { label: "xAI",        color: "000000", logo: "x",            logoColor: "white" },
  "TRIBEv2":    { label: "TRIBEv2",    color: "4B6CB7" },
  "V-JEPA2":    { label: "V-JEPA2",    color: "0866FF", logo: "meta",         logoColor: "white" },
};

const shieldsEscape = (s: string) =>
  s.replace(/-/g, "--").replace(/_/g, "__").replace(/ /g, "_").replace(/#/g, "%23");

function badgeUrl(tech: string, style: "for-the-badge" | "flat-square" = "for-the-badge") {
  const spec = BADGES[tech] ?? { label: tech, color: "333333" };
  const params = new URLSearchParams({ style });
  if (spec.logo) params.set("logo", spec.logo);
  if (spec.logoColor) params.set("logoColor", spec.logoColor);
  return `https://img.shields.io/badge/${shieldsEscape(spec.label)}-${spec.color}?${params.toString()}`;
}

function StackBadges({
  items,
  style = "for-the-badge",
  height = 24,
  className,
}: {
  items: string[];
  style?: "for-the-badge" | "flat-square";
  height?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      {items.map((tech) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={tech} src={badgeUrl(tech, style)} alt={tech} style={{ height }} />
      ))}
    </div>
  );
}

const projects: Project[] = [
  {
    id: "terrar-ai",
    index: "#1",
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
    image: "/Projects/chop_wood.webm",
    accent: "#e8b67a",
    href: "https://github.com/SlothfulDreams/terrar.ai",
    award: "HackPrinceton '25 · xAI 1st place",
  },
  {
    id: "nexdraw",
    index: "#2",
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
    image: "/Projects/nexdraw.webm",
    accent: "#d7b6ff",
    href: "https://github.com/AdamPSU/maestro",
    award: "NexHacks '26 · ByteDance 2nd place",
  },
  {
    id: "simulacra",
    index: "#3",
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
    image: "/Projects/simulacra.png",
    accent: "#a4e0c2",
    href: "https://github.com/AdamPSU/simulacra",
    award: "YHack '26 · K2 Think V2 track winner",
  },
  {
    id: "fit-check",
    index: "#4",
    year: "2026",
    role: "Solo build",
    stack: ["Next.js", "FastAPI", "TRIBEv2", "V-JEPA2"],
    titleRoman: "",
    titleItalic: "fit-check",
    blurb: (
      <>
        record a 360&deg; spin of your outfit in the browser. the backend runs it
        through <strong>TRIBEv2 video-only inference</strong>{" "}and returns an mp4 of
        your predicted <strong>brain activity</strong>{" "}rendered on a cortical surface.
        v-jepa2 does the encoding, so the first request takes about a minute. built it{" "}
        <strong>solo</strong>{" "}for a hackathon, didn&rsquo;t win. i just wanted to see
        what my brain does when it looks at clothes.
      </>
    ),
    image: "/Projects/fit-check.webm",
    accent: "#7cc9e8",
    href: "https://github.com/AdamPSU/fit-check",
    award: "BitCamp '26",
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
              {/\.(webm|mp4)$/i.test(project.image) ? (
                <ProjectVideo
                  src={project.image}
                  className="absolute inset-0 h-full w-full scale-105 object-cover transition-transform duration-700 group-hover/card:scale-110"
                />
              ) : (
                <Image
                  src={project.image}
                  alt={project.titleItalic}
                  fill
                  loading="lazy"
                  unoptimized
                  sizes="(min-width: 1024px) 448px, 60vw"
                  className="scale-105 object-cover transition-transform duration-700 group-hover/card:scale-110"
                />
              )}
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
  stack: <StackBadges items={project.stack} height={28} />,
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
        padding: "8rem 0 4rem",
        overflow: "visible",
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
      <div
        className="relative mx-auto w-full max-w-[1440px] border-b border-white/10 pb-6"
        style={{ padding: "2rem 0 1.5rem" }}
      >
        <ScrollVelocity
          texts={[
            <>selected <em>work</em></>,
            <><em>proyectos</em> recent builds</>,
          ]}
          velocity={80}
          damping={45}
          stiffness={350}
          scrollerClassName="scroller projects-marquee"
        />
      </div>
      <StickyScroll content={scrollContent} />
      <SectionFade edge="bottom" height="24vh" />
    </section>
  );
}
