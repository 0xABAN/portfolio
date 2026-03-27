import { ArrowUpRight } from "lucide-react";

const NAV_LINKS = ["About", "Works", "Services", "Testimonial"] as const;

export default function Navbar() {
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between bg-white rounded-[16px] px-5 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.10)] w-[min(900px,calc(100vw-48px))]">
      {/* Logo */}
      <span className="font-sans font-bold text-dark text-[15px] tracking-tight select-none">
        AT Studio
      </span>

      {/* Nav links */}
      <ul className="hidden md:flex items-center gap-7 list-none m-0 p-0">
        {NAV_LINKS.map((link) => (
          <li key={link}>
            <a
              href={`#${link.toLowerCase()}`}
              className="font-sans font-medium text-[14px] text-dark/70 hover:text-dark transition-colors duration-200 no-underline"
            >
              {link}
            </a>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a
        href="#contact"
        className="flex items-center gap-2 bg-dark text-white font-sans font-medium text-[14px] px-4 py-2 rounded-full hover:bg-dark/85 transition-colors duration-200 no-underline whitespace-nowrap"
      >
        Book A Free Meeting
        <span className="flex items-center justify-center w-[22px] h-[22px] rounded-full bg-white/15 flex-shrink-0">
          <ArrowUpRight className="w-[12px] h-[12px]" strokeWidth={2.5} />
        </span>
      </a>
    </nav>
  );
}
