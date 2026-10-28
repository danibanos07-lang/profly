"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveComparison } from "@/lib/actions/bookmarks";
import { useI18n } from "@/lib/i18n/client";

export function SaveComparison({ courseId, professorIds, name, signedIn }: { courseId: string; professorIds: string[]; name: string; signedIn: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  function onClick() {
    if (!signedIn) {
      toast(t.compare.loginToSave, { action: { label: t.nav.login, onClick: () => router.push("/login?next=/compare") } });
      return;
    }
    startTransition(async () => {
      const result = await saveComparison({ courseId, professorIds, name });
      if (result.ok) {
        setSaved(true);
        toast.success(t.compare.saved);
      } else toast.error(t.errors.generic);
    });
  }
  return (
    <Button variant="outline" onClick={onClick} disabled={pending || saved}>
      {saved ? <Check /> : <BookmarkPlus />}
      {saved ? t.compare.saved : t.compare.save}
    </Button>
  );
}
