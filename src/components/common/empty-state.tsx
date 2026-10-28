import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed bg-subtle px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-card text-muted-foreground shadow-soft [&_svg]:size-5">{icon}</div>}
      <h3 className="font-medium">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
