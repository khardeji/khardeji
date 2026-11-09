import { useEffect, useState } from "react";

// Demo auctions end relative to the moment the visitor opens the site (client only).
let anchor: number | null = null;

export function demoAnchor(): number {
  if (anchor === null) anchor = Date.now();
  return anchor;
}

export function demoEndsAt(hours: number): number {
  return demoAnchor() + hours * 3_600_000;
}

/** Current time, ticking every second after hydration; null during SSR. */
export function useNow(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    demoAnchor();
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
