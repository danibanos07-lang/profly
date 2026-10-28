import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase/server";
import { getUniversityContext } from "@/lib/data/catalog";
import type { SuggestItem } from "@/lib/types";

/** Autocomplete endpoint: GET /api/search?q=calculo */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 80).trim();
  if (q.length < 2) return NextResponse.json({ items: [] });
  const supabase = await getSupabase();
  if (!supabase) return NextResponse.json({ items: [], configured: false });
  const context = await getUniversityContext();
  const { data, error } = await supabase.rpc("search_suggest", {
    p_query: q,
    p_university_id: context?.university.id,
    p_limit: 8,
  });
  if (error) return NextResponse.json({ items: [], error: "search_failed" }, { status: 500 });
  return NextResponse.json(
    { items: (data ?? []) as SuggestItem[] },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } },
  );
}
