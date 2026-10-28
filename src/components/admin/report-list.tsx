"use client";

import { Flag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AdminForm, SubmitButton } from "./admin-form";
import { resolveReport } from "@/lib/actions/admin";
import { formatRelative } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import type { Enums } from "@/lib/supabase/database.types";

type Report = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  resolution_note: string | null;
  reporter: string | null;
};

export function ReportList({ reports }: { reports: Report[] }) {
  const { t, locale } = useI18n();
  return (
    <ul className="mt-4 grid gap-2">
      {reports.map((report) => (
        <li key={report.id} className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Flag className="size-3.5 text-destructive" />
            <span className="font-medium">{t.enums.report_reason[report.reason as Enums<"report_reason">] ?? report.reason}</span>
            <span className="text-xs text-muted-foreground">
              {t.admin.reports.reporter}: {report.reporter ?? "—"} · {formatRelative(report.created_at, locale)}
            </span>
          </div>
          {report.details && <p className="mt-1.5 whitespace-pre-line text-muted-foreground">{report.details}</p>}
          {report.resolution_note && <p className="mt-1.5 text-xs text-muted-foreground">{report.resolution_note}</p>}
          {report.status === "open" && (
            <AdminForm action={resolveReport} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="report_id" value={report.id} />
              <Input name="reason" placeholder={t.admin.common.note} aria-label={t.admin.common.note} className="h-8 min-w-40 flex-1 bg-card text-sm" maxLength={500} />
              <SubmitButton name="status" value="dismissed" variant="outline">
                {t.admin.reports.dismiss}
              </SubmitButton>
              <SubmitButton name="status" value="actioned" variant="secondary">
                {t.admin.reports.action}
              </SubmitButton>
            </AdminForm>
          )}
        </li>
      ))}
    </ul>
  );
}
