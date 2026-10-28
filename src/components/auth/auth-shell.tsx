import type { ReactNode } from "react";
import { LogoMark } from "@/components/layout/logo";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 mask-fade-b" aria-hidden />
      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border bg-card p-6 shadow-lift sm:p-8">
          <LogoMark className="size-9" />
          <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
