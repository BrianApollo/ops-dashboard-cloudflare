/**
 * Read-time derivation of computed Airtable fields.
 *
 * Policy (validated by scripts/contract-test.mjs):
 *  - Fields the app READS and that must stay live after shim writes are
 *    DERIVED here: the Video Scripts upload counts + Calculation, the
 *    Script Content lookup on Videos/AI Videos, and every lastModifiedTime.
 *  - Every other computed field (Products count fields, Unused Videos,
 *    Identifier, RecordID, …) keeps the FROZEN value the mirror copied from
 *    Airtable. Their filter conditions live in Airtable field configs the
 *    metadata API does not expose, the app never reads them, and a frozen
 *    value diffs clean against Airtable while nothing changes.
 */

import type { ShimTable } from './schema';
import { resolveTable } from './schema';
import type { RequestStore, StoredRecord } from './store';

/** Airtable lookups of richText fields return a plain-text rendering:
 *  formatting markers (bold/italic/strikethrough/code) are stripped,
 *  backslash-escapes resolved, trailing newlines removed. Literal markdown
 *  characters are always escaped in Airtable's serialization, so unescaped
 *  ones are formatting by construction. */
function richTextToLookupText(v: string): string {
  const literals: string[] = [];
  return v
    .replace(/\\(.)/g, (_m, c: string) => {        // protect escaped chars by index
      literals.push(c);
      return `\u0000${literals.length - 1}\u0001`;
    })
    .replace(/[*_~`]/g, '')                        // strip formatting markers
    .replace(/\u0000(\d+)\u0001/g, (_m, i: string) => literals[Number(i)])
    .replace(/\n$/, ''); // exactly one: the serialization's trailing newline
}

async function lastMirror(store: RequestStore): Promise<string> {
  return (await store.getMetaValue('last_mirror')) ?? '';
}

/** table name → computed field names the shim derives live. */
const DERIVED: Record<string, Set<string>> = {
  'Video Scripts': new Set(['Scripts To Do', 'Scripts Past To Do', 'Calculation']),
  'Videos': new Set(['Script Content (from Script)']),
  'AI Videos': new Set(['Script Content (from Script)']),
};

/** Decorate one record's fields with live derived values. Returns a copy,
 *  memoized per cache generation (see store.ts GLOBAL) — derivation is pure
 *  within a generation, and every write clears the memos. */
export async function decorateRecord(
  store: RequestStore,
  table: ShimTable,
  rec: StoredRecord
): Promise<Record<string, unknown>> {
  const tableData = await store.getTable(table.name);
  const memo = tableData.decoratedById.get(rec.id);
  if (memo) return memo;
  const out: Record<string, unknown> = { ...rec.fields };
  const derived = DERIVED[table.name];

  for (const f of table.fields) {
    // lastModifiedTime is live — but Airtable omits it when its tracked
    // fields were never set. Mirror that: only serve a value when Airtable
    // had one, or when the record was written through the shim after the
    // mirror (updated_at moved past the mirrored seed).
    if (f.type === 'lastModifiedTime') {
      if (rec.fields[f.name] !== undefined || rec.updatedAt > (await lastMirror(store))) {
        out[f.name] = rec.updatedAt;
      } else {
        delete out[f.name];
      }
      continue;
    }
    if (!derived?.has(f.name)) continue;

    // Lookups: follow the link field on this record, collect the target field's values.
    if (f.type === 'multipleLookupValues' && f.viaLinkField && f.lookupField) {
      const ids = out[f.viaLinkField];
      if (!Array.isArray(ids) || ids.length === 0) { delete out[f.name]; continue; }
      const linkDef = table.fields.find((x) => x.name === f.viaLinkField);
      if (!linkDef?.linkedTable) continue;
      const targetTable = await resolveTable(store.db, linkDef.linkedTable);
      const sourceIsRichText = targetTable?.fields.find((x) => x.name === f.lookupField)?.type === 'richText';
      const target = await store.getTable(linkDef.linkedTable);
      const values: unknown[] = [];
      for (const id of ids as string[]) {
        const t = target.byId.get(id);
        if (!t) continue;
        let v = t.fields[f.lookupField];
        if (v === undefined || v === null || v === '') continue;
        if (typeof v === 'string' && sourceIsRichText) v = richTextToLookupText(v);
        if (Array.isArray(v)) values.push(...v);
        else values.push(v);
      }
      if (values.length) out[f.name] = values;
      else delete out[f.name];
    }
  }

  // Video Scripts upload counts + Calculation, derived from the linked Videos' Status.
  if (table.name === 'Video Scripts') {
    const ids = Array.isArray(out['Videos']) ? (out['Videos'] as string[]) : [];
    let todo = 0, past = 0;
    if (ids.length) {
      const videos = await store.getTable('Videos');
      for (const id of ids) {
        const v = videos.byId.get(id);
        if (!v) continue;
        const status = v.fields['Status'];
        if (status === 'To Do') todo++;
        else if (typeof status === 'string') past++;
      }
    }
    out['Scripts To Do'] = todo;
    out['Scripts Past To Do'] = past;
    const denom = todo + past;
    if (denom > 0) out['Calculation'] = past / denom;
    else delete out['Calculation']; // division by zero → Airtable omits the field
  }

  tableData.decoratedById.set(rec.id, out);
  return out;
}
