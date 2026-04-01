"use client";

import CardSwap, { Card } from "./CardSwap/CardSwap";
import TextType from "./TextType/TextType";

export function AboutMe() {
  return (
    <section style={{
      minHeight: "100vh",
      marginTop: "-15vh",
      background: "linear-gradient(to bottom, rgba(6,7,18,0) 0vh, rgba(6,7,18,0.01) 1.2vh, rgba(6,7,18,0.04) 2.3vh, rgba(6,7,18,0.09) 3.4vh, rgba(6,7,18,0.15) 4.3vh, rgba(6,7,18,0.24) 5.3vh, rgba(6,7,18,0.34) 6.2vh, rgba(6,7,18,0.45) 7.1vh, rgba(6,7,18,0.56) 7.9vh, rgba(6,7,18,0.68) 8.8vh, rgba(6,7,18,0.78) 9.7vh, rgba(6,7,18,0.87) 10.6vh, rgba(6,7,18,0.93) 11.6vh, rgba(6,7,18,0.97) 12.7vh, rgba(6,7,18,0.99) 13.8vh, #060712 15vh)",
      position: "relative",
      zIndex: 2,
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-start",
      paddingTop: "38vh",
    }}>
      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "white" }} />
      <div style={{ flex: "0 0 auto", marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start", paddingRight: 0, paddingLeft: 0, minWidth: "calc(28ch + 4vw)" }}>
        <h2 style={{ margin: 0, fontSize: "clamp(3rem, 4.5vw, 5.5rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
          <em style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400 }}>
            <TextType text={["about me", "sobre mi"]} as="span" typingSpeed={80} deletingSpeed={50} pauseDuration={2000} showCursor cursorCharacter="|" />
          </em>
        </h2>
        <p style={{ margin: "0.4rem 0 0", color: "#fff", fontSize: "0.875rem", lineHeight: 1.6, maxWidth: "calc(28ch + 4vw)", textAlign: "left" }}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
      </div>
      <div style={{ flex: "0 0 50%", paddingLeft: "5rem", position: "relative", zIndex: 3 }}>
        <CardSwap width={420} height={520} cardDistance={50} verticalDistance={30} pauseOnHover>
          <Card><div style={{ position: "absolute", inset: "0.75rem", border: "2px solid red", boxSizing: "border-box", pointerEvents: "none" }} /></Card>
          <Card><div style={{ position: "absolute", inset: "0.75rem", border: "2px solid red", boxSizing: "border-box", pointerEvents: "none" }} /></Card>
          <Card><div style={{ position: "absolute", inset: "0.75rem", border: "2px solid red", boxSizing: "border-box", pointerEvents: "none" }} /></Card>
        </CardSwap>
      </div>
    </section>
  );
}
