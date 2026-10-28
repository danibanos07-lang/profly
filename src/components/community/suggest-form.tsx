"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitSuggestion } from "@/lib/actions/community";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const kinds = ["professor", "course", "assignment", "prerequisite"] as const;

export function SuggestForm() {
  const { t } = useI18n();
  const [kind, setKind] = useState<(typeof kinds)[number]>("professor");
  const [state, action, pending] = useActionState(submitSuggestion, undefined);
  if (state?.status === "success") {
    return (
      <Alert variant="info">
        <CheckCircle2 />
        <AlertDescription>{t.suggest.thanks}</AlertDescription>
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
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">{t.suggest.kind}</legend>
        <input type="hidden" name="kind" value={kind} />
        <div className="grid gap-2 sm:grid-cols-2">
          {kinds.map((k) => (
            <button
              type="button"
              key={k}
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn("cursor-pointer rounded-xl border px-4 py-3 text-left text-sm transition-colors hover:bg-accent/50", kind === k && "border-primary bg-accent")}
            >
              {t.suggest.kinds[k]}
            </button>
          ))}
        </div>
      </fieldset>
      {kind === "professor" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="sg-first">{t.suggest.firstName}</Label>
            <Input id="sg-first" name="first_name" required maxLength={80} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sg-last">{t.suggest.lastName}</Label>
            <Input id="sg-last" name="last_name" required maxLength={120} />
          </div>
        </div>
      )}
      {(kind === "course" || kind === "assignment" || kind === "prerequisite") && (
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <div className="grid gap-2">
            <Label htmlFor="sg-code">{t.suggest.courseCode}</Label>
            <Input id="sg-code" name="course_code" required maxLength={24} />
          </div>
          {kind === "course" && (
            <div className="grid gap-2">
              <Label htmlFor="sg-name">{t.suggest.courseName}</Label>
              <Input id="sg-name" name="course_name" required maxLength={200} />
            </div>
          )}
          {kind === "assignment" && (
            <div className="grid gap-2">
              <Label htmlFor="sg-prof">{t.suggest.professorName}</Label>
              <Input id="sg-prof" name="professor_name" required maxLength={200} />
            </div>
          )}
        </div>
      )}
      {(kind === "professor" || kind === "course") && (
        <div className="grid gap-2">
          <Label htmlFor="sg-dept">{t.suggest.department}</Label>
          <Input id="sg-dept" name="department" maxLength={160} />
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="sg-details">{t.suggest.details}</Label>
        <Textarea id="sg-details" name="details" maxLength={1000} required={kind === "prerequisite"} />
        <p className="text-xs text-muted-foreground">{t.suggest.detailsHint}</p>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {t.suggest.submit}
        </Button>
      </div>
    </form>
  );
}
