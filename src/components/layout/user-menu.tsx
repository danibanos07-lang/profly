"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { initials } from "@/lib/format";

export function UserMenu({ email, displayName, isStaff }: { email: string | null; displayName: string | null; isStaff: boolean }) {
  const { t } = useI18n();
  const label = displayName || email || "";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={t.nav.dashboard}>
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(label || "U")}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal">
          <span className="block truncate font-medium text-foreground">{displayName || t.dashboard.greetingAnon}</span>
          <span className="block truncate">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard /> {t.nav.dashboard}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings /> {t.nav.settings}
          </Link>
        </DropdownMenuItem>
        {isStaff && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield /> {t.nav.admin}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> {t.nav.logout}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
