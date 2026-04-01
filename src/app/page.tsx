"use client";

import { AboutMe } from "./components/AboutMe";
import { BackgroundVideo } from "./components/BackgroundVideo";
import { HeroSection } from "./components/HeroSection";
import { Navbar } from "./components/Navbar";

export default function Home() {
  return (
    <main style={{ position: "relative" }}>
      <BackgroundVideo />
      <Navbar />
      <HeroSection />
      <AboutMe />
      <div style={{ background: "#060712", position: "relative", zIndex: 1, minHeight: "100vh" }} />
    </main>
  );
}
