import { cn } from "@/lib/utils";
import { format } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { GradeSummary } from "@/lib/data/catalog";

function formatGrade(value: number) {
  return Number(value) % 1 === 0 ? String(Number(value)) : Number(value).toFixed(1);
}

/** "85/100", or null when the group is below the minimum sample. */
export function gradeLabel(summary: GradeSummary | null | undefined) {
  if (!summary || summary.avg_grade === null) return null;
  return `${formatGrade(summary.avg_grade)}/${formatGrade(summary.grade_scale_max)}`;
}

/** Stat tile for a self-reported grade average. Never shows an average below the minimum sample. */
export function GradeStat({ summary, t, className }: { summary: GradeSummary | null | undefined; t: Dictionary; className?: string }) {
  const label = gradeLabel(summary);
  return (
    <div className={cn("rounded-2xl border bg-card p-4", className)}>
      <div className="text-xs font-medium text-muted-foreground">{t.grades.average}</div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular">{label ?? "—"}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {label ? format(t.grades.basedOn, { count: summary!.grade_count }) : t.grades.notEnough}
      </div>
    </div>
  );
}
