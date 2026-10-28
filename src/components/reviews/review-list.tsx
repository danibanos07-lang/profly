import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { ReviewCard, type ReviewContext } from "./review-card";
import { REVIEW_SORTS, type ReviewSort } from "@/lib/constants";
import { format, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { FeedReview } from "@/lib/types";
import { cn } from "@/lib/utils";

function href(basePath: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") search.set(key, String(value));
  const qs = search.toString();
  return `${basePath}${qs ? `?${qs}` : ""}#reviews`;
}

export function ReviewList({
  reviews,
  total,
  page,
  pageSize,
  sort,
  basePath,
  extraParams = {},
  context,
  t,
  locale,
  votes,
  signedIn,
  writeHref,
}: {
  reviews: FeedReview[];
  total: number;
  page: number;
  pageSize: number;
  sort: ReviewSort;
  basePath: string;
  extraParams?: Record<string, string | undefined>;
  context: ReviewContext;
  t: Dictionary;
  locale: Locale;
  votes: Record<string, 1 | -1>;
  signedIn: boolean;
  writeHref: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground tabular">{format(t.common.reviewsCount, { count: total })}</p>
        <nav aria-label={t.search.sortBy} className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {REVIEW_SORTS.map((s) => (
            <Link
              key={s}
              href={href(basePath, { ...extraParams, sort: s === "newest" ? undefined : s })}
              scroll={false}
              aria-current={sort === s ? "true" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                sort === s && "bg-card text-foreground shadow-soft",
              )}
            >
              {t.reviews.sort[s]}
            </Link>
          ))}
        </nav>
      </div>
      {reviews.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText />}
          title={t.reviews.empty}
          description={t.reviews.emptyHint}
          action={
            <Button asChild>
              <Link href={writeHref}>{t.nav.writeReview}</Link>
            </Button>
          }
        />
      ) : (
        <>
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              t={t}
              locale={locale}
              context={context}
              myVote={votes[review.id]}
              signedIn={signedIn}
            />
          ))}
          {pages > 1 && (
            <nav className="flex items-center justify-center gap-2 pt-2" aria-label="pagination">
              <Button asChild variant="outline" size="sm" className={cn(page <= 1 && "pointer-events-none opacity-50")}>
                <Link href={href(basePath, { ...extraParams, sort: sort === "newest" ? undefined : sort, page: page - 1 > 1 ? page - 1 : undefined })} scroll={false} aria-disabled={page <= 1}>
                  {t.common.previous}
                </Link>
              </Button>
              <span className="px-2 text-sm text-muted-foreground tabular">
                {page} / {pages}
              </span>
              <Button asChild variant="outline" size="sm" className={cn(page >= pages && "pointer-events-none opacity-50")}>
                <Link href={href(basePath, { ...extraParams, sort: sort === "newest" ? undefined : sort, page: page + 1 })} scroll={false} aria-disabled={page >= pages}>
                  {t.common.next}
                </Link>
              </Button>
            </nav>
          )}
        </>
      )}
      <p className="text-xs text-muted-foreground">{t.reviews.opinionDisclaimer}</p>
    </div>
  );
}
