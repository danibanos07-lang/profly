import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";
import { GoogleButton } from "@/components/auth/google-button";
import { SetupNotice } from "@/components/common/setup-notice";
import { env, isSupabaseConfigured } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = param(sp, "next");
  const [{ t }, user] = await Promise.all([getI18n(), getSessionUser()]);
  if (user) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
  const error = param(sp, "error");
  return (
    <AuthShell
      title={t.auth.loginTitle}
      subtitle={t.auth.loginSubtitle}
      footer={
        <>
          {t.auth.noAccount}{" "}
          <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-foreground hover:underline">
            {t.auth.signup}
          </Link>
        </>
      }
    >
      <div className="grid gap-4">
        {!isSupabaseConfigured() && <SetupNotice t={t} />}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error === "link" ? t.auth.linkInvalid : t.auth.genericError}</AlertDescription>
          </Alert>
        )}
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
        <LoginForm next={next} />
      </div>
    </AuthShell>
  );
}
