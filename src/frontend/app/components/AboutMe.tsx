"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, type ReactNode } from "react";
import CardSwap, { Card } from "./CardSwap/CardSwap";
import TextType from "./TextType/TextType";
import { Terminal, AnimatedSpan, TypingAnimation } from "./Terminal/terminal";
import BentoGlow from "./BentoGlow/BentoGlow";
import OrbitImages from "./OrbitImages/OrbitImages";
import { SectionFade } from "./SectionFade";
import { useInView } from "../hooks/useInView";

const Globe = dynamic(() => import("./Globe/Globe"), { ssr: false });

const GLOW_BASE = {
  glowColor: "255, 255, 255",
  backgroundColor: "#060712",
  spotlightRadius: 300,
}

const CARD_GLOW_PROPS = { ...GLOW_BASE, borderRadius: 0 }
const TERMINAL_GLOW_PROPS = { ...GLOW_BASE, borderRadius: 6 }

function PolaroidFrame({ children, caption }: { children: ReactNode; caption?: ReactNode }) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: "4.5%",
          left: "4.5%",
          right: "4.5%",
          bottom: "17%",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
      {caption !== undefined && (
        <div
          style={{
            position: "absolute",
            left: "4.5%",
            right: "4.5%",
            bottom: 0,
            height: "17%",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            padding: "10px 26px 0",
            fontFamily: "var(--font-sans)",
            fontWeight: 400,
            color: "#000000",
            fontSize: "0.78rem",
            lineHeight: 1.4,
            letterSpacing: "0.005em",
            textAlign: "left",
            pointerEvents: "none",
            boxSizing: "border-box",
          }}
        >
          {caption}
        </div>
      )}
    </>
  );
}

const orbitImages = [
  "/BadBunny/dtmf.webp",
  "/BadBunny/eutdm.webp",
  "/BadBunny/oasis.webp",
  "/BadBunny/uvst.webp",
  "/BadBunny/x100pre.webp",
  "/BadBunny/yhlqmdlg.webp",
];

function CardLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "14px" }}>
      <span
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: "1.15rem",
          letterSpacing: "-0.005em",
          lineHeight: 1,
          color: "#fff",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      <div
        style={{
          flex: 1,
          height: "1px",
          transform: "translateY(-3px)",
          background: "linear-gradient(to right, rgba(255,255,255,0.25), rgba(255,255,255,0))",
        }}
      />
    </div>
  );
}

const CARD_INNER_STYLE = {
  position: "absolute" as const,
  inset: 0,
  padding: "22px 26px 22px",
  display: "flex" as const,
  flexDirection: "column" as const,
  gap: "14px",
  boxSizing: "border-box" as const,
};


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
        className="relative z-[3] flex w-full flex-col items-start px-6 lg:ml-auto lg:w-auto lg:min-w-[calc(42ch+6vw)] lg:pl-0 lg:pr-[30px]"
        style={{ flex: "0 0 auto" }}
      >
        <h2 style={{ margin: 0, fontSize: "clamp(3.75rem, 5.625vw, 6.875rem)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
          <em style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400 }}>
            <TextType
              text={["about me", "sobre mi"]}
              as="span"
              typingSpeed={80}
              deletingSpeed={50}
              pauseDuration={2000}
              showCursor
              cursorCharacter="|"
              renderText={(displayed) => {
                const splitAt = displayed.startsWith("sobre ")
                  ? 6
                  : displayed.startsWith("about ")
                    ? 6
                    : -1;
                if (splitAt > 0 && displayed.length > splitAt) {
                  return (
                    <>
                      {displayed.slice(0, splitAt)}
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontStyle: "normal" }}>
                        {displayed.slice(splitAt)}
                      </span>
                    </>
                  );
                }
                return displayed;
              }}
            />
          </em>
        </h2>
        <p style={{ margin: "0.5rem 0 0", color: "#fff", fontSize: "1.09rem", lineHeight: 1.6, maxWidth: "calc(42ch + 6vw)", textAlign: "left" }}>
          hey, i&apos;m <strong>adam</strong>. puerto-rican born, dominican bred, and usa based. fun fact, i have an <strong>identical twin</strong>. we both live in pennsylvania.
        </p>
        <div style={{ marginTop: "1.875rem", filter: "drop-shadow(0 15px 50px rgba(0,0,0,0.9)) drop-shadow(0 5px 15px rgba(0,0,0,0.7))", width: "100%", maxWidth: "calc(42ch + 6vw)", minHeight: "13.75rem" }}>
        <BentoGlow className="w-full max-w-lg" {...TERMINAL_GLOW_PROPS}>
        <Terminal className="border-0 bg-transparent w-full" loop loopDelay={1500}>
          <TypingAnimation>&gt; echo &quot;Hi. I&apos;m Adam.&quot; &gt; greeting.txt</TypingAnimation>
          <AnimatedSpan className="text-blue-500">ℹ Updated 1 file: greeting.txt</AnimatedSpan>
          <TypingAnimation>&gt; cat greeting.txt</TypingAnimation>
          <AnimatedSpan className="text-muted-foreground">Hi. I&apos;m Adam.</AnimatedSpan>
        </Terminal>
        </BentoGlow>
        </div>
        <p style={{ margin: "1.25rem 0 0", color: "#fff", fontSize: "1.09rem", lineHeight: 1.6, maxWidth: "calc(42ch + 6vw)", textAlign: "left", position: "relative", zIndex: 1 }}>
          i&apos;m interested in <strong>software engineering, ai</strong>, and the intersection between the two. i also like to watch tv shows (shout out to aot & got), listen to music, and hang out with my friends (sometimes).
          <br /><br />
          i&apos;ve <strong>won 3 hackathons</strong>: first at yhacks (yale), first at hackprinceton, and second solo at nexhacks (bytedance). at penn state, i&apos;ve held <strong>leadership positions</strong> at nittany ai, nittany data labs, and the claude builder club.
        </p>
      </div>
      <div
        className="hidden lg:block"
        style={{ flex: "0 0 50%", paddingLeft: "30px", paddingTop: "14vh", position: "relative", zIndex: 50 }}
      >
        <CardSwap width={630} height={650} cardDistance={63} verticalDistance={75} pauseOnHover>
          <Card>
            <PolaroidFrame
              caption="speaking to ~200 students at nittany ai. surprisingly, public speaking can be kind of fun."
            >
              <BentoGlow className="h-full w-full about-card-glow" {...CARD_GLOW_PROPS}>
                <div style={CARD_INNER_STYLE}>
                  <CardLabel>penn state</CardLabel>
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ border: "1px solid rgba(255,255,255,0.65)", boxSizing: "border-box", overflow: "hidden", width: "100%" }}>
                      <Image src="/Photos/win.webp" alt="" aria-hidden width={495} height={278} loading="lazy" style={{ width: "100%", height: "auto", display: "block" }} />
                    </div>
                  </div>
                </div>
              </BentoGlow>
            </PolaroidFrame>
          </Card>
          <Card>
            <PolaroidFrame
              caption={
                <>
                  bad bunny has been my #1 artist on spotify wrapped for 3 years straight. but i also like billie eilish, drake, newjeans, and radiohead. let&apos;s make a spotify jam!
                </>
              }
            >
              <BentoGlow className="h-full w-full about-card-glow" {...CARD_GLOW_PROPS}>
                <div style={CARD_INNER_STYLE}>
                  <CardLabel>music</CardLabel>
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                    }}
                  >
                    <div style={{ width: "100%", maxWidth: 528 }}>
                      <OrbitImages
                        images={orbitImages}
                        shape="ellipse"
                        baseWidth={500}
                        radiusX={170}
                        radiusY={80}
                        rotation={-12}
                        duration={30}
                        itemSize={72}
                        responsive
                        height={312}
                        radius={120}
                        direction="normal"
                        fill
                        showPath
                        pathColor="rgba(255,255,255,0.32)"
                        paused={!isInView}
                      />
                    </div>
                  </div>
                </div>
              </BentoGlow>
            </PolaroidFrame>
          </Card>
          <Card>
            <PolaroidFrame
              caption={
                <>
                  up until i was seven years old, i lived in puerto rico. i&apos;ve been living in pennsylvania ever since.
                </>
              }
            >
              <BentoGlow className="h-full w-full about-card-glow" {...CARD_GLOW_PROPS}>
                <div style={CARD_INNER_STYLE}>
                  <CardLabel>where i&apos;ve lived</CardLabel>
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Globe size={460} />
                  </div>
                </div>
              </BentoGlow>
            </PolaroidFrame>
          </Card>
        </CardSwap>
      </div>
    </section>
  );
}
