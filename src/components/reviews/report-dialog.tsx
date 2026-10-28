"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_REASONS } from "@/lib/constants";
import { reportReview } from "@/lib/actions/reviews";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function ReportDialog({ reviewId, signedIn, children }: { reviewId: string; signedIn: boolean; children: ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    if (next && !signedIn) {
      toast(t.report.loginRequired, { action: { label: t.nav.login, onClick: () => router.push("/login") } });
      return;
    }
    setOpen(next);
  }

  function submit() {
    startTransition(async () => {
      const result = await reportReview({ review_id: reviewId, reason, details });
      if (result.ok) {
        toast.success(t.report.thanks);
        setOpen(false);
        setReason("");
        setDetails("");
      } else if (result.error === "duplicateReview") {
        toast(t.report.already);
        setOpen(false);
      } else {
        toast.error(result.error === "rateLimited" ? t.errors.rateLimited : t.errors.generic);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.report.title}</DialogTitle>
          <DialogDescription>{t.report.body}</DialogDescription>
        </DialogHeader>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">{t.report.reason}</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {REPORT_REASONS.map((r) => (
              <label
                key={r}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/50",
                  reason === r && "border-primary bg-accent",
                )}
              >
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--primary)]" />
                {t.enums.report_reason[r]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-2">
          <Label htmlFor={`report-details-${reviewId}`}>{t.report.details}</Label>
          <Textarea id={`report-details-${reviewId}`} value={details} maxLength={1000} onChange={(e) => setDetails(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button onClick={submit} disabled={!reason || pending}>
            {t.report.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
