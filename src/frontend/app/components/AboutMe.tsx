"use client";

import CardSwap, { Card } from "./CardSwap/CardSwap";
import TextType from "./TextType/TextType";
import { Terminal, AnimatedSpan, TypingAnimation } from "./Terminal/terminal";
import BentoGlow from "./BentoGlow/BentoGlow";
import OrbitImages from "./OrbitImages/OrbitImages";

const GLOW_BASE = {
  glowColor: "255, 255, 255",
  backgroundColor: "#060712",
  spotlightRadius: 300,
}

const CARD_GLOW_PROPS = { ...GLOW_BASE, borderRadius: 0 }
const TERMINAL_GLOW_PROPS = { ...GLOW_BASE, borderRadius: 12 }

const orbitImages = [
  "/BadBunny/dtmf.png",
  "/BadBunny/eutdm.png",
  "/BadBunny/oasis.png",
  "/BadBunny/uvst.png",
  "/BadBunny/x100pre.png",
  "/BadBunny/yhlqmdlg.png",
];

export function AboutMe() {
  return (
    <section style={{
      minHeight: "100vh",
      marginTop: "-5vh",
      background: "#060712",
      position: "relative",
      zIndex: 10,
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-start",
      paddingTop: "28vh",
      paddingBottom: "20vh",
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
        <div style={{ marginTop: "1.5rem", filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.9)) drop-shadow(0 4px 12px rgba(0,0,0,0.7))", width: "calc(28ch + 4vw)", minHeight: "11rem" }}>
        <BentoGlow className="w-full max-w-lg" {...TERMINAL_GLOW_PROPS}>
        <Terminal className="border-0 bg-transparent w-full" loop loopDelay={1500}>
          <TypingAnimation>&gt; echo "Hi. I&apos;m Adam." &gt; greeting.txt</TypingAnimation>
          <AnimatedSpan className="text-blue-500">ℹ Updated 1 file: greeting.txt</AnimatedSpan>
          <TypingAnimation>&gt; cat greeting.txt</TypingAnimation>
          <AnimatedSpan className="text-muted-foreground">Hi. I&apos;m Adam.</AnimatedSpan>
        </Terminal>
        </BentoGlow>
        </div>
        <p style={{ margin: "1rem 0 0", color: "#fff", fontSize: "0.875rem", lineHeight: 1.6, maxWidth: "calc(28ch + 4vw)", textAlign: "left", position: "relative", zIndex: 1 }}>
          i&apos;m interested in <strong>software engineering, ai</strong>, and the intersection between the two. i also like to watch tv shows (shout out to aot & got), listen to music, and hang out with my friends (sometimes).
          <br /><br />
          in my time at penn state, i&apos;ve <strong>won 3 hackathons</strong>, building cool stuff beside some of the brightest people i know. i&apos;ve also held <strong>leadership positions</strong> at the biggest clubs on campus, including nittany ai, nittany data labs, and the newly founded claude builder club. these opportunities have sculpted me into the engineer i am today.
        </p>
        <img src="/ascii_cat.gif" alt="ascii cat" style={{ marginTop: "1rem", width: "100%", maxWidth: "calc(28ch + 4vw)", height: 85, objectFit: "cover", display: "block", border: "4px solid gray", boxSizing: "border-box" }} />
      </div>
      <div style={{ flex: "0 0 50%", paddingLeft: "30px", paddingTop: "14vh", position: "relative", zIndex: 9999 }}>
        <CardSwap width={420} height={650} cardDistance={50} verticalDistance={60} pauseOnHover>
          <Card><BentoGlow className="h-full w-full about-card-glow" {...CARD_GLOW_PROPS}><div style={{ position: "absolute", inset: "0.75rem", display: "flex", flexDirection: "column" }}><div style={{ border: "2px solid white", boxSizing: "border-box", overflow: "hidden" }}><img src="/selfie.webp" alt="Adam" style={{ width: "100%", height: "auto", display: "block" }} /></div><div style={{ border: "2px solid white", boxSizing: "border-box", overflow: "hidden", marginTop: "0.75rem" }}><img src="/win.png" alt="Win" style={{ width: "100%", height: "auto", display: "block" }} /></div><div style={{ flex: 1, padding: "0.75rem", color: "white", fontSize: "0.8rem", lineHeight: 1.6, overflow: "hidden" }}>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione sequi nesciunt.</div></div></BentoGlow></Card>
          <Card><BentoGlow className="h-full w-full about-card-glow" {...CARD_GLOW_PROPS}><div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: "20px" }}><OrbitImages images={orbitImages} shape="ellipse" baseWidth={600} radiusX={150} radiusY={250} rotation={-27} duration={30} itemSize={100} responsive={true} radius={160} direction="normal" fill showPath pathColor="rgba(255,255,255,0.4)" paused={false} /><div style={{ padding: "0 1.25rem 1rem", color: "white", fontSize: "0.8rem", lineHeight: 1.6, textAlign: "left" }}>i&apos;m a huge music nerd. my top spotify wrapped artist for 2023, 2024, and 2025 was bad bunny. other artists include billie eilish, drake, newjeans, radiohead, etc. so, yeah, my taste can be pretty diverse. i recently find myself listening to chill indie music. it&apos;s fun to listen to while walking alone, especially late at night or early in the morning when i should be asleep. if we ever meet, i&apos;d love to have a conversation about our tastes, i&apos;m sure we&apos;ll find someone we both like. :)</div></div></BentoGlow></Card>
          <Card><BentoGlow className="h-full w-full about-card-glow" {...CARD_GLOW_PROPS}><div style={{ position: "absolute", inset: "0.75rem", border: "2px solid white", boxSizing: "border-box", pointerEvents: "none" }} /></BentoGlow></Card>
        </CardSwap>
      </div>
    </section>
  );
}
