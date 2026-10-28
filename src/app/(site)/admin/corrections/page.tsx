import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AdminHeader, AdminTabs } from "@/components/admin/admin-ui";
import { CorrectionActions } from "@/components/admin/admin-widgets";
import { EmptyState } from "@/components/common/empty-state";
import { getCorrections } from "@/lib/data/admin";
import { formatRelative } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

const STATUSES = ["open", "resolved", "rejected"] as const;
const one = <T,>(value: T | T[] | null) => (Array.isArray(value) ? value[0] : value);

export default async function AdminCorrectionsPage({ searchParams }: PageProps<"/admin/corrections">) {
  const { status: raw } = await searchParams;
  const status = STATUSES.find((s) => s === raw) ?? "open";
  const [{ t, locale }, rows] = await Promise.all([getI18n(), getCorrections(status)]);
  return (
    <>
      <AdminHeader title={t.admin.nav.corrections} hint={t.admin.corrections.hint} />
      <AdminTabs current={status} tabs={STATUSES.map((s) => ({ value: s, label: t.admin.corrections.status[s], href: `/admin/corrections?status=${s}` }))} />
      {rows.length === 0 ? (
        <EmptyState title={t.admin.common.empty} />
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => {
            const professor = one(row.professor);
            const course = one(row.course);
            return (
              <article key={row.id} className="rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="soft">{t.corrections.relationships[row.relationship as keyof typeof t.corrections.relationships]}</Badge>
                  {professor && (
                    <Link href={`/professors/${professor.slug}`} target="_blank" className="font-medium hover:text-primary hover:underline">
                      {professor.display_name}
                    </Link>
                  )}
                  {course && (
                    <Link href={`/courses/${course.slug}`} target="_blank" className="font-medium hover:text-primary hover:underline">
                      {course.code} {course.name}
                    </Link>
                  )}
                  <span className="text-xs text-muted-foreground">{formatRelative(row.created_at, locale)}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t.admin.corrections.requester}: {row.requester_name} ·{" "}
                  <a href={`mailto:${row.requester_email}`} className="underline">
                    {row.requester_email}
                  </a>
                </p>
                <p className="mt-3 text-sm whitespace-pre-line">{row.message}</p>
                {row.resolution_note && <p className="mt-3 text-xs text-muted-foreground">{row.resolution_note}</p>}
                {row.status === "open" && (
                  <div className="mt-4 border-t pt-4">
                    <CorrectionActions id={row.id} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
