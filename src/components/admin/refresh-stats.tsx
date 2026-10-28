"use client";

import { AdminForm, SubmitButton } from "./admin-form";
import { refreshStats } from "@/lib/actions/admin";
import { useI18n } from "@/lib/i18n/client";

export function RefreshStatsButton() {
  const { t } = useI18n();
  return (
    <AdminForm action={refreshStats} confirm={t.admin.common.confirm}>
      <SubmitButton variant="outline">{t.admin.overview.refreshStats}</SubmitButton>
    </AdminForm>
  );
}
