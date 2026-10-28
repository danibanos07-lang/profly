import type { Metadata } from "next";
import { LegalPage } from "@/components/common/legal-page";
import { getI18n } from "@/lib/i18n/server";
import { getLegalDoc } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy" };

export default async function PrivacyPage() {
  const { t, locale } = await getI18n();
  return <LegalPage title={t.legal.privacyTitle} doc={getLegalDoc("privacy", locale)} disclaimer={t.legal.disclaimer} />;
}
