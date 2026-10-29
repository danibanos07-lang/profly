import { describe, expect, it } from "vitest";
import es from "./dictionaries/es";
import en from "./dictionaries/en";

type Tree = { [key: string]: unknown };

function leaves(tree: unknown, prefix = ""): [string, unknown][] {
  if (tree && typeof tree === "object" && !Array.isArray(tree)) {
    return Object.entries(tree as Tree).flatMap(([key, value]) => leaves(value, prefix ? `${prefix}.${key}` : key));
  }
  return [[prefix, tree]];
}

const placeholders = (value: unknown) => (typeof value === "string" ? [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort() : []);

describe("dictionaries", () => {
  const esLeaves = new Map(leaves(es));
  const enLeaves = new Map(leaves(en));

  it("have the same keys in Spanish and English", () => {
    expect([...enLeaves.keys()].sort()).toEqual([...esLeaves.keys()].sort());
  });

  it("have no empty strings", () => {
    const empty = [...esLeaves, ...enLeaves].filter(([, v]) => v === "");
    expect(empty).toEqual([]);
  });

  it("use the same placeholders in both languages", () => {
    const mismatched = [...esLeaves.entries()].filter(([key, value]) => placeholders(value).join() !== placeholders(enLeaves.get(key)).join());
    expect(mismatched.map(([key]) => key)).toEqual([]);
  });
});
