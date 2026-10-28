import { Badge } from "@/components/ui/badge";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-ui";
import { BlockedTermForm, DeleteBlockedTerm } from "@/components/admin/admin-widgets";
import { getBlockedTerms } from "@/lib/data/admin";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";

export default async function AdminVocabularyPage() {
  const [{ t }, terms, user] = await Promise.all([getI18n(), getBlockedTerms(), getSessionUser()]);
  const canEdit = user?.role === "admin";
  const v = t.admin.vocabulary;
  return (
    <>
      <AdminHeader title={t.admin.nav.vocabulary} hint={canEdit ? v.hint : `${v.hint} ${t.admin.common.adminOnly}`} />
      <div className="grid gap-6">
        {canEdit && (
          <AdminPanel title={v.add}>
            <BlockedTermForm />
          </AdminPanel>
        )}
        <AdminPanel>
          {terms.length ? (
            <ul className="grid gap-1 sm:grid-cols-2">
              {terms.map((term) => (
                <li key={term.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted">
                  <span className="flex-1 font-mono text-sm">{term.term}</span>
                  <Badge variant={term.severity === "block" ? "danger" : "warning"}>{v.severities[term.severity as "flag" | "block"]}</Badge>
                  {canEdit && <DeleteBlockedTerm id={term.id} />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t.admin.common.empty}</p>
          )}
        </AdminPanel>
      </div>
    </>
  );
}
