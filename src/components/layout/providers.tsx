"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider locale={locale}>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
