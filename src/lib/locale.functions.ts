import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { localeFromCookieString } from "./i18n";

/** Saved language from the visitor's cookie, read during server rendering. */
export const getServerLocale = createServerFn({ method: "GET" }).handler(async () => {
  return localeFromCookieString(getRequestHeader("cookie"));
});
