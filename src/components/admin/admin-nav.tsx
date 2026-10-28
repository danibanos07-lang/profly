"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Flag,
  GitMerge,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  Link2,
  ScrollText,
  ShieldBan,
  Upload,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { UserRole } from "@/lib/constants";
import { cn } from "@/lib/utils";

type NavKey = keyof ReturnType<typeof useI18n>["t"]["admin"]["nav"];
type Item = { key: NavKey; href: string; icon: LucideIcon; adminOnly?: boolean; badge?: number };

export function AdminNav({ role, counts }: { role: UserRole; counts: { reports: number; queue: number; suggestions: number; corrections: number } }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const groups: { label: string; items: Item[] }[] = [
    {
      label: t.admin.groups.moderation,
      items: [
        { key: "overview", href: "/admin", icon: LayoutDashboard },
        { key: "reports", href: "/admin/reports", icon: Flag, badge: counts.reports },
        { key: "queue", href: "/admin/queue", icon: Inbox, badge: counts.queue },
        { key: "suspicious", href: "/admin/suspicious", icon: Activity },
        { key: "users", href: "/admin/users", icon: Users },
      ],
    },
    {
      label: t.admin.groups.community,
      items: [
        { key: "suggestions", href: "/admin/suggestions", icon: Lightbulb, badge: counts.suggestions },
        { key: "corrections", href: "/admin/corrections", icon: ClipboardCheck, badge: counts.corrections },
      ],
    },
    {
      label: t.admin.groups.catalog,
      items: [
        { key: "professors", href: "/admin/professors", icon: UserRound },
        { key: "courses", href: "/admin/courses", icon: BookOpen },
        { key: "assignments", href: "/admin/assignments", icon: Link2 },
        { key: "institutions", href: "/admin/institutions", icon: Building2 },
        { key: "terms", href: "/admin/terms", icon: CalendarDays },
        { key: "import", href: "/admin/import", icon: Upload, adminOnly: true },
        { key: "merge", href: "/admin/merge", icon: GitMerge, adminOnly: true },
      ],
    },
    {
      label: t.admin.groups.system,
      items: [
        { key: "vocabulary", href: "/admin/vocabulary", icon: ShieldBan },
        { key: "logs", href: "/admin/logs", icon: ScrollText },
      ],
    },
  ];

  return (
    <nav aria-label={t.admin.title} className="flex gap-6 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
      {groups.map((group) => (
        <div key={group.label} className="shrink-0">
          <p className="mb-1.5 hidden px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase lg:block">{group.label}</p>
          <ul className="flex gap-1 lg:flex-col">
            {group.items
              .filter((item) => !item.adminOnly || role === "admin")
              .map(({ key, href, icon: Icon, badge }) => {
                const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                        active && "bg-accent font-medium text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      <span className="flex-1">{t.admin.nav[key]}</span>
                      {badge ? (
                        <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular">{badge}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
