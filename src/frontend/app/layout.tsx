import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, Geist } from "next/font/google";
import "./globals.css";
import BlobCursor from "./components/BlobCursor/BlobCursor";
import { MotionProvider } from "./components/MotionProvider";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Portfolio",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#060712",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(inter.variable, serif.variable, "font-sans", geist.variable)} style={{ colorScheme: "dark" }}>
      <body>
        <MotionProvider>
          <BlobCursor blobType="circle" fillColor="#ffffff" />
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}
