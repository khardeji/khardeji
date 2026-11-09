import { INTL_LOCALE, type Locale } from "./i18n";

const CURRENCY: Record<Locale, string> = { ar: "د.ت", fr: "DT", en: "TND" };

export function formatDT(value: number, locale: Locale = "fr"): string {
  const hasDecimals = Math.round(value) !== value;
  return (
    new Intl.NumberFormat(INTL_LOCALE[locale], {
      minimumFractionDigits: hasDecimals ? 1 : 0,
      maximumFractionDigits: 3,
    }).format(value) +
    " " +
    CURRENCY[locale]
  );
}

export function formatNumber(value: number, locale: Locale = "fr"): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 3 }).format(value);
}

export function formatDate(iso: string, locale: Locale = "fr"): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

const CLOSED: Record<Locale, string> = { ar: "مغلقة", fr: "Clôturée", en: "Closed" };

export function formatRemaining(ms: number, locale: Locale = "fr"): string {
  if (ms <= 0) return CLOSED[locale];
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) {
    if (locale === "ar") return `${d} يوم و ${pad(h)}:${pad(m)}`;
    return `${d}${locale === "fr" ? "j" : "d"} ${pad(h)}h ${pad(m)}m`;
  }
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
