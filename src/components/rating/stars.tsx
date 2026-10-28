import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star display with fractional fill. */
export function Stars({ value, className, size = 14 }: { value: number | null | undefined; className?: string; size?: number }) {
  const v = Math.max(0, Math.min(5, Number(value ?? 0)));
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, v - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-border" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="text-star" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
