import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import { env } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: t.meta.title, template: "%s · Kurso" },
    description: t.meta.description,
    openGraph: { title: t.meta.title, description: t.meta.description, siteName: "Kurso", type: "website" },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111113" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getI18n();
  return (
    <html lang={locale} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
