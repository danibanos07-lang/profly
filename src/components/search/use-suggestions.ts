"use client";

import { useEffect, useState } from "react";
import type { SuggestItem } from "@/lib/types";

/** Debounced autocomplete fetch with stale-response protection. */
export function useSuggestions(query: string, delay = 150) {
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const json = (await res.json()) as { items: SuggestItem[] };
        setItems(json.items ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, delay);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, delay]);

  return { items, loading };
}
