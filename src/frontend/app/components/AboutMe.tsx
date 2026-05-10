"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import CardSwap, { Card } from "./CardSwap/CardSwap";
import TextType from "./TextType/TextType";
import { Terminal, AnimatedSpan, TypingAnimation } from "./Terminal/terminal";
import BentoGlow from "./BentoGlow/BentoGlow";
import OrbitImages from "./OrbitImages/OrbitImages";
import { SectionFade } from "./SectionFade";
import { useInView } from "../hooks/useInView";

const GLOW_BASE = {
  glowColor: "255, 255, 255",
  backgroundColor: "#060712",
  spotlightRadius: 300,
}

const CARD_GLOW_PROPS = { ...GLOW_BASE, borderRadius: 0 }
const TERMINAL_GLOW_PROPS = { ...GLOW_BASE, borderRadius: 12 }

const orbitImages = [
  "/BadBunny/dtmf.webp",
  "/BadBunny/eutdm.webp",
  "/BadBunny/oasis.webp",
  "/BadBunny/uvst.webp",
  "/BadBunny/x100pre.webp",
  "/BadBunny/yhlqmdlg.webp",
];

export function AboutMe() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(sectionRef);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isInView) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isInView]);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="flex flex-col items-stretch lg:flex-row lg:items-start"
      style={{
        minHeight: "100vh",
        marginTop: "-5vh",
        background: "#060712",
        position: "relative",
        zIndex: 10,
        paddingTop: "28vh",
        paddingBottom: "20vh",
        overflow: "visible",
      }}
    >
      <SectionFade edge="bottom" height="22vh" zIndex={11} />
      <div style={{
        position: "absolute",
        top: "-42vh",
        left: 0,
        right: 0,
        height: "42vh",
        zIndex: 6,
        pointerEvents: "none",
        background: "linear-gradient(to top, rgba(6,7,18,1) 0%, rgba(6,7,18,0.92) 22%, rgba(6,7,18,0.7) 45%, rgba(6,7,18,0.4) 68%, rgba(6,7,18,0.15) 85%, rgba(6,7,18,0) 100%)",
      }} />
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "48vh", zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(6,7,18,0.88) 22%, rgba(6,7,18,0.68) 42%, rgba(6,7,18,0.35) 62%, rgba(6,7,18,0) 100%)",
      }} />
      <video
        ref={videoRef}
        src="/Videos/aboutme.mp4"
        loop
        muted
        playsInline
        preload="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0, opacity: 0.4 }}
      />
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 55% at center, transparent 0%, #060712cc 50%, #060712 90%)",
      }} />
      <div
        className="relative z-[3] flex w-full flex-col items-start px-6 lg:ml-auto lg:w-auto lg:min-w-[calc(35ch+5vw)] lg:pl-0 lg:pr-[30px]"
        style={{ flex: "0 0 auto" }}
      >
        <h2 style={{ margin: 0, fontSize: "clamp(3.75rem, 5.625vw, 6.875rem)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
          <em style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400 }}>
            <TextType text={["about me", "sobre mi"]} as="span" typingSpeed={80} deletingSpeed={50} pauseDuration={2000} showCursor cursorCharacter="|" />
          </em>
        </h2>
        <p style={{ margin: "0.5rem 0 0", color: "#fff", fontSize: "1.09rem", lineHeight: 1.6, maxWidth: "calc(35ch + 5vw)", textAlign: "left" }}>
          hey, i&apos;m <strong>adam</strong>. puerto-rican born, dominican bred, and usa based. fun fact, i have an <strong>identical twin</strong>. we both live in pennsylvania.
        </p>
        <div style={{ marginTop: "1.875rem", filter: "drop-shadow(0 15px 50px rgba(0,0,0,0.9)) drop-shadow(0 5px 15px rgba(0,0,0,0.7))", width: "100%", maxWidth: "calc(35ch + 5vw)", minHeight: "13.75rem" }}>
        <BentoGlow className="w-full max-w-lg" {...TERMINAL_GLOW_PROPS}>
        <Terminal className="border-0 bg-transparent w-full" loop loopDelay={1500}>
          <TypingAnimation>&gt; echo &quot;Hi. I&apos;m Adam.&quot; &gt; greeting.txt</TypingAnimation>
          <AnimatedSpan className="text-blue-500">ℹ Updated 1 file: greeting.txt</AnimatedSpan>
          <TypingAnimation>&gt; cat greeting.txt</TypingAnimation>
          <AnimatedSpan className="text-muted-foreground">Hi. I&apos;m Adam.</AnimatedSpan>
        </Terminal>
        </BentoGlow>
        </div>
        <p style={{ margin: "1.25rem 0 0", color: "#fff", fontSize: "1.09rem", lineHeight: 1.6, maxWidth: "calc(35ch + 5vw)", textAlign: "left", position: "relative", zIndex: 1 }}>
          i&apos;m interested in <strong>software engineering, ai</strong>, and the intersection between the two. i also like to watch tv shows (shout out to aot & got), listen to music, and hang out with my friends (sometimes).
          <br /><br />
          in my time at penn state, i&apos;ve <strong>won 3 hackathons</strong>, building cool stuff beside some of the brightest people i know. i&apos;ve also held <strong>leadership positions</strong> at the biggest clubs on campus, including nittany ai, nittany data labs, and the newly founded claude builder club. these opportunities have sculpted me into the engineer i am today.
        </p>
        <video src="/Videos/ascii_cat.webm" aria-hidden autoPlay loop muted playsInline style={{ marginTop: "1.25rem", width: "100%", maxWidth: "calc(35ch + 5vw)", height: 106, objectFit: "cover", display: "block", border: "5px solid gray", boxSizing: "border-box" }} />
      </div>
      <div
        className="hidden lg:block"
        style={{ flex: "0 0 50%", paddingLeft: "30px", paddingTop: "14vh", position: "relative", zIndex: 50 }}
      >
        <CardSwap width={525} height={813} cardDistance={63} verticalDistance={75} pauseOnHover>
          <Card><BentoGlow className="h-full w-full about-card-glow" {...CARD_GLOW_PROPS}><div style={{ position: "absolute", inset: "0.94rem", display: "flex", flexDirection: "column" }}><div style={{ border: "3px solid white", boxSizing: "border-box", overflow: "hidden" }}><Image src="/Photos/selfie.webp" alt="Adam" width={495} height={330} loading="lazy" style={{ width: "100%", height: "auto", display: "block" }} /></div><div style={{ border: "3px solid white", boxSizing: "border-box", overflow: "hidden", marginTop: "0.94rem" }}><Image src="/Photos/win.webp" alt="" aria-hidden width={495} height={278} loading="lazy" style={{ width: "100%", height: "auto", display: "block" }} /></div><div style={{ flex: 1, padding: "0.94rem", color: "white", fontSize: "1rem", lineHeight: 1.6, overflow: "hidden" }}>this is me at nittany ai, presenting to ~200 students. i think i was teaching CNNs? not sure. depending on the topic, public speaking can actually be pretty fun!</div></div></BentoGlow></Card>
          <Card><BentoGlow className="h-full w-full about-card-glow" {...CARD_GLOW_PROPS}><div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: "25px" }}><OrbitImages images={orbitImages} shape="ellipse" baseWidth={750} radiusX={188} radiusY={313} rotation={-27} duration={30} itemSize={125} responsive={true} radius={200} direction="normal" fill showPath pathColor="rgba(255,255,255,0.4)" paused={!isInView} /><div style={{ padding: "0 1.5625rem 1.25rem", color: "white", fontSize: "1rem", lineHeight: 1.6, textAlign: "left" }}>i&apos;m a huge music nerd. my top spotify wrapped artist for 2023, 2024, and 2025 was bad bunny. other artists include billie eilish, drake, newjeans, radiohead, etc. so, yeah, my taste can be pretty diverse. i recently find myself listening to chill indie music. it&apos;s fun to listen to while walking alone, especially late at night or early in the morning when i should be asleep. if we ever meet, i&apos;d love to have a conversation about our tastes, i&apos;m sure we&apos;ll find someone we both like. :)</div></div></BentoGlow></Card>
          <Card><BentoGlow className="h-full w-full about-card-glow" {...CARD_GLOW_PROPS}><div style={{ position: "absolute", inset: "0.94rem", border: "3px solid white", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", color: "white", fontSize: "1rem", lineHeight: 1.6, textAlign: "center" }}>lmk what to put here i actually don&apos;t know</div></BentoGlow></Card>
        </CardSwap>
      </div>
    </section>
  );
}
