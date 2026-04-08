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
    <section style={{
      height: "100vh", padding: "4rem", paddingTop: "8rem",
      boxSizing: "border-box", display: "flex", flexDirection: "row",
      gap: "3rem", position: "relative", zIndex: 2,
    }}>
      <BioSection />

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
        <motion.h1
          variants={fadeUp} initial="hidden" animate="visible" custom={0.15}
          style={{ margin: 0, fontSize: "clamp(3rem, 4.5vw, 5.5rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05 }}
        >
          Adam<br />
          <em style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400 }}>
            Torres Encarnacion
          </em>
        </motion.h1>
        <motion.p
          variants={fadeUp} initial="hidden" animate="visible" custom={0.3}
          style={{ margin: "0.4rem 0 0", color: "#fff", fontSize: "0.875rem", fontVariantNumeric: "tabular-nums" }}
        >
          approx. <span ref={ageRef} /> years old
        </motion.p>
      </div>
    </section>
  );
}
