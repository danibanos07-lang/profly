/**
 * Generates src/lib/supabase/database.types.ts from a live PostgreSQL schema,
 * in the same shape as `supabase gen types typescript`.
 *
 * Usage: DATABASE_URL=postgres://... npx tsx scripts/gen-db-types.ts
 *
 * With the Supabase CLI available you can use
 * `supabase gen types typescript --local > src/lib/supabase/database.types.ts`
 * instead; both produce compatible output.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

const SCHEMA = "public";

type Column = {
  table: string;
  kind: string;
  name: string;
  type: string;
  elemType: string | null;
  notNull: boolean;
  hasDefault: boolean;
  generated: boolean;
  identity: boolean;
  position: number;
};

const scalarMap: Record<string, string> = {
  uuid: "string",
  text: "string",
  varchar: "string",
  bpchar: "string",
  citext: "string",
  date: "string",
  time: "string",
  timetz: "string",
  timestamp: "string",
  timestamptz: "string",
  interval: "string",
  int2: "number",
  int4: "number",
  int8: "number",
  float4: "number",
  float8: "number",
  numeric: "number",
  bool: "boolean",
  json: "Json",
  jsonb: "Json",
  void: "undefined",
};

function tsType(type: string, elemType: string | null, enums: Set<string>): string {
  if (type.startsWith("_") && elemType) return `${tsType(elemType, null, enums)}[]`;
  if (enums.has(type)) return `Database["public"]["Enums"]["${type}"]`;
  return scalarMap[type] ?? "unknown";
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const enumRows = (
    await client.query<{ name: string; values: string[] }>(
      `select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder)::text[] as values
       from pg_type t join pg_enum e on e.enumtypid = t.oid
       join pg_namespace n on n.oid = t.typnamespace
       where n.nspname = $1 group by t.typname order by t.typname`,
      [SCHEMA],
    )
  ).rows;
  const enums = new Set(enumRows.map((e) => e.name));

  const columns = (
    await client.query<Column>(
      `select c.relname as table, c.relkind as kind, a.attname as name, t.typname as type,
              et.typname as "elemType", a.attnotnull as "notNull", a.atthasdef as "hasDefault",
              a.attgenerated <> '' as generated, a.attidentity <> '' as identity, a.attnum as position
       from pg_attribute a
       join pg_class c on c.oid = a.attrelid
       join pg_namespace n on n.oid = c.relnamespace
       join pg_type t on t.oid = a.atttypid
       left join pg_type et on et.oid = t.typelem and t.typcategory = 'A'
       where n.nspname = $1 and c.relkind in ('r', 'v') and a.attnum > 0 and not a.attisdropped
       order by c.relname, a.attnum`,
      [SCHEMA],
    )
  ).rows;

  const fks = (
    await client.query<{
      name: string;
      table: string;
      columns: string[];
      ref: string;
      refColumns: string[];
      oneToOne: boolean;
    }>(
      `select con.conname as name, c.relname as table,
              array(select attname from pg_attribute where attrelid = con.conrelid and attnum = any(con.conkey) order by attnum)::text[] as columns,
              rc.relname as ref,
              array(select attname from pg_attribute where attrelid = con.confrelid and attnum = any(con.confkey) order by attnum)::text[] as "refColumns",
              exists (
                select 1 from pg_index i where i.indrelid = con.conrelid and i.indisunique
                and (select array_agg(k order by k) from unnest(i.indkey::int2[]) k) = (select array_agg(k order by k) from unnest(con.conkey) k)
              ) as "oneToOne"
       from pg_constraint con
       join pg_class c on c.oid = con.conrelid
       join pg_class rc on rc.oid = con.confrelid
       join pg_namespace n on n.oid = c.relnamespace
       join pg_namespace rn on rn.oid = rc.relnamespace
       where con.contype = 'f' and n.nspname = $1 and rn.nspname = $1
       order by c.relname, con.conname`,
      [SCHEMA],
    )
  ).rows;

  const functions = (
    await client.query<{
      name: string;
      argNames: string[] | null;
      argTypes: string[];
      argModes: string[] | null;
      numDefaults: number;
      retType: string;
      retElem: string | null;
      retTypeRelation: string | null;
      retSet: boolean;
      tableCols: { name: string; type: string; elem: string | null }[] | null;
    }>(
      `select p.proname as name, p.proargnames as "argNames",
              array(select t.typname from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[])) with ordinality a(oid, i)
                    join pg_type t on t.oid = a.oid order by a.i)::text[] as "argTypes",
              p.proargmodes::text[] as "argModes", p.pronargdefaults as "numDefaults",
              rt.typname as "retType", ret.typname as "retElem", rr.relname as "retTypeRelation", p.proretset as "retSet",
              null as "tableCols"
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       join pg_type rt on rt.oid = p.prorettype
       left join pg_type ret on ret.oid = rt.typelem and rt.typcategory = 'A'
       left join pg_class rr on rr.oid = rt.typrelid and rr.relkind in ('r', 'v')
       where n.nspname = $1 and p.prokind = 'f' and rt.typname <> 'trigger'
         and has_function_privilege('authenticated', p.oid, 'execute')
       order by p.proname`,
      [SCHEMA],
    )
  ).rows;

  await client.end();

  const byRelation = new Map<string, Column[]>();
  for (const col of columns) {
    const list = byRelation.get(col.table) ?? [];
    list.push(col);
    byRelation.set(col.table, list);
  }

  const relationships = (table: string) =>
    fks
      .filter((fk) => fk.table === table)
      .map(
        (fk) => `          {
            foreignKeyName: "${fk.name}"
            columns: ${JSON.stringify(fk.columns)}
            isOneToOne: ${fk.oneToOne}
            referencedRelation: "${fk.ref}"
            referencedColumns: ${JSON.stringify(fk.refColumns)}
          },`,
      )
      .join("\n");

  const tables: string[] = [];
  const views: string[] = [];
  for (const [name, cols] of [...byRelation.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const isView = cols[0].kind === "v";
    const rowLines = cols
      .map((c) => {
        const base = tsType(c.type, c.elemType, enums);
        const nullable = isView || !c.notNull;
        return `          ${c.name}: ${base}${nullable ? " | null" : ""}`;
      })
      .join("\n");
    if (isView) {
      views.push(`      ${name}: {
        Row: {
${rowLines}
        }
        Relationships: []
      }`);
      continue;
    }
    const insertLines = cols
      .map((c) => {
        const base = tsType(c.type, c.elemType, enums);
        if (c.generated || c.identity) return `          ${c.name}?: never`;
        const optional = !c.notNull || c.hasDefault;
        return `          ${c.name}${optional ? "?" : ""}: ${base}${c.notNull ? "" : " | null"}`;
      })
      .join("\n");
    const updateLines = cols
      .map((c) => {
        const base = tsType(c.type, c.elemType, enums);
        if (c.generated || c.identity) return `          ${c.name}?: never`;
        return `          ${c.name}?: ${base}${c.notNull ? "" : " | null"}`;
      })
      .join("\n");
    const rels = relationships(name);
    tables.push(`      ${name}: {
        Row: {
${rowLines}
        }
        Insert: {
${insertLines}
        }
        Update: {
${updateLines}
        }
        Relationships: [
${rels}
        ]
      }`);
  }

  const fnLines = functions.map((fn) => {
    const modes = fn.argModes ?? fn.argTypes.map(() => "i");
    const names = fn.argNames ?? [];
    const inArgs: string[] = [];
    const outCols: string[] = [];
    const inputCount = modes.filter((m) => m === "i" || m === "b").length;
    let inputIndex = 0;
    fn.argTypes.forEach((type, i) => {
      const mode = modes[i];
      const name = names[i] ?? `arg${i}`;
      const isArray = type.startsWith("_");
      const ts = tsType(type, isArray ? type.slice(1) : null, enums);
      if (mode === "i" || mode === "b") {
        const optional = inputIndex >= inputCount - fn.numDefaults;
        inArgs.push(`          ${name}${optional ? "?" : ""}: ${ts}`);
        inputIndex++;
      }
      if (mode === "t" || mode === "o" || mode === "b") outCols.push(`            ${name}: ${ts}`);
    });
    let returns: string;
    let setof = "";
    if (outCols.length) {
      returns = `{\n${outCols.join("\n")}\n          }[]`;
    } else if (fn.retTypeRelation) {
      const kind = byRelation.get(fn.retTypeRelation)?.[0].kind === "v" ? "Views" : "Tables";
      returns = `Database["public"]["${kind}"]["${fn.retTypeRelation}"]["Row"]${fn.retSet ? "[]" : ""}`;
      setof = `
        SetofOptions: {
          from: "*"
          to: "${fn.retTypeRelation}"
          isOneToOne: ${!fn.retSet}
          isSetofReturn: ${fn.retSet}
        }`;
    } else {
      returns = tsType(fn.retType, fn.retElem, enums) + (fn.retSet ? "[]" : "");
    }
    const args = inArgs.length ? `{\n${inArgs.join("\n")}\n        }` : "never";
    return `      ${fn.name}: {
        Args: ${args}
        Returns: ${returns}${setof}
      }`;
  });

  const enumLines = enumRows.map((e) => `      ${e.name}: ${e.values.map((v) => JSON.stringify(v)).join(" | ")}`);
  const enumConsts = enumRows.map((e) => `      ${e.name}: ${JSON.stringify(e.values)},`);

  const out = `// Generated by scripts/gen-db-types.ts — do not edit by hand.
// Regenerate with \`npm run db:types\` after changing migrations.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12"
  }
  public: {
    Tables: {
${tables.join("\n")}
    }
    Views: {
${views.join("\n")}
    }
    Functions: {
${fnLines.join("\n")}
    }
    Enums: {
${enumLines.join("\n")}
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
${enumConsts.join("\n")}
    },
  },
} as const
`;

  const target = resolve(process.cwd(), "src/lib/supabase/database.types.ts");
  writeFileSync(target, out);
  console.log(`Wrote ${target}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
