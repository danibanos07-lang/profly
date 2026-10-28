import Link from "next/link";
import { ChevronRight, Columns3 } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { DeleteComparison } from "@/components/dashboard/delete-comparison";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser, getSupabase } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export default async function ComparisonsPage() {
  const [{ t, locale }, user, supabase] = await Promise.all([getI18n(), getSessionUser(), getSupabase()]);
  if (!user || !supabase) return null;
  const { data: comparisons } = await supabase
    .from("saved_comparisons")
    .select("id, name, professor_ids, created_at, course:courses(slug, code, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (!comparisons?.length) return <EmptyState icon={<Columns3 />} title={t.dashboard.noComparisons} />;
  const allIds = [...new Set(comparisons.flatMap((c) => c.professor_ids))];
  const { data: professors } = await supabase.from("professors").select("id, slug, display_name").in("id", allIds);
  const byId = new Map((professors ?? []).map((p) => [p.id, p]));
  return (
    <ul className="grid gap-3">
      {comparisons.map((c) => {
        const course = c.course as { slug: string; code: string; name: string } | null;
        const picks = c.professor_ids.map((id) => byId.get(id)).filter(Boolean) as { slug: string; display_name: string }[];
        return (
          <li key={c.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft">
            <Link href={`/compare?course=${course?.slug}&p=${picks.map((p) => p.slug).join(",")}`} className="group flex min-w-0 flex-1 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Columns3 className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium group-hover:text-primary">
                  {course?.code} · {picks.map((p) => p.display_name).join(" vs ")}
                </span>
                <span className="block text-xs text-muted-foreground">{formatDate(c.created_at, locale)}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
            <DeleteComparison id={c.id} />
          </li>
        );
      })}
    </ul>
  );
}
