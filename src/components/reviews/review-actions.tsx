"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flag, Pencil, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ReportDialog } from "./report-dialog";
import { deleteReview, voteReview } from "@/lib/actions/reviews";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function ReviewActions({
  reviewId,
  isOwn,
  signedIn,
  helpful,
  notHelpful,
  myVote,
}: {
  reviewId: string;
  isOwn: boolean;
  signedIn: boolean;
  helpful: number;
  notHelpful: number;
  myVote: -1 | 0 | 1;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [vote, setVote] = useState(myVote);
  const [counts, setCounts] = useState({ up: helpful, down: notHelpful });
  const [pending, startTransition] = useTransition();

  function cast(next: -1 | 1) {
    if (!signedIn) {
      toast(t.reviews.loginToVote, { action: { label: t.nav.login, onClick: () => router.push("/login") } });
      return;
    }
    const value = vote === next ? 0 : next;
    const previous = { vote, counts };
    // Optimistic update.
    setVote(value);
    setCounts((c) => ({
      up: c.up - (vote === 1 ? 1 : 0) + (value === 1 ? 1 : 0),
      down: c.down - (vote === -1 ? 1 : 0) + (value === -1 ? 1 : 0),
    }));
    startTransition(async () => {
      const result = await voteReview(reviewId, value);
      if (!result.ok) {
        setVote(previous.vote);
        setCounts(previous.counts);
        toast.error(result.error === "rateLimited" ? t.errors.rateLimited : t.reviews.voteError);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteReview(reviewId);
      if (result.ok) {
        toast.success(t.reviews.deleted);
        router.refresh();
      } else toast.error(t.errors.generic);
    });
  }

  return (
    <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      {isOwn ? (
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/reviews/${reviewId}/edit`}>
              <Pencil />
              {t.common.edit}
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={pending}>
                <Trash2 />
                {t.common.delete}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.reviews.deleteConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.reviews.deleteConfirmBody}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>{t.common.delete}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-xs text-muted-foreground">{t.reviews.helpfulQuestion}</span>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={vote === 1}
            aria-label={t.reviews.helpful}
            onClick={() => cast(1)}
            className={cn("tabular", vote === 1 && "bg-score-5/10 text-score-5 hover:bg-score-5/15 hover:text-score-5")}
          >
            <ThumbsUp />
            {counts.up}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={vote === -1}
            aria-label={t.reviews.notHelpful}
            onClick={() => cast(-1)}
            className={cn("tabular", vote === -1 && "bg-score-1/10 text-score-1 hover:bg-score-1/15 hover:text-score-1")}
          >
            <ThumbsDown />
            {counts.down}
          </Button>
        </div>
      )}
      {!isOwn && (
        <ReportDialog reviewId={reviewId} signedIn={signedIn}>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag />
            {t.reviews.report}
          </Button>
        </ReportDialog>
      )}
    </footer>
  );
}
