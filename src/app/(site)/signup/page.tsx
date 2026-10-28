import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/auth-forms";
import { GoogleButton } from "@/components/auth/google-button";
import { SetupNotice } from "@/components/common/setup-notice";
import { env, isSupabaseConfigured } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = param(sp, "next");
  const [{ t }, user] = await Promise.all([getI18n(), getSessionUser()]);
  if (user) redirect("/dashboard");
  return (
    <AuthShell
      title={t.auth.signupTitle}
      subtitle={t.auth.signupSubtitle}
      footer={
        <>
          {t.auth.haveAccount}{" "}
          <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-foreground hover:underline">
            {t.auth.login}
          </Link>
        </>
      }
    >
      <div className="grid gap-4">
        {!isSupabaseConfigured() && <SetupNotice t={t} />}
        {env.googleAuthEnabled && (
          <>
            <GoogleButton label={t.auth.google} next={next} />
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              {t.auth.or}
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}
        <SignupForm next={next} />
      </div>
    </AuthShell>
  );
}
