import { cn } from "@/lib/utils";
import { formatRating, scoreTone } from "@/lib/format";

const toneClasses = {
  1: "bg-score-1/12 text-score-1 ring-score-1/25",
  2: "bg-score-2/12 text-score-2 ring-score-2/25",
  3: "bg-score-3/15 text-amber-700 ring-score-3/30 dark:text-score-3",
  4: "bg-score-4/12 text-score-4 ring-score-4/25",
  5: "bg-score-5/12 text-score-5 ring-score-5/25",
} as const;

const sizeClasses = {
  sm: "size-10 rounded-lg text-sm",
  md: "size-14 rounded-xl text-xl",
  lg: "size-20 rounded-2xl text-3xl",
  xl: "size-24 rounded-3xl text-4xl",
} as const;

/** Square score tile coloured by quality. `invert` for metrics where lower is better. */
export function ScoreBadge({
  value,
  size = "md",
  invert = false,
  className,
  label,
}: {
  value: number | null | undefined;
  size?: keyof typeof sizeClasses;
  invert?: boolean;
  className?: string;
  label?: string;
}) {
  const tone = scoreTone(value, invert);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center font-semibold tabular ring-1 ring-inset",
        sizeClasses[size],
        tone ? toneClasses[tone] : "bg-muted text-muted-foreground ring-border",
        className,
      )}
      aria-label={label ? `${label}: ${formatRating(value)}` : undefined}
    >
      {formatRating(value)}
    </div>
  );
}
