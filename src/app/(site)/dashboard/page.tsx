import Link from "next/link";
import { MessageSquareText, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { ScoreBadge } from "@/components/rating/score-badge";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser, getSupabase } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

const statusVariant = { published: "success", under_review: "warning", hidden: "secondary", removed: "danger" } as const;

export default async function DashboardReviewsPage() {
  const [{ t, locale }, user, supabase] = await Promise.all([getI18n(), getSessionUser(), getSupabase()]);
  if (!user || !supabase) return null;
  const [{ data: reviews }, { data: suggestions }] = await Promise.all([
    supabase
      .from("reviews")
      .select(
        "id, status, created_at, edited_at, helpful_count, body, professor_review_scores(overall), professor:professors(display_name, slug), course:courses(code, name, slug), term:academic_terms(label)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("suggestions").select("id, kind, status, payload, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <div className="grid gap-10">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t.dashboard.myReviews}</h2>
          <Button asChild size="sm">
            <Link href="/reviews/new">{t.nav.writeReview}</Link>
          </Button>
        </div>
        {!reviews?.length ? (
          <EmptyState icon={<MessageSquareText />} title={t.dashboard.noReviews} />
        ) : (
          <ul className="grid gap-3">
            {reviews.map((review) => {
              const professor = review.professor as { display_name: string; slug: string } | null;
              const course = review.course as { code: string; name: string; slug: string } | null;
              const term = review.term as { label: string } | null;
              return (
                <li key={review.id} className="flex items-start gap-4 rounded-2xl border bg-card p-4 shadow-soft">
                  <ScoreBadge value={review.professor_review_scores?.overall} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/professors/${professor?.slug}/${course?.slug}`} className="font-medium hover:text-primary">
                        {professor?.display_name} · {course?.code} {course?.name}
                      </Link>
                      <Badge variant={statusVariant[review.status]}>{t.enums.review_status[review.status]}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {term?.label} · {formatDate(review.created_at, locale)}
                      {review.edited_at ? ` · ${t.reviews.edited}` : ""} · 👍 {review.helpful_count}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{review.body}</p>
                  </div>
                  {review.status !== "removed" && (
                    <Button asChild variant="ghost" size="icon-sm" aria-label={t.common.edit}>
                      <Link href={`/reviews/${review.id}/edit`}>
                        <Pencil />
                      </Link>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {suggestions && suggestions.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">{t.dashboard.mySuggestions}</h2>
          <ul className="divide-y rounded-2xl border bg-card shadow-soft">
            {suggestions.map((s) => {
              const payload = s.payload as Record<string, string>;
              const label = [payload.first_name, payload.last_name, payload.professor_name, payload.course_code, payload.course_name].filter(Boolean).join(" ");
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    <span className="text-muted-foreground">{t.suggest.kinds[s.kind]}:</span> {label}
                  </span>
                  <Badge variant={s.status === "approved" ? "success" : s.status === "rejected" ? "danger" : "secondary"}>{s.status}</Badge>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
