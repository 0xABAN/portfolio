import type { Metadata, Viewport } from "next";
import "./globals.css";
import BlobCursor from "./components/BlobCursor/BlobCursor";
import { MotionProvider } from "./components/MotionProvider";
import { cn } from "@/lib/utils";
import { ACTIVE_COMBO, FONT_COMBOS, clashDisplay } from "./fonts";

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
  const combo = FONT_COMBOS[ACTIVE_COMBO];
  return (
    <html
      lang="en"
      className={cn(combo.sans.variable, combo.serif.variable, combo.inter.variable, clashDisplay.variable, "font-sans")}
      style={{ colorScheme: "dark" }}
    >
      <body>
        <MotionProvider>
          <BlobCursor blobType="circle" fillColor="#ffffff" />
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}
