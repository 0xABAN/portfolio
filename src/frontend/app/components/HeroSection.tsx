"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { BioSection } from "./BioSection";

const fadeUp = {
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
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      aria-label="Hero"
      className="h-screen p-6 pt-20 md:p-16 md:pt-32 box-border flex flex-col md:flex-row gap-8 md:gap-12 relative z-[2]"
    >
      <BioSection />

      <div className="flex flex-col justify-start">
        <motion.h1
          variants={fadeUp} initial="hidden" animate="visible" custom={0.15}
          className="m-0 font-bold"
          style={{ fontSize: "clamp(3rem, 4.5vw, 5.5rem)", letterSpacing: "-0.03em", lineHeight: 1.05 }}
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
      </div>
    </section>
  );
}
