"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { setLocale } from "@/lib/i18n/actions";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";

const names: Record<Locale, string> = { es: "Español", en: "English" };

export function LocaleSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function change(next: Locale) {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t.nav.language} disabled={pending} className="gap-1.5 px-2">
          <Languages />
          <span className="text-xs font-semibold uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(names) as Locale[]).map((l) => (
          <DropdownMenuCheckboxItem key={l} checked={locale === l} onCheckedChange={() => change(l)}>
            {names[l]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
