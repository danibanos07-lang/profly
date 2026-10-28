import type { Metadata } from "next";
import { LegalPage } from "@/components/common/legal-page";
import { getI18n } from "@/lib/i18n/server";
import { getLegalDoc } from "@/lib/legal";

export const metadata: Metadata = { title: "Community guidelines" };

export default async function GuidelinesPage() {
  const { t, locale } = await getI18n();
  return <LegalPage title={t.legal.guidelinesTitle} doc={getLegalDoc("guidelines", locale)} disclaimer={t.legal.disclaimer} />;
}
