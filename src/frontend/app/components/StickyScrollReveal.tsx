"use client";
import React, { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { cn } from "@/lib/utils";

export type StickyScrollItem = {
  id: string;
  index: string;
  year: string;
  role: string;
  stack: string[];
  title: ReactNode;
  description: ReactNode;
  content: ReactNode;
  href?: string;
  ctaLabel?: string;
};

export const StickyScroll = ({
  content,
  contentClassName,
}: {
  content: StickyScrollItem[];
  contentClassName?: string;
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState(0);
  const cardLength = content.length;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const clamped = Math.min(Math.max(latest, 0), 0.9999);
    const idx = Math.min(cardLength - 1, Math.floor(clamped * cardLength));
    setActiveCard((prev) => (prev === idx ? prev : idx));
  });

  const active = content[activeCard];
  const total = String(cardLength).padStart(2, "0");

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ minHeight: `${(cardLength + 1) * 100}vh` }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute"
            style={{
              top: "-20%",
              right: "-15%",
              width: "60%",
              height: "80%",
              background:
                "radial-gradient(closest-side, rgba(215,199,163,0.12), transparent 70%)",
              filter: "blur(60px)",
            }}
          />
        </div>
        <div className="relative mx-auto flex h-full w-full max-w-[1440px] flex-col px-4 py-8 sm:px-8 sm:py-10">
          <header className="relative flex items-end justify-between border-b border-white/10 pb-6">
            <div>
              <span
                className="block text-[11px] tracking-[0.28em] text-white/40"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                SELECTED WORK — 2021 / 2026
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
                a dossier of recent work
              </h2>
            </div>
            <div
              className="hidden shrink-0 items-baseline gap-2 text-white/60 sm:flex"
              style={{ fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}
            >
              <span className="text-[11px] tracking-[0.28em]">INDEX</span>
              <motion.span
                key={activeCard}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-white/80"
              >
                {String(activeCard + 1).padStart(2, "0")}
              </motion.span>
              <span className="text-white/25">/</span>
              <span className="text-sm text-white/40">{total}</span>
            </div>
          </header>

          <div className="relative flex flex-1 items-center gap-8 lg:gap-14">
            <aside
              aria-hidden
              className="relative hidden h-[clamp(16rem,36vh,26rem)] w-10 shrink-0 lg:block"
            >
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10" />
              {content.map((item, i) => {
                const pct = (i / Math.max(cardLength - 1, 1)) * 100;
                const isActive = i === activeCard;
                return (
                  <motion.div
                    key={item.id}
                    className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3"
                    style={{ top: `${pct}%` }}
                    animate={{ opacity: isActive ? 1 : 0.35 }}
                    transition={{ duration: 0.35 }}
                  >
                    <motion.span
                      className="block rounded-full bg-white"
                      animate={{
                        width: isActive ? 10 : 5,
                        height: isActive ? 10 : 5,
                        boxShadow: isActive
                          ? "0 0 18px rgba(255,255,255,0.6)"
                          : "0 0 0 rgba(255,255,255,0)",
                      }}
                      transition={{ duration: 0.3 }}
                    />
                    <span
                      className="whitespace-nowrap text-[10px] tracking-[0.28em] text-white/70"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {item.index}
                    </span>
                  </motion.div>
                );
              })}
            </aside>

            <div className="relative flex flex-1 items-center">
              <AnimatePresence mode="wait">
                <motion.article
                  key={active.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="max-w-xl"
                >
                  <div
                    className="flex items-baseline gap-3 text-[11px] tracking-[0.28em] text-white/40"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <span>{active.index}</span>
                    <span className="h-px w-8 bg-white/20" />
                    <span>{active.year}</span>
                  </div>
                  <h3
                    className="mt-3 text-white"
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: "clamp(2.5rem, 5.5vw, 4.5rem)",
                      lineHeight: 0.95,
                      letterSpacing: "-0.025em",
                    }}
                  >
                    {active.title}
                  </h3>
                  <div
                    className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] tracking-[0.22em] text-white/50"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <span>
                      ROLE · <span className="text-white/75">{active.role.toUpperCase()}</span>
                    </span>
                    <span className="hidden h-px w-6 bg-white/15 sm:block" />
                    <span>
                      STACK ·{" "}
                      <span className="text-white/75">
                        {active.stack.join(" / ").toUpperCase()}
                      </span>
                    </span>
                  </div>
                  <p
                    className="mt-6 max-w-lg text-[1.05rem] leading-relaxed text-white/65 [&_strong]:font-medium [&_strong]:text-white"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {active.description}
                  </p>
                  {active.href ? (
                    <a
                      href={active.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group mt-8 inline-flex items-center gap-3 text-[11px] tracking-[0.28em] text-white/80"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      <span className="relative">
                        {active.ctaLabel ?? "VIEW SOURCE"}
                        <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-100 bg-white/60 transition-transform duration-500 group-hover:scale-x-0" />
                      </span>
                      <span
                        aria-hidden
                        className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </a>
                  ) : null}
                </motion.article>
              </AnimatePresence>
            </div>

            <div className={cn("relative hidden shrink-0 lg:block", contentClassName)}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  {active.content}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div
            className="relative mt-6 h-[2px] w-full overflow-hidden rounded-full bg-white/10"
            aria-hidden
          >
            <motion.div
              className="absolute left-0 top-0 h-full bg-white/70"
              style={{ width: `${((activeCard + 1) / cardLength) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
