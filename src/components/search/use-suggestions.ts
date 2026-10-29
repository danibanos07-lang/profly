"use client";

import { useEffect, useState } from "react";
import type { SuggestItem } from "@/lib/types";

/** Debounced autocomplete fetch with stale-response protection. */
export function useSuggestions(query: string, delay = 150) {
  const q = query.trim();
  const enabled = q.length >= 2;
  // Results are keyed by the query they answer, so stale responses never show.
  const [result, setResult] = useState<{ q: string; items: SuggestItem[] } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const json = (await res.json()) as { items: SuggestItem[] };
        setResult({ q, items: json.items ?? [] });
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResult({ q, items: [] });
      }
    }, delay);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q, enabled, delay]);

  if (!enabled) return { items: [] as SuggestItem[], loading: false };
  const fresh = result?.q === q;
  // Keep showing the previous results while the next ones load.
  return { items: result?.items ?? [], loading: !fresh };
}
