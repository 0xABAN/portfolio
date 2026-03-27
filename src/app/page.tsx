import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <section id="works" className="min-h-screen px-16 py-24 -mt-px" style={{ backgroundColor: '#040200' }}>
        {/* next section */}
      </section>
    </main>
  );
}
