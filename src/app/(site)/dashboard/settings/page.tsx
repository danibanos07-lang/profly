import Link from "next/link";
import { BadgeCheck, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountForm, SettingsForm } from "@/components/dashboard/settings-forms";
import { getUniversityContext } from "@/lib/data/catalog";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const [{ t }, user, context] = await Promise.all([getI18n(), getSessionUser(), getUniversityContext()]);
  if (!user) return null;
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.emailStatus}</CardTitle>
          <CardDescription>{t.dashboard.universityEmailExplainer}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-sm">
            <Mail className="size-4 text-muted-foreground" />
            {user.email}
          </span>
          {user.hasUniversityEmail ? (
            <Badge variant="success">
              <BadgeCheck />
              {t.dashboard.universityEmail}
            </Badge>
          ) : (
            <Badge variant="secondary">{t.dashboard.noUniversityEmail}</Badge>
          )}
          <Link href="/auth/update-password" className="ml-auto text-sm text-primary hover:underline">
            {t.dashboard.changePassword}
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.settings}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            displayName={user.displayName}
            campusId={user.campusId}
            locale={user.preferredLocale}
            campuses={(context?.campuses ?? []).filter((c) => c.is_active).map((c) => ({ id: c.id, name: c.name }))}
          />
        </CardContent>
      </Card>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">{t.dashboard.dangerZone}</CardTitle>
          <CardDescription>{t.dashboard.deleteAccountBody}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountForm />
        </CardContent>
      </Card>
    </div>
  );
}
