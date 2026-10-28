"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleBookmark } from "@/lib/actions/bookmarks";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function BookmarkButton({
  target,
  initialSaved,
  signedIn,
}: {
  target: { professorId: string } | { courseId: string };
  initialSaved: boolean;
  signedIn: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!signedIn) {
      toast(t.bookmarks.loginRequired, { action: { label: t.nav.login, onClick: () => router.push("/login") } });
      return;
    }
    setSaved((s) => !s);
    startTransition(async () => {
      const result = await toggleBookmark(target);
      if (!result.ok) {
        setSaved((s) => !s);
        toast.error(t.errors.generic);
        return;
      }
      setSaved(result.data.saved);
      toast.success(result.data.saved ? t.bookmarks.added : t.bookmarks.removed);
    });
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={pending} aria-pressed={saved}>
      <Bookmark className={cn(saved && "fill-primary text-primary")} />
      {saved ? t.bookmarks.saved : t.bookmarks.save}
    </Button>
  );
}
