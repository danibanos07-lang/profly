"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, CalendarRange, Columns3, MessageSquareText, Settings } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function DashboardNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", label: t.dashboard.tabs.reviews, icon: MessageSquareText },
    { href: "/dashboard/plan", label: t.plan.tab, icon: CalendarRange },
    { href: "/dashboard/saved", label: t.dashboard.tabs.saved, icon: Bookmark },
    { href: "/dashboard/comparisons", label: t.dashboard.tabs.comparisons, icon: Columns3 },
    { href: "/dashboard/settings", label: t.dashboard.tabs.settings, icon: Settings },
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1" aria-label={t.dashboard.title}>
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-card text-foreground shadow-soft",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
