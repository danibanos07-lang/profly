import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminHeader, AdminSearch } from "@/components/admin/admin-ui";
import { UserActions } from "@/components/admin/admin-widgets";
import { getUsers } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { param } from "@/lib/params";
import { getSessionUser } from "@/lib/supabase/server";

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const params = await searchParams;
  const q = param(params, "q")?.trim() ?? "";
  const [{ t, locale }, users, me] = await Promise.all([getI18n(), getUsers(q), getSessionUser()]);
  const u = t.admin.users;
  return (
    <>
      <AdminHeader title={t.admin.nav.users} hint={u.hint} />
      <div className="mb-4">
        <AdminSearch placeholder={`${u.email}, ID…`} defaultValue={q} />
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{u.email}</TableHead>
              <TableHead>{u.role}</TableHead>
              <TableHead className="text-right">{u.reviews}</TableHead>
              <TableHead>{u.joined}</TableHead>
              <TableHead className="text-right">{t.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <span className="font-medium">{user.email}</span>
                  <span className="block text-xs text-muted-foreground">
                    {user.display_name ?? "—"} · <span className="font-mono">{user.id.slice(0, 8)}</span>
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {user.has_university_email && <Badge variant="soft">{u.uniEmail}</Badge>}
                    {user.is_banned && <Badge variant="danger">{u.banned}</Badge>}
                  </div>
                </TableCell>
                <TableCell>{t.enums.user_role[user.role]}</TableCell>
                <TableCell className="text-right tabular">{user.review_count}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(user.created_at, locale)}</TableCell>
                <TableCell>
                  <UserActions userId={user.id} role={user.role} banned={user.is_banned} canSetRole={me?.role === "admin"} isSelf={me?.id === user.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {users.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{t.admin.common.empty}</p>}
      </div>
    </>
  );
}
