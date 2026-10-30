import Link from "next/link";
import { Logo } from "./logo";
import { getI18n } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { t } = await getI18n();
  const links = [
    { href: "/search?tab=professors", label: t.nav.professors },
    { href: "/search?tab=courses", label: t.nav.courses },
    { href: "/compare", label: t.nav.compare },
    { href: "/suggest", label: t.footer.suggest },
    { href: "/corrections", label: t.footer.corrections },
    { href: "/guidelines", label: t.footer.guidelines },
    { href: "/privacy", label: t.footer.privacy },
  ];
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Logo />
          <nav aria-label={t.footer.product}>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex flex-col gap-2 text-xs text-muted-foreground md:flex-row md:justify-between">
          <p className="max-w-2xl">{t.legal.disclaimer}</p>
          <p className="shrink-0">© {new Date().getFullYear()} Kurso</p>
        </div>
      </div>
    </footer>
  );
}
