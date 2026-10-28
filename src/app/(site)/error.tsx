"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" />
      </span>
      <h1 className="mt-6 text-2xl font-semibold">{t.errors.generic}</h1>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">{error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        <RotateCcw />
        {t.common.tryAgain}
      </Button>
    </div>
  );
}
