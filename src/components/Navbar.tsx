import { Github, Linkedin, LucideProps } from "lucide-react";

const SOCIAL_LINKS = [
  {
    name: "GitHub",
    icon: Github,
    href: "https://github.com/adamtorres", // Placeholder
  },
  {
    name: "LinkedIn",
    icon: Linkedin,
    href: "https://linkedin.com/in/adamtorres", // Placeholder
  },
  {
    name: "X",
    icon: (props: LucideProps) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    href: "https://x.com/adamtorres", // Placeholder
  },
];

export default function Navbar() {
  return (
    <nav className="fixed top-12 left-16 z-50 flex items-center gap-1 liquid-glass rounded-lg px-2 py-1.5">
      {SOCIAL_LINKS.map((social) => (
        <a
          key={social.name}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-white/60 hover:text-white transition-colors duration-200"
          aria-label={social.name}
        >
          <social.icon className="w-4 h-4" />
        </a>
      ))}
    </nav>
  );
}
