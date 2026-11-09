// Language rules shared by server and browser. Arabic (Tunisia) is the default; French and English are optional.
export const LOCALES = ["ar", "fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_COOKIE = "khardeji_lang";

/** One piece of copy in every supported language. */
export type Msg = Record<Locale, string>;

export const LOCALE_NAME: Record<Locale, string> = { ar: "العربية", fr: "Français", en: "English" };
export const INTL_LOCALE: Record<Locale, string> = { ar: "ar-TN", fr: "fr-TN", en: "en-GB" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Read the saved language from a Cookie header / document.cookie string; falls back to Arabic. */
export function localeFromCookieString(cookies: string | null | undefined): Locale {
  if (!cookies) return DEFAULT_LOCALE;
  for (const part of cookies.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === LOCALE_COOKIE && isLocale(v)) return v;
  }
  return DEFAULT_LOCALE;
}

export function translator(locale: Locale) {
  return (m: Msg) => m[locale];
}

/** Localized <head> meta for a page. */
export function pageMeta(
  locale: Locale,
  p: { title: Msg; description: Msg; ogTitle?: Msg; ogDescription?: Msg; ogType?: string; card?: string },
) {
  const t = translator(locale);
  return [
    { title: t(p.title) },
    { name: "description", content: t(p.description) },
    { property: "og:title", content: t(p.ogTitle ?? p.title) },
    { property: "og:description", content: t(p.ogDescription ?? p.description) },
    { property: "og:type", content: p.ogType ?? "website" },
    { name: "twitter:card", content: p.card ?? "summary_large_image" },
  ];
}
