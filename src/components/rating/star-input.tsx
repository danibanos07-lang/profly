"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accessible 1–5 rating input. Implemented as a radio group so it works with
 * keyboard arrows and screen readers.
 */
export function StarInput({
  value,
  onChange,
  labels,
  name,
  invalid,
  ariaLabel,
}: {
  value: number | null;
  onChange: (value: number) => void;
  labels: string[];
  name: string;
  invalid?: boolean;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const shown = hover ?? value ?? 0;
  return (
    <div className="flex items-center gap-3">
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={cn("flex items-center rounded-lg", invalid && "ring-2 ring-destructive/40")}
        onMouseLeave={() => setHover(null)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            htmlFor={`${id}-${n}`}
            className="cursor-pointer p-0.5 transition-transform hover:scale-110"
            onMouseEnter={() => setHover(n)}
          >
            <input
              id={`${id}-${n}`}
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="peer sr-only"
              aria-label={`${n} – ${labels[n - 1]}`}
            />
            <Star
              className={cn(
                "size-7 rounded-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                n <= shown ? "text-star" : "text-border",
              )}
              fill="currentColor"
              strokeWidth={0}
            />
          </label>
        ))}
      </div>
      <span className="min-w-20 text-sm text-muted-foreground" aria-live="polite">
        {shown ? labels[shown - 1] : ""}
      </span>
    </div>
  );
}
