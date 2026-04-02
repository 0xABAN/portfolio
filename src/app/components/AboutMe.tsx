"use client";

import CardSwap, { Card } from "./CardSwap/CardSwap";
import TextType from "./TextType/TextType";
import { Terminal, AnimatedSpan, TypingAnimation } from "@/registry/magicui/terminal";
import BorderGlow from "./BorderGlow/BorderGlow";

export function AboutMe() {
  return (
    <section style={{
      minHeight: "100vh",
      marginTop: "-5vh",
      background: "#060712",
      position: "relative",
      zIndex: 4,
      isolation: "isolate",
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-start",
      paddingTop: "28vh",
      overflow: "visible",
    }}>
      <div style={{
        position: "absolute",
        top: "-26vh",
        left: 0,
        right: 0,
        height: "26vh",
        zIndex: 6,
        pointerEvents: "none",
        background: "linear-gradient(to top, rgba(6,7,18,0.98) 0%, rgba(6,7,18,0.82) 35%, rgba(6,7,18,0.45) 68%, rgba(6,7,18,0) 100%)",
      }} />
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "48vh", zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(6,7,18,0.88) 22%, rgba(6,7,18,0.68) 42%, rgba(6,7,18,0.35) 62%, rgba(6,7,18,0) 100%)",
      }} />
      <video
        src="/aboutme.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0, opacity: 0.4 }}
      />
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 55% at center, transparent 0%, #060712cc 50%, #060712 90%)",
      }} />
      <div style={{ flex: "0 0 auto", marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start", paddingRight: 30, paddingLeft: 0, minWidth: "calc(28ch + 4vw)", position: "relative", zIndex: 3 }}>
        <h2 style={{ margin: 0, fontSize: "clamp(3rem, 4.5vw, 5.5rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
          <em style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400 }}>
            <TextType text={["about me", "sobre mi"]} as="span" typingSpeed={80} deletingSpeed={50} pauseDuration={2000} showCursor cursorCharacter="|" />
          </em>
        </h2>
        <p style={{ margin: "0.4rem 0 0", color: "#fff", fontSize: "0.875rem", lineHeight: 1.6, maxWidth: "calc(28ch + 4vw)", textAlign: "left" }}>
          hey, i&apos;m <strong>adam</strong>. puerto-rican born, dominican bred, and usa based. fun fact, i have an <strong>identical twin</strong>. we both live in pennsylvania.
        </p>
        <div style={{ marginTop: "1.5rem", filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.9)) drop-shadow(0 4px 12px rgba(0,0,0,0.7))" }}>
        <BorderGlow className="w-full max-w-lg" glowColor="0 0 88" backgroundColor="#060712" colors={["rgba(255,255,255,0.2)", "rgba(220,220,220,0.12)", "rgba(200,200,200,0.08)"]} borderRadius={12} fillOpacity={0.2} glowIntensity={2.5} glowRadius={60}>
        <Terminal className="border-0 bg-transparent w-full" loop loopDelay={1500}>
          <TypingAnimation>&gt; echo "Hi. I&apos;m Adam." &gt; greeting.txt</TypingAnimation>
          <AnimatedSpan className="text-blue-500">ℹ Updated 1 file: greeting.txt</AnimatedSpan>
          <TypingAnimation>&gt; cat greeting.txt</TypingAnimation>
          <AnimatedSpan className="text-muted-foreground">Hi. I&apos;m Adam.</AnimatedSpan>
        </Terminal>
        </BorderGlow>
        </div>
        <p style={{ margin: "1rem 0 0", color: "#fff", fontSize: "0.875rem", lineHeight: 1.6, maxWidth: "calc(28ch + 4vw)", textAlign: "left" }}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        </p>
        <div style={{ marginTop: "1rem", width: "100%", maxWidth: "calc(28ch + 4vw)", height: 85, border: "2px solid red", boxSizing: "border-box" }} />
      </div>
      <div style={{ flex: "0 0 50%", paddingLeft: "30px", paddingTop: "14vh", position: "relative", zIndex: 7 }}>
        <CardSwap width={420} height={520} cardDistance={50} verticalDistance={60} pauseOnHover>
          <Card><BorderGlow className="h-full w-full about-card-glow" glowColor="0 0 88" backgroundColor="#060712" colors={["rgba(255,255,255,0.2)", "rgba(220,220,220,0.12)", "rgba(200,200,200,0.08)"]} borderRadius={0} fillOpacity={0.2} glowIntensity={2.5} glowRadius={60}><div style={{ position: "absolute", inset: "0.75rem", border: "2px solid white", boxSizing: "border-box", pointerEvents: "none" }} /></BorderGlow></Card>
          <Card><BorderGlow className="h-full w-full about-card-glow" glowColor="0 0 88" backgroundColor="#060712" colors={["rgba(255,255,255,0.2)", "rgba(220,220,220,0.12)", "rgba(200,200,200,0.08)"]} borderRadius={0} fillOpacity={0.2} glowIntensity={2.5} glowRadius={60}><div style={{ position: "absolute", inset: "0.75rem", border: "2px solid white", boxSizing: "border-box", pointerEvents: "none" }} /></BorderGlow></Card>
          <Card><BorderGlow className="h-full w-full about-card-glow" glowColor="0 0 88" backgroundColor="#060712" colors={["rgba(255,255,255,0.2)", "rgba(220,220,220,0.12)", "rgba(200,200,200,0.08)"]} borderRadius={0} fillOpacity={0.2} glowIntensity={2.5} glowRadius={60}><div style={{ position: "absolute", inset: "0.75rem", border: "2px solid white", boxSizing: "border-box", pointerEvents: "none" }} /></BorderGlow></Card>
        </CardSwap>
      </div>
    </section>
  );
}
