import Link from "next/link";
import { BadgeCheck, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DemoBadge } from "@/components/common/demo-badge";
import { ScoreBadge } from "@/components/rating/score-badge";
import { ReviewActions } from "./review-actions";
import { formatRating, formatRelative } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ReviewTag } from "@/lib/constants";
import type { FeedReview } from "@/lib/types";

export type ReviewContext = "professor" | "course" | "combo" | "feed";

export function ReviewCard({
  review,
  t,
  locale,
  context,
  myVote,
  signedIn,
  compact = false,
}: {
  review: FeedReview;
  t: Dictionary;
  locale: Locale;
  context: ReviewContext;
  myVote?: 1 | -1;
  signedIn: boolean;
  compact?: boolean;
}) {
  const showProfessor = context === "course" || context === "feed";
  const showCourse = context !== "combo";
  return (
    <article className="rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby={`review-${review.id}`}>
      <header className="flex items-start gap-4">
        <ScoreBadge value={review.professor_overall} size="sm" label={t.ratings.professorOverall} />
        <div className="min-w-0 flex-1">
          <div id={`review-${review.id}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
            {showProfessor && (
              <Link href={`/professors/${review.professor_slug}`} className="hover:underline">
                {review.professor_name}
              </Link>
            )}
            {showProfessor && showCourse && <span className="text-muted-foreground">·</span>}
            {showCourse && (
              <Link href={`/professors/${review.professor_slug}/${review.course_slug}`} className="hover:underline">
                {review.course_name}
              </Link>
            )}
            {!showProfessor && !showCourse && <span>{t.reviews.anonymous}</span>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            {(showProfessor || showCourse) && (
              <>
                <span>{t.reviews.anonymous}</span>
                <span>·</span>
              </>
            )}
            <span>{review.term_label}</span>
            <span>·</span>
            <time dateTime={review.created_at}>{formatRelative(review.created_at, locale)}</time>
            {review.edited_at && <span>({t.reviews.edited})</span>}
          </div>
        </div>
        <div className="hidden shrink-0 flex-wrap justify-end gap-1.5 sm:flex">
          {review.is_own && <Badge variant="soft">{t.reviews.yours}</Badge>}
          {review.enrollment_verified && (
            <Badge variant="success">
              <BadgeCheck />
              {t.reviews.enrollmentVerified}
            </Badge>
          )}
          {review.author_has_university_email && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" tabIndex={0} className="cursor-help">
                  <Mail />
                  {t.reviews.universityEmail}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{t.reviews.universityEmailHint}</TooltipContent>
            </Tooltip>
          )}
          {review.is_demo && <DemoBadge label={t.common.demo} tooltip={t.common.demoTooltip} />}
        </div>
      </header>

      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular">
        <span>
          {t.ratings.difficulty} {formatRating(review.difficulty, 0)}/5
        </span>
        <span>
          {review.weekly_hours} {t.common.hoursPerWeek}
        </span>
        <span>{t.enums.teaching_format[review.teaching_format]}</span>
        <span className={review.would_take_again ? "text-score-5" : "text-score-1"}>
          {review.would_take_again ? t.reviews.wouldTakeAgain : t.reviews.wouldNotTakeAgain}
        </span>
      </p>

      <p className={`mt-4 text-[15px] leading-relaxed whitespace-pre-line ${compact ? "line-clamp-4" : ""}`}>{review.body}</p>

      {!compact && review.advice && (
        <div className="mt-4 rounded-xl bg-subtle px-4 py-3 text-sm">
          <div className="mb-0.5 text-xs font-medium text-muted-foreground">{t.reviews.advice}</div>
          <p className="whitespace-pre-line text-foreground/90">{review.advice}</p>
        </div>
      )}

      {review.tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="tags">
          {review.tags.map((tag) => (
            <li key={tag}>
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {t.tags[tag as ReviewTag] ?? tag}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {!compact && (
        <ReviewActions
          reviewId={review.id}
          isOwn={Boolean(review.is_own)}
          signedIn={signedIn}
          helpful={review.helpful_count}
          notHelpful={review.not_helpful_count}
          myVote={myVote ?? 0}
        />
      )}
    </article>
  );
}
