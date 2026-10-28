import type { DbErrorKey } from "@/lib/moderation";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: DbErrorKey | "notConfigured" | "needsConfirmation" | "banned"; fields?: Record<string, string> };
