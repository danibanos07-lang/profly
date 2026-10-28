"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { deleteAccount, updateSettings } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";

export function SettingsForm({
  displayName,
  campusId,
  locale,
  campuses,
}: {
  displayName: string | null;
  campusId: string | null;
  locale: string;
  campuses: { id: string; name: string }[];
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updateSettings, undefined);
  useEffect(() => {
    if (state?.status === "success") toast.success(t.dashboard.settingsSaved);
    if (state?.status === "error") toast.error(t.errors.generic);
  }, [state, t]);
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="s-name">{t.auth.displayName}</Label>
        <Input id="s-name" name="display_name" defaultValue={displayName ?? ""} maxLength={60} />
        <p className="text-xs text-muted-foreground">{t.auth.displayNameHint}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="s-campus">{t.dashboard.preferredCampus}</Label>
          <NativeSelect id="s-campus" name="campus_id" defaultValue={campusId ?? ""}>
            <option value="">—</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="s-locale">{t.dashboard.preferredLanguage}</Label>
          <NativeSelect id="s-locale" name="preferred_locale" defaultValue={locale}>
            <option value="es">Español</option>
            <option value="en">English</option>
          </NativeSelect>
        </div>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {t.dashboard.saveSettings}
        </Button>
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  return (
    <form action={action} className="grid gap-3">
      {state?.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{state.message === "confirm" ? t.dashboard.deleteAccountConfirm : t.errors.generic}</AlertDescription>
        </Alert>
      )}
      <Label htmlFor="d-confirm">{t.dashboard.deleteAccountConfirm}</Label>
      <Input id="d-confirm" name="confirmation" autoComplete="off" placeholder={t.dashboard.deleteAccountWord} className="max-w-xs" />
      <div>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {t.dashboard.deleteAccount}
        </Button>
      </div>
    </form>
  );
}
