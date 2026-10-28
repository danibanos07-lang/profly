import { cn } from "@/lib/utils";
import { formatRating, scoreTone } from "@/lib/format";

const barTone = {
  1: "bg-score-1",
  2: "bg-score-2",
  3: "bg-score-3",
  4: "bg-score-4",
  5: "bg-score-5",
} as const;

/** Horizontal 0–5 bar used for per-category averages. */
export function RatingBar({
  label,
  value,
  hint,
  invert = false,
  neutral = false,
}: {
  label: string;
  value: number | null | undefined;
  hint?: string;
  invert?: boolean;
  /** Use a neutral colour (for metrics like difficulty that are not good/bad). */
  neutral?: boolean;
}) {
  const pct = value ? (Number(value) / 5) * 100 : 0;
  const tone = scoreTone(value, invert);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-foreground/90" title={hint}>
          {label}
        </span>
        <span className="font-medium tabular">{formatRating(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700", neutral ? "bg-primary/70" : tone ? barTone[tone] : "bg-muted")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
