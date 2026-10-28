"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import type { AdminMessage, AdminState } from "@/lib/actions/admin";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

type AdminAction = (prev: AdminState, formData: FormData) => Promise<AdminState>;

export function adminMessage(t: Dictionary, message: AdminMessage) {
  switch (message) {
    case "invalid":
      return t.errors.invalidInput;
    case "refreshed":
      return t.admin.overview.refreshed;
    case "merged":
      return t.admin.merge.done;
    case "same":
      return t.admin.merge.same;
    default:
      return t.admin.common[message];
  }
}

/**
 * Form bound to an admin server action: shows a toast with the result,
 * optionally asks for confirmation, and resets itself after success.
 */
export function AdminForm({
  action,
  children,
  className,
  confirm,
  resetOnSuccess = false,
  onResult,
}: {
  action: AdminAction;
  children: ReactNode;
  className?: string;
  /** Text for a native confirmation prompt before submitting. */
  confirm?: string;
  resetOnSuccess?: boolean;
  onResult?: (state: NonNullable<AdminState>) => void;
}) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!state) return;
    const text = adminMessage(t, state.message);
    const detail = state.fields?.length ? state.fields.join(", ") : undefined;
    if (state.ok) {
      if (!state.import) toast.success(text);
      if (resetOnSuccess) formRef.current?.reset();
    } else {
      toast.error(text, { description: detail });
    }
    onResultRef.current?.(state);
    // `at` changes on every submission, so identical results still toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.at]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}

export function SubmitButton({
  children,
  className,
  variant,
  size = "sm",
  name,
  value,
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} name={name} value={value} className={cn(className)}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}
