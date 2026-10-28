import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Compass className="size-6" />
      </span>
      <h1 className="mt-6 text-2xl font-semibold">{t.errors.notFoundTitle}</h1>
      <p className="mt-2 text-muted-foreground">{t.errors.notFoundBody}</p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href="/">{t.errors.goHome}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/search">{t.nav.explore}</Link>
        </Button>
      </div>
    </div>
  );
}
