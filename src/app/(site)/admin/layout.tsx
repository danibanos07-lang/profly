import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { SetupNotice } from "@/components/common/setup-notice";
import { getAdminOverview } from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { t } = await getI18n();
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <SetupNotice t={t} />
      </div>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  // Students get a plain 404 so the admin area isn't advertised.
  if (user.role !== "admin" && user.role !== "moderator") notFound();

  const overview = await getAdminOverview();
  const counts = {
    reports: overview?.open_reports ?? 0,
    queue: overview?.queued_reviews ?? 0,
    suggestions: overview?.pending_suggestions ?? 0,
    corrections: overview?.open_corrections ?? 0,
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="mb-5 flex items-center gap-2.5 px-1 lg:px-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">{t.admin.title}</p>
            <p className="text-xs text-muted-foreground">{t.enums.user_role[user.role]}</p>
          </div>
        </div>
        <AdminNav role={user.role} counts={counts} />
      </aside>
      <div className="min-w-0">
        {children}
      </div>
    </div>
  );
}
