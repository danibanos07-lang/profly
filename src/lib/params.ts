import { REVIEW_SORTS, type ReviewSort } from "@/lib/constants";

type SearchParams = Record<string, string | string[] | undefined>;

export function param(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export function numberParam(searchParams: SearchParams, key: string) {
  const raw = param(searchParams, key);
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function sortParam(searchParams: SearchParams): ReviewSort {
  const raw = param(searchParams, "sort");
  return (REVIEW_SORTS as readonly string[]).includes(raw ?? "") ? (raw as ReviewSort) : "newest";
}

export function pageParam(searchParams: SearchParams) {
  const n = numberParam(searchParams, "page") ?? 1;
  return Math.min(Math.max(Math.floor(n), 1), 1000);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function uuidParam(searchParams: SearchParams, key: string) {
  const raw = param(searchParams, key);
  return raw && UUID.test(raw) ? raw : undefined;
}
