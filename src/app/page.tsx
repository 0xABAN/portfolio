"use client";

import { AboutMe } from "./components/AboutMe";
import { AboutMeVideoLoop } from "./components/AboutMeVideoLoop";
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
      <AboutMeVideoLoop />
    </main>
  );
}
