import Link from "next/link";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/search/search-box";
import { Logo } from "./logo";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { getSessionUser } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";

export async function SiteHeader({ showSearch = true }: { showSearch?: boolean }) {
  const [{ t }, user] = await Promise.all([getI18n(), getSessionUser()]);
  const isStaff = user?.role === "admin" || user?.role === "moderator";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <Link href="/search?tab=professors" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            {t.nav.professors}
          </Link>
          <Link href="/search?tab=courses" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            {t.nav.courses}
          </Link>
          <Link href="/compare" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            {t.nav.compare}
          </Link>
        </nav>
        <div className="flex flex-1 justify-end">
          {showSearch && <SearchBox className="hidden w-full max-w-xs lg:block" />}
        </div>
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button asChild size="sm" className="ml-1 hidden sm:inline-flex">
            <Link href="/reviews/new">
              <PenLine />
              {t.nav.writeReview}
            </Link>
          </Button>
          {user ? (
            <UserMenu email={user.email} displayName={user.displayName} isStaff={isStaff} />
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="/login">{t.nav.login}</Link>
            </Button>
          )}
          <MobileNav signedIn={Boolean(user)} isStaff={isStaff} />
        </div>
      </div>
    </header>
  );
}
