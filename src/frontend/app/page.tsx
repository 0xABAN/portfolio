"use client";

import { AboutMe } from "./components/AboutMe";
import { BackgroundVideo } from "./components/BackgroundVideo";
import { ContactSection } from "./components/ContactSection";
import { ExperienceSection } from "./components/ExperienceSection";
import { HeroSection } from "./components/HeroSection";
import { Navbar } from "./components/Navbar";
import { ProjectsSection } from "./components/ProjectsSection";

export default function Home() {
  return (
    <main style={{ position: "relative" }}>
      <BackgroundVideo />
      <Navbar />
      <HeroSection />
      <AboutMe />
      <ExperienceSection />
      <ProjectsSection />
      <ContactSection />
    </main>
  );
}
