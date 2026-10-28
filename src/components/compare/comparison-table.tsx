import Link from "next/link";
import { Trophy } from "lucide-react";
import { ScoreBadge } from "@/components/rating/score-badge";
import { formatHours, formatPercent, formatRating } from "@/lib/format";
import { format } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ProfessorCourse } from "@/lib/types";
import { LOW_CONFIDENCE_THRESHOLD } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Metric = {
  key: string;
  label: string;
  get: (row: ProfessorCourse) => number | null;
  render: (value: number | null) => string;
  lowerIsBetter?: boolean;
};

/** Index of the best row for a metric, or -1 when there is no clear winner. */
export function bestIndex(values: (number | null)[], lowerIsBetter = false) {
  let best = -1;
  values.forEach((v, i) => {
    if (v === null) return;
    if (best === -1 || (lowerIsBetter ? v < values[best]! : v > values[best]!)) best = i;
  });
  if (best === -1) return -1;
  const ties = values.filter((v) => v === values[best]).length;
  return ties > 1 ? -1 : best;
}

const n = (v: number | null | undefined) => (v === null || v === undefined ? null : Number(v));

export function ComparisonTable({ rows, t }: { rows: ProfessorCourse[]; t: Dictionary }) {
  const metrics: Metric[] = [
    { key: "overall", label: t.ratings.overall, get: (r) => n(r.avg_overall), render: (v) => formatRating(v) },
    { key: "clarity", label: t.ratings.professor.clarity, get: (r) => n(r.avg_clarity), render: (v) => formatRating(v) },
    { key: "grading", label: t.ratings.professor.grading_fairness, get: (r) => n(r.avg_grading_fairness), render: (v) => formatRating(v) },
    { key: "attitude", label: t.ratings.professor.attitude, get: (r) => n(r.avg_attitude), render: (v) => formatRating(v) },
    { key: "workload", label: t.ratings.workload, get: (r) => n(r.avg_workload), render: (v) => formatRating(v), lowerIsBetter: true },
    { key: "hours", label: t.ratings.weeklyHours, get: (r) => n(r.avg_weekly_hours), render: (v) => formatHours(v), lowerIsBetter: true },
    { key: "difficulty", label: t.ratings.difficulty, get: (r) => n(r.avg_difficulty), render: (v) => formatRating(v), lowerIsBetter: true },
    { key: "take_again", label: t.ratings.takeAgain, get: (r) => n(r.would_take_again_pct), render: (v) => formatPercent(v) },
    { key: "recommend", label: t.ratings.recommend, get: (r) => n(r.recommend_pct), render: (v) => formatPercent(v) },
    { key: "reviews", label: t.common.reviews, get: (r) => r.review_count, render: (v) => String(v ?? 0) },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">{t.compare.title}</caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="w-44 p-4 text-left text-xs font-medium text-muted-foreground">
              {t.compare.metric}
            </th>
            {rows.map((row) => (
              <th key={row.id} scope="col" className="p-4 text-left align-bottom">
                <Link href={`/professors/${row.professor_slug}/${row.course_slug}`} className="group flex items-center gap-3">
                  <ScoreBadge value={row.avg_overall} size="sm" />
                  <span>
                    <span className="block font-semibold group-hover:text-primary">{row.professor_name}</span>
                    <span className="block text-xs font-normal text-muted-foreground">{format(t.common.reviewsCount, { count: row.review_count })}</span>
                  </span>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => {
            const values = rows.map(metric.get);
            const best = metric.key === "reviews" ? bestIndex(values) : bestIndex(values, metric.lowerIsBetter);
            return (
              <tr key={metric.key} className="border-b last:border-0">
                <th scope="row" className="p-4 text-left font-normal text-muted-foreground">
                  {metric.label}
                  {metric.lowerIsBetter && <span className="block text-[11px]">({t.compare.lowerIsBetter})</span>}
                </th>
                {values.map((value, i) => (
                  <td key={rows[i].id} className="p-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold tabular",
                        i === best && "bg-score-5/12 text-score-5",
                      )}
                    >
                      {metric.render(value)}
                      {i === best && <Trophy className="size-3.5" aria-label={t.compare.best} />}
                    </span>
                    {metric.key === "reviews" && rows[i].review_count < LOW_CONFIDENCE_THRESHOLD && (
                      <span className="block text-[11px] text-amber-700 dark:text-amber-300">{t.common.lowConfidence}</span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
