import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ScoreBadge } from "@/components/rating/score-badge";
import { formatHours, formatPercent, formatRating } from "@/lib/format";
import { format } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ProfessorCourse } from "@/lib/types";

/**
 * Per-combination stats. `mode="courses"` lists a professor's courses,
 * `mode="professors"` lists the professors of a course.
 */
export function ComboTable({ rows, mode, t }: { rows: ProfessorCourse[]; mode: "courses" | "professors"; t: Dictionary }) {
  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-soft">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/professors/${row.professor_slug}/${row.course_slug}`}
            className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-subtle sm:px-5"
          >
            <ScoreBadge value={row.avg_overall} size="sm" label={t.ratings.overall} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium group-hover:text-primary">
                {mode === "courses" ? (
                  <>
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">{row.course_code}</span>
                    {row.course_name}
                  </>
                ) : (
                  row.professor_name
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground tabular">
                <span>{format(t.common.reviewsCount, { count: row.review_count })}</span>
                <span>
                  {t.ratings.difficulty} {formatRating(row.avg_difficulty)}
                </span>
                <span>
                  {formatHours(row.avg_weekly_hours)} {t.common.hoursPerWeek}
                </span>
                <span>
                  {t.ratings.takeAgain} {formatPercent(row.would_take_again_pct)}
                </span>
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
