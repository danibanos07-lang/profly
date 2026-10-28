import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { getI18n } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import { getSessionUser } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [{ t }, user] = await Promise.all([getI18n(), getSessionUser()]);
  if (!user) redirect("/login?next=/dashboard");
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-sm text-muted-foreground">{t.dashboard.title}</p>
      <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
        {user.displayName ? format(t.dashboard.greeting, { name: user.displayName }) : t.dashboard.greetingAnon}
      </h1>
      <div className="mt-6">
        <DashboardNav />
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
