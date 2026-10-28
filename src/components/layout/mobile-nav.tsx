"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SearchBox } from "@/components/search/search-box";
import { useI18n } from "@/lib/i18n/client";

export function MobileNav({ signedIn, isStaff }: { signedIn: boolean; isStaff: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/search?tab=professors", label: t.nav.professors },
    { href: "/search?tab=courses", label: t.nav.courses },
    { href: "/compare", label: t.nav.compare },
    { href: "/reviews/new", label: t.nav.writeReview },
    ...(signedIn ? [{ href: "/dashboard", label: t.nav.dashboard }] : []),
    ...(isStaff ? [{ href: "/admin", label: t.nav.admin }] : []),
  ];
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t.nav.menu}>
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetTitle>{t.nav.menu}</SheetTitle>
        <SearchBox onNavigate={() => setOpen(false)} />
        <nav className="grid gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {!signedIn && (
          <div className="mt-auto grid gap-2">
            <Button asChild variant="outline">
              <Link href="/login" onClick={() => setOpen(false)}>
                {t.nav.login}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/signup" onClick={() => setOpen(false)}>
                {t.nav.signup}
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
