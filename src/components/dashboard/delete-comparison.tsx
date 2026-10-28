"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteComparison } from "@/lib/actions/bookmarks";
import { useI18n } from "@/lib/i18n/client";

export function DeleteComparison({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t.common.delete}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteComparison(id);
          router.refresh();
        })
      }
    >
      <Trash2 />
    </Button>
  );
}
