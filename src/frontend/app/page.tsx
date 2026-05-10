import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { BackgroundVideo } from "./components/BackgroundVideo";
import { HeroSection } from "./components/HeroSection";
import { Navbar } from "./components/Navbar";
import { ViewCounter } from "./components/ViewCounter";

const AboutMe = dynamic(() => import("./components/AboutMe").then(m => ({ default: m.AboutMe })));
const ExperienceSection = dynamic(() => import("./components/ExperienceSection").then(m => ({ default: m.ExperienceSection })));
const ProjectsSection = dynamic(() => import("./components/ProjectsSection").then(m => ({ default: m.ProjectsSection })));
const ContactSection = dynamic(() => import("./components/ContactSection").then(m => ({ default: m.ContactSection })));

export const metadata: Metadata = {
  title: "Adam Torres Encarnacion — Portfolio",
  description:
    "Adam Torres Encarnacion. Penn State student building software at the intersection of engineering and AI. Selected work, experience, and contact.",
  openGraph: {
    title: "Adam Torres Encarnacion — Portfolio",
    description:
      "Penn State student building software at the intersection of engineering and AI.",
    type: "website",
  },
};

export default function Home() {
  return (
    <main style={{ position: "relative" }}>
      <BackgroundVideo />
      <Navbar />
      <HeroSection viewCounter={<ViewCounter />} />
      <AboutMe />
      <ExperienceSection />
      <ProjectsSection />
      <ContactSection />
    </main>
  );
}
