import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminHeader, AdminTabs } from "@/components/admin/admin-ui";
import { EmptyState } from "@/components/common/empty-state";
import { getSuspiciousActivity } from "@/lib/data/admin";
import { formatRelative } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

const WINDOWS = ["7", "30", "90"] as const;

export default async function AdminSuspiciousPage({ searchParams }: PageProps<"/admin/suspicious">) {
  const { days: raw } = await searchParams;
  const days = WINDOWS.find((d) => d === raw) ?? "30";
  const [{ t, locale }, rows] = await Promise.all([getI18n(), getSuspiciousActivity(Number(days))]);
  const s = t.admin.suspicious;
  return (
    <>
      <AdminHeader title={t.admin.nav.suspicious} hint={s.hint} />
      <AdminTabs current={days} tabs={WINDOWS.map((d) => ({ value: d, label: `${d} d`, href: `/admin/suspicious?days=${d}` }))} />
      {rows.length === 0 ? (
        <EmptyState title={t.admin.common.empty} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{s.signal}</TableHead>
                <TableHead>{s.target}</TableHead>
                <TableHead>{s.detail}</TableHead>
                <TableHead>{s.lastSeen}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={`${row.signal}-${row.target_id}-${index}`}>
                  <TableCell className="font-medium">{s.signals[row.signal as keyof typeof s.signals] ?? row.signal}</TableCell>
                  <TableCell>
                    {row.target_type === "profile" ? (
                      <Link href={`/admin/users?q=${row.target_id}`} className="hover:text-primary hover:underline">
                        {row.label}
                      </Link>
                    ) : (
                      <Link href={`/admin/professors/${row.target_id}`} className="hover:text-primary hover:underline">
                        {row.label}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {Object.entries((row.detail ?? {}) as Record<string, unknown>)
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(" · ")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatRelative(row.last_seen, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
