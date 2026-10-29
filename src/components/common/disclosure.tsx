import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Collapsed-by-default section for secondary details (native <details>, no JS needed). */
export function Disclosure({ title, children, defaultOpen = false, className }: { title: string; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  return (
    <details open={defaultOpen} className={cn("details-reset group rounded-2xl border bg-card", className)}>
      <summary className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl px-5 py-4 text-sm font-medium transition-colors select-none hover:bg-subtle focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
        {title}
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t px-5 py-5">{children}</div>
    </details>
  );
}
