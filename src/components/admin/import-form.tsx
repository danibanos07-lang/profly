"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { AdminForm, SubmitButton } from "./admin-form";
import { CheckboxField, Field } from "./admin-ui";
import { importCsv, type ImportSummary } from "@/lib/actions/admin";
import { IMPORT_COLUMNS, IMPORT_KINDS, type ImportKind } from "@/lib/admin-validation";
import { format } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

const EXAMPLES: Record<ImportKind, string> = {
  professors: "first_name,last_name,honorific,department_slug,campus_slug,slug\n",
  courses: "code,name,name_language,department_slug,credits,description\n",
  assignments: "professor_slug,course_code,campus_slug\n",
  teaching: "professor_slug,course_code,term,campus_slug,section,source\n",
  programs: "name,slug,code,name_en,department_slug,campus_slugs\n",
  curriculum: "program_slug,version,course_code,semester,requirement,group,source_url\n",
};

export function ImportForm({ universityId }: { universityId: string }) {
  const { t } = useI18n();
  const im = t.admin.import;
  const [kind, setKind] = useState<ImportKind>("professors");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  return (
    <div className="grid gap-6">
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription>{im.notice}</AlertDescription>
      </Alert>
      <AdminForm action={importCsv} className="grid gap-5" onResult={(state) => setSummary(state.import ?? null)}>
        <input type="hidden" name="university_id" value={universityId} />
        <Field label={im.kind} htmlFor="kind">
          <NativeSelect id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as ImportKind)} className="max-w-sm">
            {IMPORT_KINDS.map((k) => (
              <option key={k} value={k}>
                {im.kinds[k]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="rounded-xl bg-subtle p-4 text-sm">
          <p className="font-medium">{im.columns}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {IMPORT_COLUMNS[kind].map((col) => (
              <li key={col.name} className="rounded-md border bg-card px-2 py-0.5 font-mono text-xs">
                {col.name}
                {col.required && <span className="text-destructive"> *</span>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">* {im.required}</p>
        </div>
        <Field label={im.file} htmlFor="file">
          <Input id="file" name="file" type="file" accept=".csv,text/csv" className="max-w-sm py-1.5" />
        </Field>
        <Field label={im.paste} htmlFor="csv">
          <Textarea id="csv" name="csv" rows={6} className="font-mono text-xs" placeholder={EXAMPLES[kind]} key={kind} />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CheckboxField name="dry_run" label={im.dryRun} defaultChecked />
          <SubmitButton size="default">{im.run}</SubmitButton>
        </div>
      </AdminForm>

      {summary && (
        <div className="grid gap-3" aria-live="polite">
          <Alert variant={summary.errors.length ? "warning" : "info"}>
            <CheckCircle2 />
            <AlertDescription>
              {summary.dryRun
                ? format(im.validated, { valid: summary.valid, skipped: summary.errors.length })
                : format(im.result, { saved: summary.saved, skipped: summary.errors.length })}
            </AlertDescription>
          </Alert>
          {summary.errors.length > 0 && (
            <div className="max-h-80 overflow-y-auto rounded-xl border">
              <p className="sticky top-0 border-b bg-card px-4 py-2 text-sm font-medium">{im.errors}</p>
              <ul className="divide-y text-sm">
                {summary.errors.map((e, i) => (
                  <li key={`${e.line}-${i}`} className="grid gap-1 px-4 py-2 sm:grid-cols-[80px_1fr]">
                    <span className="text-muted-foreground tabular">{format(im.row, { n: e.line })}</span>
                    <span className="font-mono text-xs break-words">{e.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
