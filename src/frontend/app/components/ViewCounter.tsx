"use client";

import { useEffect, useState } from "react";

function formatCount(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function ViewCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/views", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setCount(d.count))
      .catch(() => {});
  }, []);

  if (count === null) return null;

  return <span>{formatCount(count)} views</span>;
}
