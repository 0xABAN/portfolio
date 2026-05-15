import {
  Inter,
  Instrument_Serif,
  Geist,
  Geist_Mono,
  Space_Grotesk,
  DM_Sans,
  JetBrains_Mono,
  Mona_Sans,
  Manrope,
  Bricolage_Grotesque,
  Plus_Jakarta_Sans,
  Outfit,
  IBM_Plex_Mono,
  Fraunces,
  Work_Sans,
  DM_Serif_Display,
  Syne,
  Cormorant_Garamond,
  Cormorant,
  Nunito,
} from "next/font/google";
import localFont from "next/font/local";

// ───────── Heading fonts (mapped to --font-serif, used as italic display) ─────────
const geist = Geist({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const monaSans = Mona_Sans({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const switzer = localFont({
  src: [
    { path: "../public/fonts/switzer/Switzer-Variable.woff2", style: "normal" },
    { path: "../public/fonts/switzer/Switzer-VariableItalic.woff2", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
});
const cabinetGrotesk = localFont({
  src: "../public/fonts/cabinet-grotesk/CabinetGrotesk-Variable.woff2",
  variable: "--font-serif",
  display: "swap",
});
const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const syne = Syne({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: "300",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const cormorant = Cormorant({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const melodrama = localFont({
  src: [
    { path: "../public/fonts/melodrama/Melodrama-Variable.woff2", style: "normal", weight: "300 700" },
  ],
  variable: "--font-serif",
  display: "swap",
});
export const clashDisplay = localFont({
  src: [
    { path: "../public/fonts/clash-display/ClashDisplay-Variable.woff2", style: "normal", weight: "200 700" },
  ],
  variable: "--font-display",
  display: "swap",
});

// ───────── Body fonts (mapped to --font-sans) ─────────
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const generalSans = localFont({
  src: [
    { path: "../public/fonts/general-sans/GeneralSans-Variable.woff2", style: "normal" },
    { path: "../public/fonts/general-sans/GeneralSans-VariableItalic.woff2", style: "italic" },
  ],
  variable: "--font-sans",
  display: "swap",
});
const satoshi = localFont({
  src: [
    { path: "../public/fonts/satoshi/Satoshi-Variable.woff2", style: "normal" },
    { path: "../public/fonts/satoshi/Satoshi-VariableItalic.woff2", style: "italic" },
  ],
  variable: "--font-sans",
  display: "swap",
});
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});
const switzerSans = localFont({
  src: [
    { path: "../public/fonts/switzer/Switzer-Variable.woff2", style: "normal" },
    { path: "../public/fonts/switzer/Switzer-VariableItalic.woff2", style: "italic" },
  ],
  variable: "--font-sans",
  display: "swap",
});

// ───────── Mono fonts (mapped to --font-inter, used for tabular nums + mono feel) ─────────
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const commitMono = localFont({
  src: "../public/fonts/commit-mono/CommitMono-VF.woff2",
  variable: "--font-inter",
  display: "swap",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});
const departureMono = localFont({
  src: "../public/fonts/departure-mono/DepartureMono-Regular.woff2",
  variable: "--font-inter",
  display: "swap",
});

type LoadedFont = { variable: string; className: string };

export type FontCombo = {
  label: string;
  serif: LoadedFont;
  sans: LoadedFont;
  inter: LoadedFont;
};

export const FONT_COMBOS = {
  "geist-inter-geist-mono": {
    label: "Geist × Inter × Geist Mono",
    serif: geist,
    sans: inter,
    inter: geistMono,
  },
  "space-grotesk-dm-sans-jetbrains-mono": {
    label: "Space Grotesk × DM Sans × JetBrains Mono",
    serif: spaceGrotesk,
    sans: dmSans,
    inter: jetbrainsMono,
  },
  "mona-sans-manrope-commit-mono": {
    label: "Mona Sans × Manrope × Commit Mono",
    serif: monaSans,
    sans: manrope,
    inter: commitMono,
  },
  "bricolage-grotesque-plus-jakarta-jetbrains-mono": {
    label: "Bricolage Grotesque × Plus Jakarta Sans × JetBrains Mono",
    serif: bricolage,
    sans: plusJakarta,
    inter: jetbrainsMono,
  },
  "instrument-serif-outfit-ibm-plex-mono": {
    label: "Instrument Serif × Outfit × IBM Plex Mono",
    serif: instrumentSerif,
    sans: outfit,
    inter: ibmPlexMono,
  },
  "switzer-general-sans-jetbrains-mono": {
    label: "Switzer × General Sans × JetBrains Mono",
    serif: switzer,
    sans: generalSans,
    inter: jetbrainsMono,
  },
  "cabinet-grotesk-satoshi-jetbrains-mono": {
    label: "Cabinet Grotesk × Satoshi × JetBrains Mono",
    serif: cabinetGrotesk,
    sans: satoshi,
    inter: jetbrainsMono,
  },
  "fraunces-work-sans-ibm-plex-mono": {
    label: "Fraunces × Work Sans × IBM Plex Mono",
    serif: fraunces,
    sans: workSans,
    inter: ibmPlexMono,
  },
  "dm-serif-display-inter-departure-mono": {
    label: "DM Serif Display × Inter × Departure Mono",
    serif: dmSerifDisplay,
    sans: inter,
    inter: departureMono,
  },
  "syne-outfit-geist-mono": {
    label: "Syne × Outfit × Geist Mono",
    serif: syne,
    sans: outfit,
    inter: geistMono,
  },
  "ampcode-style": {
    label: "ampcode.com look-alike — Cormorant Garamond × Switzer × JetBrains Mono",
    serif: cormorantGaramond,
    sans: switzerSans,
    inter: jetbrainsMono,
  },
  "ampcode-free": {
    label: "ampcode.com free alternative — Cormorant × Inter × JetBrains Mono",
    serif: cormorant,
    sans: inter,
    inter: jetbrainsMono,
  },
  "melodrama-nunito": {
    label: "Melodrama Medium × Nunito Regular × JetBrains Mono",
    serif: melodrama,
    sans: nunito,
    inter: jetbrainsMono,
  },
} satisfies Record<string, FontCombo>;

export type FontComboId = keyof typeof FONT_COMBOS;

// ── Edit this single line to switch the active combo. ──
export const ACTIVE_COMBO: FontComboId = "melodrama-nunito";
