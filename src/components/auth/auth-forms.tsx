"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, signIn, signUp, updatePassword, type AuthState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { format } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

function message(t: Dictionary, key?: string) {
  if (!key) return t.auth.genericError;
  if (key === "notConfigured") return t.errors.notConfigured;
  return (t.auth as Record<string, string>)[key] ?? t.auth.genericError;
}

function ErrorAlert({ state }: { state: AuthState }) {
  const { t } = useI18n();
  if (state?.status !== "error") return null;
  return (
    <Alert variant="destructive" aria-live="assertive">
      <AlertDescription>{message(t, state.message)}</AlertDescription>
    </Alert>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" className="h-10 w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next ?? "/dashboard"} />
      <ErrorAlert state={state} />
      <div className="grid gap-2">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t.auth.password}</Label>
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
            {t.auth.forgot}
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Submit pending={pending}>{t.auth.login}</Submit>
    </form>
  );
}

export function SignupForm({ next }: { next?: string }) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState(signUp, undefined);
  if (state?.status === "success") {
    return (
      <div className="grid justify-items-center gap-3 py-4 text-center">
        <MailCheck className="size-10 text-primary" />
        <h2 className="text-lg font-semibold">{t.auth.checkEmailTitle}</h2>
        <p className="text-sm text-muted-foreground">{format(t.auth.checkEmailBody, { email: state.email ?? "" })}</p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next ?? "/dashboard"} />
      <input type="hidden" name="locale" value={locale} />
      <ErrorAlert state={state} />
      <div className="grid gap-2">
        <Label htmlFor="display_name">{t.auth.displayName}</Label>
        <Input id="display_name" name="display_name" maxLength={60} autoComplete="nickname" />
        <p className="text-xs text-muted-foreground">{t.auth.displayNameHint}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <p className="text-xs text-muted-foreground">{t.auth.universityEmailTip}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">{t.auth.password}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="text-xs text-muted-foreground">{t.auth.passwordHint}</p>
      </div>
      <Submit pending={pending}>{t.auth.signup}</Submit>
      <p className="text-xs text-muted-foreground">
        {t.auth.termsNotice}{" "}
        <Link href="/guidelines" className="underline">
          {t.footer.guidelines}
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="underline">
          {t.footer.privacy}
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  if (state?.status === "success") {
    return (
      <Alert variant="info">
        <MailCheck />
        <AlertDescription>{t.auth.resetSent}</AlertDescription>
      </Alert>
    );
  }
  return (
    <form action={action} className="grid gap-4">
      <ErrorAlert state={state} />
      <div className="grid gap-2">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <Submit pending={pending}>{t.auth.resetSend}</Submit>
    </form>
  );
}

export function UpdatePasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updatePassword, undefined);
  if (state?.status === "success") {
    return (
      <div className="grid gap-4">
        <Alert variant="info">
          <CheckCircle2 />
          <AlertDescription>{t.auth.passwordUpdated}</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/dashboard">{t.nav.dashboard}</Link>
        </Button>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-4">
      <ErrorAlert state={state} />
      <div className="grid gap-2">
        <Label htmlFor="password">{t.auth.newPassword}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="text-xs text-muted-foreground">{t.auth.passwordHint}</p>
      </div>
      <Submit pending={pending}>{t.auth.updatePassword}</Submit>
    </form>
  );
}
