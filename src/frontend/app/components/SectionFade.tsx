import type { CSSProperties } from "react";

type Props = {
  edge: "top" | "bottom";
  height?: string;
  color?: string;
  zIndex?: number;
  style?: CSSProperties;
};

export function SectionFade({
  edge,
  height = "26vh",
  color = "#060712",
  zIndex = 6,
  style,
}: Props) {
  const direction = edge === "top" ? "to top" : "to bottom";
  const position: CSSProperties =
    edge === "top"
      ? { top: `calc(${height} * -1)` }
      : { bottom: `calc(${height} * -1)` };

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        height,
        zIndex,
        pointerEvents: "none",
        background: `linear-gradient(${direction}, ${color} 0%, ${color}d1 35%, ${color}73 68%, ${color}00 100%)`,
        ...position,
        ...style,
      }}
    />
  );
}
