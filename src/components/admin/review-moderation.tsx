"use client";

import Link from "next/link";
import { BadgeCheck, ExternalLink, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DemoBadge } from "@/components/common/demo-badge";
import { ScoreBadge } from "@/components/rating/score-badge";
import { AdminForm, SubmitButton } from "./admin-form";
import { moderateReview } from "@/lib/actions/admin";
import { formatDate } from "@/lib/format";
import { format } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import type { AdminReview } from "@/lib/data/admin";
import type { ReviewTag } from "@/lib/constants";

const STATUS_VARIANT = {
  published: "success",
  under_review: "warning",
  hidden: "secondary",
  removed: "danger",
} as const;

/** A review as moderators see it, with every moderation action. */
export function ReviewModeration({ review, overall, children }: { review: AdminReview; overall: number | null; children?: React.ReactNode }) {
  const { t, locale } = useI18n();
  const actions = (["publish", "queue", "hide", "remove"] as const).filter(
    (a) => !(a === "publish" && review.status === "published") && !(a === "queue" && review.status === "under_review"),
  );
  return (
    <article className="rounded-2xl border bg-card p-5 shadow-soft">
      <header className="flex flex-wrap items-start gap-4">
        <ScoreBadge value={overall} size="md" label={t.ratings.professorOverall} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {review.professor && (
              <Link href={`/professors/${review.professor.slug}`} className="hover:text-primary hover:underline" target="_blank">
                {review.professor.display_name}
              </Link>
            )}
            {review.professor?.is_fictional && <DemoBadge label={t.common.demo} tooltip={t.common.demoTooltip} />}
            {review.course && (
              <span className="text-muted-foreground">
                · <span className="font-mono text-xs">{review.course.code}</span> {review.course.name}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={STATUS_VARIANT[review.status]}>{t.enums.review_status[review.status]}</Badge>
            {review.term && <span>{review.term.label}</span>}
            <span>{formatDate(review.created_at, locale)}</span>
            {review.report_count > 0 && (
              <span className="inline-flex items-center gap-1 text-destructive">
                <Flag className="size-3" />
                {format(t.admin.reviews.openReports, { count: review.report_count })}
              </span>
            )}
            {review.enrollment_verified && (
              <span className="inline-flex items-center gap-1 text-primary">
                <BadgeCheck className="size-3" />
                {t.admin.reviews.verified}
              </span>
            )}
            <span title={t.admin.reviews.authorHint} className="font-mono">
              {t.admin.reviews.author}: {review.user_id.slice(0, 8)}
            </span>
          </div>
        </div>
        {review.professor && review.course && (
          <Link
            href={`/professors/${review.professor.slug}/${review.course.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            {t.admin.common.view}
            <ExternalLink className="size-3" />
          </Link>
        )}
      </header>

      <p className="mt-4 text-sm leading-relaxed whitespace-pre-line">{review.body}</p>
      {review.advice && <p className="mt-3 rounded-xl bg-subtle p-3 text-sm whitespace-pre-line text-muted-foreground">{review.advice}</p>}
      {review.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {review.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {t.tags[tag as ReviewTag] ?? tag}
            </Badge>
          ))}
        </div>
      )}
      {review.moderation_note && (
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-medium">{t.admin.reviews.moderationNote}:</span> {review.moderation_note}
        </p>
      )}

      {children}

      <AdminForm action={moderateReview} className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
        <input type="hidden" name="review_id" value={review.id} />
        <Input name="reason" placeholder={t.admin.common.reasonPlaceholder} aria-label={t.admin.common.reason} className="h-8 min-w-48 flex-1 text-sm" maxLength={500} />
        {actions.map((action) => (
          <SubmitButton
            key={action}
            name="action"
            value={action}
            variant={action === "remove" ? "destructive" : action === "publish" ? "default" : "outline"}
          >
            {t.admin.reviews.actions[action]}
          </SubmitButton>
        ))}
        <SubmitButton
          name="action"
          value={review.enrollment_verified ? "unverify_enrollment" : "verify_enrollment"}
          variant="ghost"
        >
          <BadgeCheck />
          {t.admin.reviews.actions[review.enrollment_verified ? "unverify_enrollment" : "verify_enrollment"]}
        </SubmitButton>
      </AdminForm>
    </article>
  );
}
