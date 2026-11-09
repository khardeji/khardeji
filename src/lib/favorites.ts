import { useSyncExternalStore } from "react";

const KEY = "khardeji:favorites";
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    cache = [];
  }
  return cache!;
}

const EMPTY: string[] = [];

export function useFavorites() {
  const ids = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );

  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    cache = next;
    localStorage.setItem(KEY, JSON.stringify(next));
    listeners.forEach((l) => l());
  };

  return { ids, isFavorite: (id: string) => ids.includes(id), toggle };
}
