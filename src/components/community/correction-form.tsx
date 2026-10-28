"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { submitCorrection } from "@/lib/actions/community";
import { useI18n } from "@/lib/i18n/client";

export function CorrectionForm({ professorId, courseId, profileLabel }: { professorId?: string; courseId?: string; profileLabel?: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(submitCorrection, undefined);
  if (state?.status === "success") {
    return (
      <Alert variant="info">
        <CheckCircle2 />
        <AlertDescription>{t.corrections.thanks}</AlertDescription>
      </Alert>
    );
  }
  return (
    <form action={action} className="grid gap-5">
      {state?.status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{(t.errors as Record<string, string>)[state.message ?? ""] ?? t.errors.generic}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="professor_id" value={professorId ?? ""} />
      <input type="hidden" name="course_id" value={courseId ?? ""} />
      <div aria-hidden className="hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {profileLabel && (
        <div className="rounded-xl bg-subtle px-4 py-3 text-sm">
          <span className="text-muted-foreground">{t.corrections.profile}:</span> <span className="font-medium">{profileLabel}</span>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="c-name">{t.corrections.name}</Label>
          <Input id="c-name" name="requester_name" required maxLength={120} autoComplete="name" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-email">{t.corrections.email}</Label>
          <Input id="c-email" name="requester_email" type="email" required maxLength={200} autoComplete="email" />
          <p className="text-xs text-muted-foreground">{t.corrections.emailHint}</p>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="c-rel">{t.corrections.relationship}</Label>
        <NativeSelect id="c-rel" name="relationship" defaultValue="professor">
          {(["professor", "staff", "student", "other"] as const).map((r) => (
            <option key={r} value={r}>
              {t.corrections.relationships[r]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="c-msg">{t.corrections.message}</Label>
        <Textarea id="c-msg" name="message" required minLength={20} maxLength={3000} rows={6} />
        <p className="text-xs text-muted-foreground">{t.corrections.messageHint}</p>
      </div>
      <div>
        <Button type="submit" disabled={pending || (!professorId && !courseId)}>
          {pending && <Loader2 className="animate-spin" />}
          {t.corrections.submit}
        </Button>
      </div>
    </form>
  );
}
