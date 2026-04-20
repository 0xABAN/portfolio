"use client";

import dynamic from "next/dynamic";
import { BackgroundVideo } from "./components/BackgroundVideo";
import { HeroSection } from "./components/HeroSection";
import { Navbar } from "./components/Navbar";

const AboutMe = dynamic(() => import("./components/AboutMe").then(m => ({ default: m.AboutMe })));
const ExperienceSection = dynamic(() => import("./components/ExperienceSection").then(m => ({ default: m.ExperienceSection })));
const ProjectsSection = dynamic(() => import("./components/ProjectsSection").then(m => ({ default: m.ProjectsSection })));
const ContactSection = dynamic(() => import("./components/ContactSection").then(m => ({ default: m.ContactSection })));

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
