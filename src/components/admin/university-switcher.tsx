"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { useI18n } from "@/lib/i18n/client";

/** Switches the university the catalog pages operate on (?u=slug). */
export function UniversitySwitcher({ universities, current }: { universities: { slug: string; short_name: string }[]; current: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (universities.length < 2) return null;
  return (
    <NativeSelect
      aria-label={t.common.university}
      value={current}
      className="w-48"
      onChange={(event) => {
        const params = new URLSearchParams(searchParams);
        params.set("u", event.target.value);
        params.delete("page");
        router.push(`${pathname}?${params}`);
      }}
    >
      {universities.map((u) => (
        <option key={u.slug} value={u.slug}>
          {u.short_name}
        </option>
      ))}
    </NativeSelect>
  );
}
