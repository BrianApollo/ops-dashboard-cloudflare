/**
 * Shim schema: the slim Airtable base schema stored in D1 `meta.schema`
 * by scripts/mirror-airtable-to-d1.mjs. Loaded once per isolate.
 */

export interface ShimField {
  name: string;
  type: string;
  computed?: boolean;
  linkedTable?: string;    // multipleRecordLinks: target table NAME
  inverseField?: string;   // multipleRecordLinks: field NAME on the target table
  viaLinkField?: string;   // lookup/count/rollup: the link field on THIS table it follows
  lookupField?: string;    // lookup: the field NAME in the linked table
}

export interface ShimTable {
  id: string;
  name: string;
  primaryField: string;
  fields: ShimField[];
}

export interface ShimSchema {
  tables: ShimTable[];
}

export interface D1Like {
  prepare(sql: string): {
    bind(...args: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }>; run(): Promise<unknown>; first(): Promise<Record<string, unknown> | null> };
    all(): Promise<{ results: Record<string, unknown>[] }>;
    run(): Promise<unknown>;
    first(): Promise<Record<string, unknown> | null>;
  };
  batch(stmts: unknown[]): Promise<unknown>;
}

let cached: ShimSchema | null = null;
let byNameOrId: Map<string, ShimTable> | null = null;

export async function loadSchema(db: D1Like): Promise<ShimSchema> {
  if (cached) return cached;
  const row = await db.prepare(`SELECT value FROM meta WHERE key='schema'`).first();
  if (!row) throw new Error('Shim schema missing — run scripts/mirror-airtable-to-d1.mjs');
  cached = JSON.parse(row.value as string) as ShimSchema;
  byNameOrId = new Map();
  for (const t of cached.tables) {
    byNameOrId.set(t.name, t);
    byNameOrId.set(t.id, t);
  }
  return cached;
}

/** Resolve a table by name or tbl-id (the app uses both). */
export async function resolveTable(db: D1Like, nameOrId: string): Promise<ShimTable | undefined> {
  await loadSchema(db);
  return byNameOrId!.get(nameOrId);
}

export function fieldDef(table: ShimTable, fieldName: string): ShimField | undefined {
  return table.fields.find((f) => f.name === fieldName);
}
