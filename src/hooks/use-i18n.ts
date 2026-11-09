import { useRouteContext, useRouter } from "@tanstack/react-router";
import { useCallback } from "react";
import { dirOf, LOCALE_COOKIE, type Locale, type Msg } from "@/lib/i18n";
import { formatDate, formatDT, formatNumber, formatRemaining } from "@/lib/format";

export function useI18n() {
  const locale = useRouteContext({ from: "__root__", select: (c) => c.locale });
  const router = useRouter();
  const t = useCallback((m: Msg) => m[locale], [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      document.documentElement.dir = dirOf(next);
      void router.invalidate();
    },
    [router],
  );

  return {
    locale,
    dir: dirOf(locale),
    t,
    setLocale,
    dt: (v: number) => formatDT(v, locale),
    num: (v: number) => formatNumber(v, locale),
    date: (iso: string) => formatDate(iso, locale),
    remaining: (ms: number) => formatRemaining(ms, locale),
  };
}
