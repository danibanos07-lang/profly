import type { ReactNode } from "react";

export function SectionHeading({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
