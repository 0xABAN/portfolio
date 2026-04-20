"use client";

import { useEffect, useState, type RefObject } from "react";

type Options = {
  rootMargin?: string;
  threshold?: number | number[];
};

export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  { rootMargin = "200px", threshold = 0 }: Options = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin, threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold]);

  return inView;
}
