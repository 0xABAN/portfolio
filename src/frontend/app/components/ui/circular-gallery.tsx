"use client";

import Image from 'next/image';
import React, { useState, useEffect, useRef, HTMLAttributes, type RefObject } from 'react';
import { useInView } from '../../hooks/useInView';

const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
}

export interface GalleryItem {
  common: string;
  binomial: string;
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

            return (
              <div
                key={item.photo.url}
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
                <div className="relative w-full h-full rounded-lg shadow-2xl overflow-hidden group border border-border bg-card/70 dark:bg-card/30 backdrop-blur-lg">
                  <Image
                    src={item.photo.url}
                    alt={item.photo.text}
                    fill
                    loading="eager"
                    sizes={`${cardWidth}px`}
                    className="object-cover"
                    style={{ objectPosition: item.photo.pos || 'center' }}
                  />
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
