import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SuggestForm } from "@/components/community/suggest-form";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Suggest" };

export default async function SuggestPage() {
  const [{ t }, user] = await Promise.all([getI18n(), getSessionUser()]);
  if (!user) redirect("/login?next=/suggest");
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t.suggest.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.suggest.subtitle}</p>
      <div className="mt-8 rounded-2xl border bg-card p-6 shadow-soft">
        <SuggestForm />
      </div>
    </div>
  );
}
