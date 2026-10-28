import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/auth-forms";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New password" };

/** Reached from the recovery email (the link signs the user in first). */
export default async function UpdatePasswordPage() {
  const [{ t }, user] = await Promise.all([getI18n(), getSessionUser()]);
  if (!user) redirect("/login?error=link");
  return (
    <AuthShell title={t.auth.updatePasswordTitle}>
      <UpdatePasswordForm />
    </AuthShell>
  );
}
