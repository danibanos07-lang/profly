import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { getDictionaryFor } from "./dictionaries";

/**
 * Locale resolution: explicit cookie → browser preference (only English is
 * picked up automatically) → Spanish, the default for Tec.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accept = (await headers()).get("accept-language") ?? "";
  const first = accept.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
});

export const getI18n = cache(async () => {
  const locale = await getLocale();
  return { locale, t: getDictionaryFor(locale) };
});
