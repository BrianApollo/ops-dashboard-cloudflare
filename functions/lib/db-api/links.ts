/**
 * Write-side semantics Airtable provides implicitly:
 *  - inverse link maintenance (writing one side of a link updates the other)
 *  - attachment merge (entries with only {id} keep existing; {url, filename} add)
 *  - 422 on computed/unknown fields and on linking nonexistent records
 */

import type { ShimField, ShimTable } from './schema';
import { fieldDef, resolveTable } from './schema';
import type { PreparedWrite, RequestStore, StoredRecord } from './store';
import { isEmptyValue, newAttId, upsertRecordStmt } from './store';

export class WriteError extends Error {
  constructor(public status: number, public type: string, message: string) {
    super(message);
  }
}

interface NormalizedWrite {
  /** Final merged fields for the record being written. */
  merged: Record<string, unknown>;
  /** Statements updating OTHER records' inverse link arrays. */
  foreignWrites: PreparedWrite[];
}

/**
 * Validate + normalize a PATCH/POST `fields` payload against one record,
 * producing the merged fields and the inverse-link updates it implies.
 */
export async function normalizeWrite(
  store: RequestStore,
  table: ShimTable,
  recId: string,
  existing: Record<string, unknown>,
  payload: Record<string, unknown>
): Promise<NormalizedWrite> {
  const merged: Record<string, unknown> = { ...existing };
  const foreignWrites: PreparedWrite[] = [];

  for (const [name, rawValue] of Object.entries(payload)) {
    const def = fieldDef(table, name);
    if (!def) {
      throw new WriteError(422, 'UNKNOWN_FIELD_NAME', `Unknown field name: "${name}"`);
    }
    if (def.computed) {
      throw new WriteError(422, 'INVALID_VALUE_FOR_COLUMN', `Field "${name}" cannot accept a value because the field is computed`);
    }

    if (def.type === 'multipleAttachments') {
      merged[name] = mergeAttachments(existing[name], rawValue, name);
      continue;
    }

    if (def.type === 'multipleRecordLinks') {
      const newIds = await normalizeLinkValue(store, def, name, rawValue);
      const oldIds = Array.isArray(existing[name]) ? (existing[name] as string[]) : [];
      await queueInverseUpdates(store, def, recId, oldIds, newIds, foreignWrites);
      if (newIds.length) merged[name] = newIds;
      else delete merged[name];
      continue;
    }

    if (isEmptyValue(rawValue)) delete merged[name];
    else merged[name] = rawValue;
  }

  return { merged, foreignWrites };
}

/** On delete, detach this record from every linked record's inverse field. */
export async function queueDeleteDetach(
  store: RequestStore,
  table: ShimTable,
  rec: StoredRecord,
  foreignWrites: PreparedWrite[]
): Promise<void> {
  for (const def of table.fields) {
    if (def.type !== 'multipleRecordLinks') continue;
    const ids = rec.fields[def.name];
    if (!Array.isArray(ids) || ids.length === 0) continue;
    await queueInverseUpdates(store, def, rec.id, ids as string[], [], foreignWrites);
  }
}

// ─────────────────────────────────────────────────────────────
// INTERNALS
// ─────────────────────────────────────────────────────────────

async function normalizeLinkValue(
  store: RequestStore,
  def: ShimField,
  name: string,
  rawValue: unknown
): Promise<string[]> {
  if (isEmptyValue(rawValue)) return [];
  if (!Array.isArray(rawValue)) {
    throw new WriteError(422, 'INVALID_VALUE_FOR_COLUMN', `Field "${name}" expects an array of record IDs`);
  }
  const ids = rawValue.map((v) => {
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string') return (v as { id: string }).id;
    throw new WriteError(422, 'INVALID_VALUE_FOR_COLUMN', `Field "${name}" expects record IDs`);
  });
  if (def.linkedTable) {
    const target = await store.getTable(def.linkedTable);
    for (const id of ids) {
      if (!target.byId.has(id)) {
        throw new WriteError(422, 'INVALID_RECORD_ID', `Record ID ${id} does not exist in table "${def.linkedTable}"`);
      }
    }
  }
  return [...new Set(ids)];
}

async function queueInverseUpdates(
  store: RequestStore,
  def: ShimField,
  recId: string,
  oldIds: string[],
  newIds: string[],
  foreignWrites: PreparedWrite[]
): Promise<void> {
  if (!def.linkedTable || !def.inverseField) return;
  const added = newIds.filter((id) => !oldIds.includes(id));
  const removed = oldIds.filter((id) => !newIds.includes(id));
  if (added.length === 0 && removed.length === 0) return;

  const linkedShim = await resolveTable(store.db, def.linkedTable);
  if (!linkedShim) return;
  const target = await store.getTable(def.linkedTable);
  for (const id of added) {
    const t = target.byId.get(id);
    if (!t) continue;
    const arr = Array.isArray(t.fields[def.inverseField]) ? [...(t.fields[def.inverseField] as string[])] : [];
    if (!arr.includes(recId)) arr.push(recId);
    t.fields[def.inverseField] = arr; // keep the in-request cache consistent
    foreignWrites.push(upsertRecordStmt(linkedShim, { ...t, updatedAt: new Date().toISOString() }));
  }
  for (const id of removed) {
    const t = target.byId.get(id);
    if (!t) continue;
    const arr = Array.isArray(t.fields[def.inverseField]) ? (t.fields[def.inverseField] as string[]).filter((x) => x !== recId) : [];
    if (arr.length) t.fields[def.inverseField] = arr;
    else delete t.fields[def.inverseField];
    foreignWrites.push(upsertRecordStmt(linkedShim, { ...t, updatedAt: new Date().toISOString() }));
  }
}

interface AttachmentEntry {
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  type?: string;
}

function mergeAttachments(existingValue: unknown, rawValue: unknown, name: string): AttachmentEntry[] | undefined {
  if (isEmptyValue(rawValue)) return undefined;
  if (!Array.isArray(rawValue)) {
    throw new WriteError(422, 'INVALID_ATTACHMENT_OBJECT', `Field "${name}" expects an array of attachment objects`);
  }
  const existing = Array.isArray(existingValue) ? (existingValue as AttachmentEntry[]) : [];
  const byId = new Map(existing.map((a) => [a.id, a]));
  const out: AttachmentEntry[] = [];
  for (const entry of rawValue as AttachmentEntry[]) {
    if (entry && entry.id && byId.has(entry.id)) {
      out.push(byId.get(entry.id)!); // keep the stored entry untouched
      continue;
    }
    if (entry && typeof entry.url === 'string') {
      out.push({
        id: newAttId(),
        url: entry.url,
        filename: entry.filename ?? entry.url.split('/').pop() ?? 'file',
        ...(entry.size !== undefined ? { size: entry.size } : {}),
        ...(entry.type !== undefined ? { type: entry.type } : {}),
      });
      continue;
    }
    throw new WriteError(422, 'INVALID_ATTACHMENT_OBJECT', `Field "${name}": attachment entries need an existing id or a url`);
  }
  return out.length ? out : undefined;
}
