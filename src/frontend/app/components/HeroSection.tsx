"use client";

import { motion, type Variants } from "motion/react";
import { useEffect, useRef } from "react";
import { BioSection } from "./BioSection";
import { ViewCounter } from "./ViewCounter";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay },
  }),
};

export function HeroSection() {
  const ageRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const birthdate = new Date(2005, 7, 30);
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    const tick = () => {
      if (ageRef.current) {
        ageRef.current.textContent = ((Date.now() - birthdate.getTime()) / msPerYear).toFixed(8);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      id="home"
      aria-label="Hero"
      className="min-h-screen p-6 pt-24 lg:h-screen lg:min-h-0 lg:p-16 lg:pt-32 box-border flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-[2]"
    >
      <BioSection />

      <div className="flex flex-col justify-start">
        <motion.h1
          variants={fadeUp} initial="hidden" animate="visible" custom={0.15}
          className="m-0 font-bold text-balance"
          style={{ fontSize: "clamp(2.5rem, 8vw, 5.5rem)", letterSpacing: "-0.03em", lineHeight: 1.05 }}
        >
          Adam<br />
          <em className="font-normal italic" style={{ fontFamily: "var(--font-serif)" }}>
            Torres Encarnacion
          </em>
        </motion.h1>
        <motion.p
          variants={fadeUp} initial="hidden" animate="visible" custom={0.3}
          className="mt-[0.4rem] text-white text-sm tabular-nums"
        >
          approx. <span ref={ageRef} /> years old
        </motion.p>
        <motion.p
          variants={fadeUp} initial="hidden" animate="visible" custom={0.45}
          className="mt-[0.2rem] text-white text-sm tabular-nums"
        >
          <ViewCounter />
        </motion.p>
      </div>
    </section>
  );
}
