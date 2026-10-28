import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPasswordPage() {
  const { t } = await getI18n();
  return (
    <AuthShell
      title={t.auth.resetTitle}
      subtitle={t.auth.resetSubtitle}
      footer={
        <Link href="/login" className="hover:text-foreground">
          ← {t.auth.login}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
