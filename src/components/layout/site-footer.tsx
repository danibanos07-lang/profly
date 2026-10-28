import Link from "next/link";
import { Logo } from "./logo";
import { getI18n } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { t } = await getI18n();
  const columns = [
    {
      title: t.footer.product,
      links: [
        { href: "/search?tab=professors", label: t.nav.professors },
        { href: "/search?tab=courses", label: t.nav.courses },
        { href: "/compare", label: t.nav.compare },
      ],
    },
    {
      title: t.footer.community,
      links: [
        { href: "/reviews/new", label: t.nav.writeReview },
        { href: "/suggest", label: t.footer.suggest },
        { href: "/corrections", label: t.footer.corrections },
      ],
    },
    {
      title: t.footer.legal,
      links: [
        { href: "/guidelines", label: t.footer.guidelines },
        { href: "/privacy", label: t.footer.privacy },
      ],
    },
  ];
  return (
    <footer className="mt-24 border-t bg-subtle">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">{t.footer.tagline}</p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-medium">{column.title}</h3>
            <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:px-6 md:flex-row md:justify-between">
          <p>{t.legal.disclaimer}</p>
          <p className="shrink-0">© {new Date().getFullYear()} UniRate · {t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
