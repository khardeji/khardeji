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

/** When an auction closes: real auctions have a fixed date, demo ones run relative to page open. */
export function auctionEndsAt(a: { endsInHours?: number | undefined; endsAt?: string | undefined }): number {
  if (a.endsAt) return Date.parse(a.endsAt);
  return demoEndsAt(a.endsInHours ?? 0);
}

/** Stable order for listing auctions (works during server rendering): demo ones by hours, then real ones by date. */
export function auctionSortKey(a: { endsInHours?: number | undefined; endsAt?: string | undefined }): number {
  return a.endsAt ? 1e12 + Date.parse(a.endsAt) : (a.endsInHours ?? 0) * 3_600_000;
}
