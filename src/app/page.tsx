"use client";

import { BackgroundVideo } from "./components/BackgroundVideo";
import { HeroSection } from "./components/HeroSection";
import { Navbar } from "./components/Navbar";

export default function Home() {
  return (
    <main style={{ position: "relative" }}>
      <BackgroundVideo />
      <Navbar />
      <HeroSection />
      <section style={{
        minHeight: "100vh", background: "#060712",
        position: "relative", zIndex: 2,
      }} />
    </main>
  );
}
