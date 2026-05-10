"use client";

const numberFormatter = new Intl.NumberFormat("en-US");

export function ViewCounterDisplay({ count }: { count: number }) {
  return <span suppressHydrationWarning>{numberFormatter.format(count)} views</span>;
}
