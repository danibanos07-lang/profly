import type { Metadata } from "next";
import Link from "next/link";
import { CorrectionForm } from "@/components/community/correction-form";
import { getI18n } from "@/lib/i18n/server";
import { getSupabase } from "@/lib/supabase/server";
import { uuidParam } from "@/lib/params";

export const metadata: Metadata = { title: "Request a correction" };

export default async function CorrectionsPage({ searchParams }: PageProps<"/corrections">) {
  const sp = await searchParams;
  const [{ t }, supabase] = await Promise.all([getI18n(), getSupabase()]);
  const professorId = uuidParam(sp, "professor");
  const courseId = uuidParam(sp, "course");
  let label: string | undefined;
  if (supabase && professorId) {
    const { data } = await supabase.from("professors").select("display_name").eq("id", professorId).maybeSingle();
    label = data?.display_name ?? undefined;
  } else if (supabase && courseId) {
    const { data } = await supabase.from("courses").select("code, name").eq("id", courseId).maybeSingle();
    label = data ? `${data.code} ${data.name}` : undefined;
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t.corrections.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.corrections.subtitle}</p>
      <div className="mt-8 rounded-2xl border bg-card p-6 shadow-soft">
        {label || (!professorId && !courseId) ? (
          <>
            {!label && (
              <p className="mb-5 text-sm text-muted-foreground">
                {t.corrections.profile}: <Link href="/search" className="text-primary underline">{t.nav.explore}</Link>
              </p>
            )}
            <CorrectionForm professorId={professorId} courseId={courseId} profileLabel={label} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t.errors.notFoundBody}</p>
        )}
      </div>
    </div>
  );
}
