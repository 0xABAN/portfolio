"use client";

import { AboutMe } from "./components/AboutMe";
import { AboutMeVideoLoop } from "./components/AboutMeVideoLoop";
import { BackgroundVideo } from "./components/BackgroundVideo";
import { HeroSection } from "./components/HeroSection";
import { Navbar } from "./components/Navbar";
import { ProjectsSection } from "./components/ProjectsSection";
import ScrollVelocity from "./components/ScrollVelocity/ScrollVelocity";

export default function Home() {
  return (
    <main style={{ position: "relative" }}>
      <BackgroundVideo />
      <Navbar />
      <HeroSection />
      <AboutMe />
      <section
        style={{
          position: "relative",
          zIndex: 20,
          background: "#060712",
          padding: "6rem 0",
        }}
      >
        <ScrollVelocity
          texts={[
            <>selected <em>work</em></>,
            <><em>proyectos</em> recent builds</>,
          ]}
          velocity={80}
          damping={45}
          stiffness={350}
        />
      </section>
      <ProjectsSection />
      <AboutMeVideoLoop />
    </main>
  );
}
