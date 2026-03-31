"use client";

import { BackgroundVideo } from "./components/BackgroundVideo";
import { HeroSection } from "./components/HeroSection";
import { Navbar } from "./components/Navbar";

export default function Home() {
  return (
    <main style={{ position: "relative", minHeight: "100vh" }}>
      <BackgroundVideo />
      <Navbar />
      <HeroSection />
    </main>
  );
}
