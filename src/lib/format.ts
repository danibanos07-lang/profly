import type { Locale } from "@/lib/i18n/config";

export function formatRating(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(Number(value))}%`;
}

export function formatHours(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value) % 1 === 0 ? String(Number(value)) : Number(value).toFixed(1);
}

export function formatDate(value: string | Date, locale: Locale) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function formatRelative(value: string | Date, locale: Locale, now = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale === "es" ? "es-MX" : "en-US", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(seconds, "second");
}

/** Maps a 1–5 score to a 1–5 colour bucket (for quality, higher is better). */
export function scoreTone(value: number | null | undefined, invert = false): 1 | 2 | 3 | 4 | 5 | null {
  if (value === null || value === undefined) return null;
  const v = invert ? 6 - Number(value) : Number(value);
  if (v >= 4.5) return 5;
  if (v >= 3.75) return 4;
  if (v >= 3) return 3;
  if (v >= 2.25) return 2;
  return 1;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
