"use client";

import Image from 'next/image';
import React, { useState, useEffect, useRef, HTMLAttributes, type RefObject } from 'react';
import { useInView } from '../../hooks/useInView';

const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
}

function CardPattern({ variant }: { variant: number }) {
  const v = ((variant % 5) + 5) % 5;
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  };

  if (v === 0) {
    // Horizontal topographic contours — refined, layered
    return (
      <svg viewBox="0 0 280 380" preserveAspectRatio="none" aria-hidden style={{ ...baseStyle, opacity: 0.2 }}>
        <g fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.4">
          <path d="M-10 22 C 60 6, 130 36, 200 18 C 250 6, 300 28, 320 18" />
          <path d="M-10 48 C 70 30, 140 60, 210 42 C 260 28, 300 50, 320 42" />
          <path d="M-10 76 C 60 56, 130 90, 200 70 C 250 58, 300 78, 320 70" />
          <path d="M-10 108 C 80 88, 160 120, 230 100 C 270 90, 300 108, 320 100" />
          <path d="M-10 144 C 60 124, 130 156, 200 136 C 250 126, 290 146, 320 136" />
          <path d="M-10 182 C 80 162, 160 192, 230 172 C 270 162, 300 182, 320 172" />
          <path d="M-10 220 C 70 200, 140 230, 220 210 C 270 200, 300 220, 320 210" />
          <path d="M-10 258 C 80 238, 160 268, 230 250 C 275 240, 300 256, 320 250" />
          <path d="M-10 296 C 60 276, 130 308, 200 288 C 250 278, 290 298, 320 288" />
          <path d="M-10 332 C 80 312, 160 342, 230 326 C 275 316, 300 332, 320 326" />
          <path d="M-10 362 C 60 348, 130 372, 200 358 C 250 350, 290 365, 320 358" />
        </g>
      </svg>
    );
  }

  if (v === 1) {
    // Concentric organic blob — nested irregular shapes
    return (
      <svg viewBox="0 0 280 380" preserveAspectRatio="none" aria-hidden style={{ ...baseStyle, opacity: 0.22 }}>
        <g fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.45">
          <path d="M 140 30 C 220 42, 252 130, 234 220 C 218 308, 158 358, 88 338 C 28 318, -2 220, 24 130 C 48 60, 108 24, 140 30 Z" />
          <path d="M 140 55 C 210 66, 236 142, 218 215 C 202 292, 152 336, 98 320 C 52 304, 28 215, 50 148 C 70 84, 116 50, 140 55 Z" />
          <path d="M 140 82 C 200 92, 220 152, 206 215 C 192 280, 148 318, 110 304 C 74 290, 54 215, 70 156 C 86 102, 120 78, 140 82 Z" />
          <path d="M 140 108 C 190 118, 206 168, 194 215 C 184 264, 148 294, 118 284 C 88 274, 76 220, 88 178 C 100 132, 122 104, 140 108 Z" />
          <path d="M 140 134 C 180 144, 192 180, 184 215 C 175 244, 146 268, 126 264 C 106 258, 96 222, 106 192 C 116 162, 128 132, 140 134 Z" />
          <path d="M 140 160 C 170 168, 180 196, 172 215 C 166 234, 146 250, 132 246 C 118 242, 113 222, 122 204 C 130 184, 130 158, 140 160 Z" />
          <path d="M 140 186 C 158 190, 165 204, 162 216 C 158 228, 146 236, 138 234 C 130 232, 128 222, 132 212 C 137 200, 132 184, 140 186 Z" />
        </g>
      </svg>
    );
  }

  if (v === 2) {
    // Vertical streams — drifting lines like radar/sky
    return (
      <svg viewBox="0 0 280 380" preserveAspectRatio="none" aria-hidden style={{ ...baseStyle, opacity: 0.18 }}>
        <g fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.45">
          <path d="M 18 -10 C 44 60, 6 140, 28 215 C 46 280, 18 340, 34 390" />
          <path d="M 50 -10 C 76 70, 38 150, 60 220 C 78 288, 50 350, 66 390" />
          <path d="M 82 -10 C 108 60, 70 150, 94 230 C 112 296, 84 348, 100 390" />
          <path d="M 116 -10 C 144 70, 106 150, 132 220 C 150 290, 124 350, 140 390" />
          <path d="M 148 -10 C 176 60, 138 145, 164 215 C 184 286, 156 346, 172 390" />
          <path d="M 182 -10 C 210 70, 172 150, 198 220 C 218 290, 192 352, 208 390" />
          <path d="M 214 -10 C 244 60, 206 142, 232 215 C 252 286, 224 346, 240 390" />
          <path d="M 248 -10 C 276 70, 236 150, 262 220 C 282 290, 254 352, 270 390" />
        </g>
      </svg>
    );
  }

  if (v === 3) {
    // Diagonal topography — tilted contour rhythm
    return (
      <svg viewBox="0 0 280 380" preserveAspectRatio="none" aria-hidden style={{ ...baseStyle, opacity: 0.2 }}>
        <g fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.4" transform="rotate(-14 140 190)">
          <path d="M-100 -20 C -20 -36, 70 -8, 160 -28 C 230 -42, 320 -22, 400 -36" />
          <path d="M-100 16 C -20 0, 70 30, 160 12 C 230 0, 320 18, 400 6" />
          <path d="M-100 52 C -20 36, 70 64, 160 46 C 230 34, 320 54, 400 42" />
          <path d="M-100 90 C -20 74, 70 102, 160 84 C 230 74, 320 92, 400 80" />
          <path d="M-100 128 C -20 112, 70 138, 160 120 C 230 108, 320 128, 400 114" />
          <path d="M-100 168 C -20 152, 70 178, 160 160 C 230 148, 320 168, 400 154" />
          <path d="M-100 208 C -20 192, 70 218, 160 200 C 230 188, 320 208, 400 194" />
          <path d="M-100 248 C -20 232, 70 258, 160 240 C 230 228, 320 248, 400 234" />
          <path d="M-100 290 C -20 274, 70 300, 160 282 C 230 270, 320 290, 400 274" />
          <path d="M-100 332 C -20 316, 70 342, 160 324 C 230 312, 320 332, 400 318" />
          <path d="M-100 372 C -20 358, 70 384, 160 366 C 230 354, 320 374, 400 360" />
          <path d="M-100 410 C -20 396, 70 422, 160 404 C 230 392, 320 412, 400 398" />
        </g>
      </svg>
    );
  }

  // v === 4 — Constellation: dot field with connecting lines
  return (
    <svg viewBox="0 0 280 380" preserveAspectRatio="none" aria-hidden style={{ ...baseStyle, opacity: 0.55 }}>
      <g fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4">
        <line x1="35" y1="50" x2="85" y2="35" />
        <line x1="85" y1="35" x2="130" y2="65" />
        <line x1="130" y1="65" x2="190" y2="45" />
        <line x1="190" y1="45" x2="240" y2="60" />
        <line x1="55" y1="95" x2="110" y2="120" />
        <line x1="110" y1="120" x2="170" y2="100" />
        <line x1="170" y1="100" x2="225" y2="115" />
        <line x1="30" y1="155" x2="80" y2="175" />
        <line x1="80" y1="175" x2="145" y2="160" />
        <line x1="145" y1="160" x2="205" y2="175" />
        <line x1="205" y1="175" x2="255" y2="155" />
        <line x1="40" y1="215" x2="100" y2="230" />
        <line x1="100" y1="230" x2="160" y2="215" />
        <line x1="160" y1="215" x2="220" y2="235" />
        <line x1="60" y1="275" x2="120" y2="290" />
        <line x1="120" y1="290" x2="180" y2="275" />
        <line x1="180" y1="275" x2="240" y2="295" />
        <line x1="35" y1="330" x2="100" y2="345" />
        <line x1="100" y1="345" x2="165" y2="330" />
        <line x1="165" y1="330" x2="225" y2="350" />
        <line x1="130" y1="65" x2="110" y2="120" />
        <line x1="190" y1="45" x2="170" y2="100" />
        <line x1="80" y1="175" x2="100" y2="230" />
        <line x1="145" y1="160" x2="160" y2="215" />
        <line x1="220" y1="235" x2="240" y2="295" />
        <line x1="100" y1="230" x2="120" y2="290" />
      </g>
      <g fill="rgba(255,255,255,0.7)" stroke="none">
        <circle cx="35" cy="50" r="1.1" />
        <circle cx="85" cy="35" r="1.1" />
        <circle cx="130" cy="65" r="1.1" />
        <circle cx="190" cy="45" r="1.1" />
        <circle cx="240" cy="60" r="1.1" />
        <circle cx="55" cy="95" r="1.1" />
        <circle cx="110" cy="120" r="1.1" />
        <circle cx="170" cy="100" r="1.1" />
        <circle cx="225" cy="115" r="1.1" />
        <circle cx="30" cy="155" r="1.1" />
        <circle cx="80" cy="175" r="1.1" />
        <circle cx="145" cy="160" r="1.1" />
        <circle cx="205" cy="175" r="1.1" />
        <circle cx="255" cy="155" r="1.1" />
        <circle cx="40" cy="215" r="1.1" />
        <circle cx="100" cy="230" r="1.1" />
        <circle cx="160" cy="215" r="1.1" />
        <circle cx="220" cy="235" r="1.1" />
        <circle cx="60" cy="275" r="1.1" />
        <circle cx="120" cy="290" r="1.1" />
        <circle cx="180" cy="275" r="1.1" />
        <circle cx="240" cy="295" r="1.1" />
        <circle cx="35" cy="330" r="1.1" />
        <circle cx="100" cy="345" r="1.1" />
        <circle cx="165" cy="330" r="1.1" />
        <circle cx="225" cy="350" r="1.1" />
      </g>
    </svg>
  );
}

export interface GalleryItem {
  common: string;
  binomial: string;
  icon?: string;
  photo: {
    url: string;
    text: string;
    pos?: string;
    by: string;
  };
}

interface CircularGalleryProps extends HTMLAttributes<HTMLDivElement> {
  items: GalleryItem[];
  radius?: number;
  autoRotateSpeed?: number;
  cardWidth?: number;
  cardHeight?: number;
  scrollTarget?: RefObject<HTMLElement | null>;
  ref?: React.Ref<HTMLDivElement>;
}

const CircularGallery = ({ items, className, radius = 600, autoRotateSpeed = 0.02, cardWidth = 300, cardHeight = 400, scrollTarget, ref, ...props }: CircularGalleryProps) => {
    const [rotation, setRotation] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(wrapperRef);

    useEffect(() => {
      if (!isInView) return;

      const computeProgress = () => {
        const target = scrollTarget?.current;
        if (target) {
          const rect = target.getBoundingClientRect();
          const scrollable = target.offsetHeight - window.innerHeight;
          if (scrollable <= 0) return 0;
          return Math.max(0, Math.min(1, -rect.top / scrollable));
        }
        const pageScrollable = document.documentElement.scrollHeight - window.innerHeight;
        return pageScrollable > 0 ? window.scrollY / pageScrollable : 0;
      };

      const handleScroll = () => {
        setIsScrolling(true);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        setRotation(computeProgress() * 360);
        scrollTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false);
        }, 150);
      };

      const initialFrame = requestAnimationFrame(() => {
        setRotation(computeProgress() * 360);
      });
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        cancelAnimationFrame(initialFrame);
        window.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, [scrollTarget, isInView]);

    useEffect(() => {
      if (!isInView) return;

      const autoRotate = () => {
        if (!isScrolling) {
          setRotation(prev => prev + autoRotateSpeed);
        }
        animationFrameRef.current = requestAnimationFrame(autoRotate);
      };

      animationFrameRef.current = requestAnimationFrame(autoRotate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [isScrolling, autoRotateSpeed, isInView]);

    const anglePerItem = 360 / items.length;

    return (
      <div
        ref={(node) => {
          wrapperRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref && 'current' in ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        role="region"
        aria-label="Circular 3D Gallery"
        className={cn("relative w-full h-full flex items-center justify-center", className)}
        style={{ perspective: '2000px' }}
        {...props}
      >
        <div
          className="relative w-full h-full"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {items.map((item, i) => {
            const itemAngle = i * anglePerItem;
            const [role, period = ""] = item.binomial.split(" · ");
            const [, location = ""] = item.photo.by.split(" · ");

            return (
              <div
                key={item.common}
                role="group"
                aria-label={item.common}
                className="absolute"
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  transform: `rotateY(${itemAngle}deg) translateZ(${radius}px)`,
                  left: '50%',
                  top: '50%',
                  marginLeft: -cardWidth / 2,
                  marginTop: -cardHeight / 2,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    background: '#060712',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow:
                      '0 20px 50px rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.3)',
                  }}
                >
                  <CardPattern variant={i} />

                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 22px',
                      textAlign: 'center',
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontFamily: 'var(--font-serif)',
                        fontStyle: 'italic',
                        fontWeight: 400,
                        fontSize: 'clamp(1.25rem, 1.65vw, 1.55rem)',
                        lineHeight: 1.1,
                        letterSpacing: '-0.005em',
                        color: 'rgba(255,255,255,0.96)',
                      }}
                    >
                      {item.common.toLowerCase()}
                    </h3>
                    <p
                      style={{
                        margin: '0.55rem 0 0',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.7rem',
                        letterSpacing: '0.02em',
                        lineHeight: 1.35,
                        color: 'rgba(255,255,255,0.52)',
                      }}
                    >
                      {role.toLowerCase()}
                    </p>
                    {item.icon && (
                      <div
                        style={{
                          marginTop: '0.85rem',
                          width: 30,
                          height: 30,
                          borderRadius: 5,
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.12)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
                        }}
                      >
                        <Image
                          src={item.icon}
                          alt=""
                          aria-hidden
                          width={60}
                          height={60}
                          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      bottom: 14,
                      left: 16,
                      right: 16,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      gap: 12,
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.6rem',
                      letterSpacing: '0.04em',
                      lineHeight: 1.45,
                    }}
                  >
                    <div style={{ color: 'rgba(255,255,255,0.45)', textAlign: 'left' }}>
                      {location && <div>{location.toLowerCase()}</div>}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.55)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {period.toLowerCase()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
  );
};

CircularGallery.displayName = 'CircularGallery';

export { CircularGallery };
