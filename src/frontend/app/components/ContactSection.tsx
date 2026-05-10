"use client";

import { m as motion, type Variants } from "motion/react";
import { useState, type CSSProperties, type ReactNode } from "react";
import BentoGlow from "./BentoGlow/BentoGlow";
import { SectionFade } from "./SectionFade";
import SpotlightCard from "./SpotlightCard/SpotlightCard";

const ACCENT = "#6B6EBF";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay },
  }),
};

const cornerStyles: Record<string, CSSProperties> = {
  tl: { top: -10, left: -10, borderTop: "2px solid rgba(255,255,255,0.85)", borderLeft: "2px solid rgba(255,255,255,0.85)" },
  tr: { top: -10, right: -10, borderTop: "2px solid rgba(255,255,255,0.85)", borderRight: "2px solid rgba(255,255,255,0.85)" },
  bl: { bottom: -10, left: -10, borderBottom: "2px solid rgba(255,255,255,0.85)", borderLeft: "2px solid rgba(255,255,255,0.85)" },
  br: { bottom: -10, right: -10, borderBottom: "2px solid rgba(255,255,255,0.85)", borderRight: "2px solid rgba(255,255,255,0.85)" },
};

function Corners() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }} aria-hidden>
      {Object.entries(cornerStyles).map(([corner, style]) => (
        <div key={corner} style={{ position: "absolute", width: 18, height: 18, ...style }} />
      ))}
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 7 9-7" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.1c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.27-5.24-5.68 0-1.25.45-2.28 1.2-3.08-.12-.3-.52-1.48.12-3.08 0 0 .97-.31 3.18 1.18a11.06 11.06 0 015.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.6.24 2.78.12 3.08.75.8 1.2 1.83 1.2 3.08 0 4.42-2.69 5.39-5.25 5.67.41.36.77 1.05.77 2.12v3.14c0 .3.2.66.79.55A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.56c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.65H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.07 2.07 0 110-4.13 2.07 2.07 0 010 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2H21.5l-7.4 8.46L23 22h-6.93l-5.43-7.1L4.35 22H1.08l7.92-9.05L1 2h7.1l4.91 6.5L18.24 2zm-2.43 18h1.92L7.27 4H5.22l10.6 16z" />
    </svg>
  );
}

type Channel = {
  label: string;
  handle: string;
  href: string;
  icon: ReactNode;
  external: boolean;
};

const CHANNELS: Channel[] = [
  { label: "EMAIL", handle: "art5809@psu.edu", href: "mailto:art5809@psu.edu", icon: <MailIcon />, external: false },
  { label: "GITHUB", handle: "AdamPSU", href: "https://github.com/AdamPSU", icon: <GitHubIcon />, external: true },
  { label: "LINKEDIN", handle: "/in/adam-torres-encarnacion", href: "https://www.linkedin.com/in/adam-torres-encarnacion/", icon: <LinkedInIcon />, external: true },
  { label: "X", handle: "@art5809", href: "https://x.com/art5809", icon: <XIcon />, external: true },
];

function ChannelRow({ channel, delay }: { channel: Channel; delay: number }) {
  return (
    <motion.a
      variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} custom={delay}
      href={channel.href}
      {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="contact-row group relative grid items-center border-b border-white/5 px-4 py-4 gap-x-3 gap-y-1.5 sm:px-5 sm:gap-x-4"
      style={{ textDecoration: "none", gridTemplateColumns: "20px 1fr auto", gridTemplateAreas: '"icon label arrow" "icon handle arrow"' }}
    >
      <span className="contact-row-bar" aria-hidden />
      <span
        className="text-white/55 transition-colors duration-300 group-hover:text-white"
        style={{ gridArea: "icon", display: "inline-flex", justifyContent: "center" }}
      >
        {channel.icon}
      </span>
      <span
        className="text-[10px] tracking-[0.28em] text-white/50 transition-colors duration-300 group-hover:text-white/85"
        style={{ gridArea: "label", fontFamily: "var(--font-sans)" }}
      >
        {channel.label}
      </span>
      <span
        className="min-w-0 truncate text-white/85 transition-colors duration-300"
        style={{ gridArea: "handle", fontFamily: "var(--font-inter)", fontSize: "0.95rem", fontVariantNumeric: "tabular-nums" }}
      >
        {channel.handle}
      </span>
      <span
        aria-hidden
        className="inline-block shrink-0 text-white/40 transition-all duration-300 group-hover:translate-x-1"
        style={{ gridArea: "arrow", fontFamily: "var(--font-sans)" }}
      >
        →
      </span>
    </motion.a>
  );
}

function formatToday(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function ContactSection() {
  const [today] = useState(formatToday);

  return (
    <section
      id="contact"
      style={{
        position: "relative",
        zIndex: 5,
        background: "#060712",
        padding: "10rem 1.5rem 8rem",
        overflow: "visible",
      }}
    >
      <style>{`
        @keyframes contact-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.85); }
        }
        .contact-status-dot {
          animation: contact-pulse 2s ease-in-out infinite;
        }
        .contact-row-bar {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 2px;
          background: ${ACCENT};
          transform: scaleY(0);
          transform-origin: center;
          transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .contact-row:hover {
          background: rgba(107, 110, 191, 0.05);
        }
        .contact-row:hover .contact-row-bar {
          transform: scaleY(1);
        }
      `}</style>

      <SectionFade edge="top" height="24vh" />

      <div className="relative mx-auto w-full max-w-[820px]">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-120px" }} custom={0}
          className="mb-10 flex items-center justify-center gap-4"
        >
          <span className="h-px w-10 bg-white/20" aria-hidden />
          <span
            className="text-[11px] tracking-[0.32em] text-white/45"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Nº 04 / CORRESPONDENCE
          </span>
          <span className="h-px w-10 bg-white/20" aria-hidden />
        </motion.div>

        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-120px" }} custom={0.08}
          className="relative mx-auto max-w-[780px]"
          style={{
            borderRadius: 3,
            boxShadow: "0 40px 80px -30px rgba(0,0,0,0.8)",
          }}
        >
          <BentoGlow
            className="contact-envelope-glow"
            glowColor="107, 110, 191"
            backgroundColor="transparent"
            borderRadius={3}
            spotlightRadius={340}
            enableTilt
          >
            <Corners />

            <div
              aria-hidden
              style={{
                position: "absolute",
                top: "1.4rem",
                right: "1.4rem",
                padding: "0.35rem 0.6rem",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 2,
                fontFamily: "var(--font-sans)",
                fontSize: "0.55rem",
                letterSpacing: "0.28em",
                color: "rgba(255,255,255,0.55)",
                transform: "rotate(4deg)",
                zIndex: 3,
              }}
            >
              ART · PA · 2026
            </div>

            <SpotlightCard
              className="contact-envelope-spotlight"
              spotlightColor="rgba(107, 110, 191, 0.18)"
              style={{
                position: "relative",
                padding: "2.25rem 2rem 2rem",
                border: "none",
                borderRadius: 3,
                background: "linear-gradient(180deg, rgba(20,22,34,0.55) 0%, rgba(10,12,22,0.88) 100%)",
                overflow: "visible",
              }}
            >
          <div className="border-b border-white/10 pb-5">
            {[
              { label: "FROM", value: "the visitor" },
              { label: "TO", value: "adam torres encarnacion" },
              { label: "DATE", value: today },
            ].map((row) => (
              <div key={row.label} className="flex items-baseline gap-4 py-1">
                <span
                  className="w-14 shrink-0 text-[10px] tracking-[0.32em] text-white/40"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {row.label}
                </span>
                <span
                  className="text-white/80"
                  style={{ fontFamily: "var(--font-inter)", fontSize: "0.9rem", fontVariantNumeric: "tabular-nums" }}
                  suppressHydrationWarning={row.label === "DATE"}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <motion.h2
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-120px" }} custom={0.16}
            className="mt-8 text-white"
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "clamp(2.75rem, 5.5vw, 4.5rem)",
              lineHeight: 0.95,
              letterSpacing: "-0.025em",
            }}
          >
            let&rsquo;s correspond<span style={{ color: ACCENT }}>.</span>
          </motion.h2>

          <motion.p
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-120px" }} custom={0.22}
            className="mt-6 max-w-[54ch] text-white/65"
            style={{ fontFamily: "var(--font-inter)", fontSize: "1.05rem", lineHeight: 1.7 }}
          >
            send a note if you&rsquo;re building something interesting, hiring for
            summer, or want to argue about a paper. i reply within a day.
          </motion.p>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-120px" }} custom={0.28}
            className="mt-7 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2"
          >
            <span
              className="contact-status-dot block rounded-full"
              style={{ width: 7, height: 7, background: "#ef4444", boxShadow: "0 0 10px rgba(239,68,68,0.8)" }}
              aria-hidden
            />
            <span
              className="text-[10px] tracking-[0.28em] text-white/70"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              CLOSED FOR SUMMER 2026 OPPORTUNITIES
            </span>
          </motion.div>

          <div className="mt-10 border-t border-white/10">
            {CHANNELS.map((c, i) => (
              <ChannelRow key={c.label} channel={c} delay={0.34 + i * 0.06} />
            ))}
          </div>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} custom={0.62}
            className="mt-8 text-right"
          >
            <span
              className="text-white/45"
              style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "0.95rem" }}
            >
              adam, from his desk at penn state
            </span>
          </motion.div>
            </SpotlightCard>
          </BentoGlow>
        </motion.div>
      </div>

    </section>
  );
}
