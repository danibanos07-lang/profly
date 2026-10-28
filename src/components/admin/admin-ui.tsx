import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AdminHeader({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </header>
  );
}

export function AdminPanel({ title, children, className, action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-soft", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** GET search form that keeps other query params (e.g. the selected university). */
export function AdminSearch({ placeholder, defaultValue, hidden = {} }: { placeholder: string; defaultValue?: string; hidden?: Record<string, string | undefined> }) {
  return (
    <form role="search" className="relative w-full max-w-sm">
      {Object.entries(hidden).map(([key, value]) => (value ? <input key={key} type="hidden" name={key} value={value} /> : null))}
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input name="q" type="search" defaultValue={defaultValue} placeholder={placeholder} aria-label={placeholder} className="pl-9" />
    </form>
  );
}

export function AdminPager({ page, total, pageSize, hrefFor }: { page: number; total: number; pageSize: number; hrefFor: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm text-muted-foreground">
      <span className="tabular">
        {page} / {pages}
      </span>
      <Button asChild variant="outline" size="icon-sm" aria-disabled={page <= 1} className={cn(page <= 1 && "pointer-events-none opacity-50")}>
        <Link href={hrefFor(page - 1)} aria-label="←">
          <ChevronLeft />
        </Link>
      </Button>
      <Button asChild variant="outline" size="icon-sm" aria-disabled={page >= pages} className={cn(page >= pages && "pointer-events-none opacity-50")}>
        <Link href={hrefFor(page + 1)} aria-label="→">
          <ChevronRight />
        </Link>
      </Button>
    </div>
  );
}

/** Tabs implemented as links so filters are shareable and work without JS. */
export function AdminTabs({ tabs, current }: { tabs: { value: string; label: string; href: string }[]; current: string }) {
  return (
    <div className="mb-5 inline-flex gap-1 rounded-xl bg-muted p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          aria-current={tab.value === current ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            tab.value === current && "bg-card text-foreground shadow-soft",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CheckboxField({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4 rounded border-input accent-primary" />
      <span>
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}
