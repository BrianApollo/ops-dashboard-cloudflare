/**
 * Airtable-API-compatible shim over the D1 mirror store.
 *
 * Serves the exact REST dialect the app already speaks against
 * /api/airtable/[[path]] — same URLs, same request bodies, same response
 * shapes — so the frontend runs unchanged with DATA_BACKEND=d1.
 */

import type { D1Like, ShimTable } from './schema';
import { resolveTable } from './schema';
import {
  RequestStore,
  type StoredRecord,
  airtableError,
  deleteRecordStmt,
  mutationLogStmt,
  newRecId,
  runBatch,
  serializeFields,
  upsertRecordStmt,
  type PreparedWrite,
} from './store';
import { FormulaError, collectFieldNames, formulaMatches, parseFormula, type Node } from './formula';
import { decorateRecord } from './computed';
import { WriteError, normalizeWrite, queueDeleteDetach } from './links';

const PAGE_SIZE = 100;

export interface DialectOptions {
  /** false = return every matching row in one response (no offset pages). */
  paginate: boolean;
  /** Max records per batch write. Airtable dialect: 10. DB dialect: 200. */
  maxBatch: number;
  /** Allow the clean where[Field]=value filter params (DB dialect). */
  whereParams: boolean;
}

const AIRTABLE_DIALECT: DialectOptions = { paginate: true, maxBatch: 10, whereParams: false };

export async function handleShimRequest(
  db: D1Like,
  request: Request,
  pathSegments: string[],
  search: URLSearchParams,
  dialect: DialectOptions = AIRTABLE_DIALECT
): Promise<Response> {
  const store = new RequestStore(db);
  const tableRef = decodeURIComponent(pathSegments[0] || '');
  const recordId = pathSegments[1] ? decodeURIComponent(pathSegments[1]) : undefined;

  const table = await resolveTable(db, tableRef);
  if (!table) {
    return airtableError(404, 'TABLE_NOT_FOUND', `Could not find table ${tableRef}`);
  }

  try {
    switch (request.method) {
      case 'GET':
        return recordId
          ? await getSingle(store, table, recordId)
          : await getList(store, table, search, dialect);
      case 'POST':
        return await create(store, table, await request.json(), dialect);
      case 'PATCH':
        return await patch(store, table, recordId, await request.json(), dialect);
      case 'DELETE':
        return await remove(store, table, recordId, search, dialect);
      default:
        return airtableError(405, 'METHOD_NOT_ALLOWED', `Method ${request.method} not supported`);
    }
  } catch (err) {
    if (err instanceof WriteError) return airtableError(err.status, err.type, err.message);
    if (err instanceof FormulaError) {
      return airtableError(422, 'INVALID_FILTER_BY_FORMULA', `The formula for filtering records is invalid: ${err.message}`);
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// READS
// ─────────────────────────────────────────────────────────────

async function toApiRecord(store: RequestStore, table: ShimTable, rec: StoredRecord): Promise<{ id: string; createdTime: string; fields: Record<string, unknown> }> {
  const decorated = await decorateRecord(store, table, rec);
  return { id: rec.id, createdTime: rec.createdTime, fields: serializeFields(decorated) };
}

async function getSingle(store: RequestStore, table: ShimTable, recordId: string): Promise<Response> {
  const data = await store.getTable(table.name);
  const rec = data.byId.get(recordId);
  if (!rec) return airtableError(404, 'MODEL_ID_NOT_FOUND', `Record not found: ${recordId}`);
  return json(await toApiRecord(store, table, rec));
}

/** Build a display-name getter for formula/where evaluation over one table. */
async function buildFieldGetter(
  store: RequestStore,
  table: ShimTable,
  referenced: Set<string>
): Promise<(fields: Record<string, unknown>, name: string) => unknown> {
  const linkMaps = new Map<string, Map<string, string>>(); // field name → id → primary value
  for (const name of referenced) {
    const def = table.fields.find((f) => f.name === name);
    if (def?.type === 'multipleRecordLinks' && def.linkedTable) {
      const target = await store.getTable(def.linkedTable);
      const targetTable = await resolveTable(store.db, def.linkedTable);
      const primary = targetTable?.primaryField;
      const map = new Map<string, string>();
      for (const t of target.rows) {
        const v = primary ? t.fields[primary] : undefined;
        map.set(t.id, v === undefined || v === null ? t.id : String(v));
      }
      linkMaps.set(name, map);
    }
  }
  return (fields, name) => {
    const v = fields[name];
    const map = linkMaps.get(name);
    if (map && Array.isArray(v)) return (v as string[]).map((id) => map.get(id) ?? id);
    return v;
  };
}

/** DB-dialect filters: where[F]=v (equality), whereAny[F]=v1,v2, whereNotEmpty[F]=1.
 *  Same display-name semantics as the formula path. */
interface WhereCond { field: string; kind: 'eq' | 'any' | 'notEmpty'; values: string[] }

function parseWhereParams(search: URLSearchParams): WhereCond[] {
  const out: WhereCond[] = [];
  for (const [key, value] of search.entries()) {
    const m = key.match(/^(where|whereAny|whereNotEmpty)\[(.+)\]$/);
    if (!m) continue;
    if (m[1] === 'where') out.push({ field: m[2], kind: 'eq', values: [value] });
    else if (m[1] === 'whereAny') out.push({ field: m[2], kind: 'any', values: value.split(',') });
    else out.push({ field: m[2], kind: 'notEmpty', values: [] });
  }
  return out;
}

function toComparableText(v: unknown): string {
  if (v === undefined || v === null || v === false) return '';
  if (Array.isArray(v)) return v.map((x) => toComparableText(x)).join(', ');
  return String(v);
}

async function getList(
  store: RequestStore,
  table: ShimTable,
  search: URLSearchParams,
  dialect: DialectOptions
): Promise<Response> {
  const data = await store.getTable(table.name);

  const formulaSrc = search.get('filterByFormula');
  const conds = dialect.whereParams ? parseWhereParams(search) : [];

  let rows: { rec: StoredRecord; fields: Record<string, unknown> }[];

  if (!formulaSrc && conds.length) {
    // DB dialect: filter on RAW fields first (where-params only reference
    // stored fields), then derive computed fields for the survivors only.
    const get = await buildFieldGetter(store, table, new Set(conds.map((c) => c.field)));
    const survivors = data.rows.filter((rec) =>
      conds.every((c) => {
        const text = toComparableText(get(rec.fields, c.field)).toLowerCase();
        if (c.kind === 'notEmpty') return text !== '';
        return c.values.some((v) => v.toLowerCase() === text);
      })
    );
    rows = await Promise.all(
      survivors.map(async (rec) => ({ rec, fields: await decorateRecord(store, table, rec) }))
    );
  } else {
    // Legacy formula path (and unfiltered lists): decorate everything —
    // formulas may reference derived fields; decoration is memoized per
    // cache generation so this is cheap on warm instances.
    rows = await Promise.all(
      data.rows.map(async (rec) => ({ rec, fields: await decorateRecord(store, table, rec) }))
    );

    if (formulaSrc) {
      const ast: Node = parseFormula(formulaSrc);
      const get = await buildFieldGetter(store, table, collectFieldNames(ast));
      rows = rows.filter(({ fields }) => formulaMatches(ast, (name) => get(fields, name)));
    }
    if (conds.length) {
      const get = await buildFieldGetter(store, table, new Set(conds.map((c) => c.field)));
      rows = rows.filter(({ fields }) =>
        conds.every((c) => {
          const text = toComparableText(get(fields, c.field)).toLowerCase();
          if (c.kind === 'notEmpty') return text !== '';
          return c.values.some((v) => v.toLowerCase() === text);
        })
      );
    }
  }

  // sort[i][field] / sort[i][direction]
  const sorts: { field: string; dir: 1 | -1 }[] = [];
  for (let i = 0; ; i++) {
    const field = search.get(`sort[${i}][field]`);
    if (!field) break;
    sorts.push({ field, dir: search.get(`sort[${i}][direction]`) === 'desc' ? -1 : 1 });
  }
  if (sorts.length) {
    rows.sort((a, b) => {
      for (const { field, dir } of sorts) {
        const av = a.fields[field];
        const bv = b.fields[field];
        let c: number;
        if (typeof av === 'number' && typeof bv === 'number') c = av - bv;
        else {
          const as = av === undefined || av === null ? '' : String(Array.isArray(av) ? av.join(', ') : av);
          const bs = bv === undefined || bv === null ? '' : String(Array.isArray(bv) ? bv.join(', ') : bv);
          c = as.toLowerCase() < bs.toLowerCase() ? -1 : as.toLowerCase() > bs.toLowerCase() ? 1 : 0;
        }
        if (c !== 0) return c * dir;
      }
      return 0;
    });
  }

  // maxRecords caps the total; pageSize caps each page (Airtable dialect only —
  // the DB dialect returns everything in one response, that's the point of D1).
  const maxRecords = parseInt(search.get('maxRecords') || '', 10);
  if (!Number.isNaN(maxRecords)) rows = rows.slice(0, maxRecords);
  const pageSize = dialect.paginate
    ? Math.min(PAGE_SIZE, parseInt(search.get('pageSize') || '', 10) || PAGE_SIZE)
    : rows.length;

  const offset = parseInt(search.get('offset') || '0', 10) || 0;
  const page = rows.slice(offset, offset + pageSize);

  // fields[] projection
  const wanted = search.getAll('fields[]');
  const records = page.map(({ rec, fields }) => {
    let out = serializeFields(fields);
    if (wanted.length) {
      const picked: Record<string, unknown> = {};
      for (const w of wanted) if (w in out) picked[w] = out[w];
      out = picked;
    }
    return { id: rec.id, createdTime: rec.createdTime, fields: out };
  });

  const body: { records: unknown[]; offset?: string } = { records };
  if (dialect.paginate && offset + pageSize < rows.length) body.offset = String(offset + pageSize);
  return json(body);
}

// ─────────────────────────────────────────────────────────────
// WRITES
// ─────────────────────────────────────────────────────────────

interface WriteBody {
  fields?: Record<string, unknown>;
  records?: { id?: string; fields: Record<string, unknown> }[];
  typecast?: boolean; // accepted, no validation to relax in the mirror store
}

async function createOne(
  store: RequestStore,
  table: ShimTable,
  fields: Record<string, unknown>,
  writes: PreparedWrite[]
): Promise<StoredRecord> {
  const now = new Date().toISOString();
  const rec: StoredRecord = { id: newRecId(), fields: {}, createdTime: now, updatedAt: now };
  const { merged, foreignWrites } = await normalizeWrite(store, table, rec.id, {}, fields || {});
  rec.fields = merged;
  const data = await store.getTable(table.name);
  data.byId.set(rec.id, rec);
  data.rows.push(rec);
  writes.push(upsertRecordStmt(table, rec), ...foreignWrites, mutationLogStmt(table.name, 'create', rec.id, merged));
  return rec;
}

async function create(store: RequestStore, table: ShimTable, body: WriteBody, dialect: DialectOptions): Promise<Response> {
  const writes: PreparedWrite[] = [];
  if (body.records) {
    if (body.records.length > dialect.maxBatch) {
      return airtableError(422, 'INVALID_REQUEST_BODY', `You can only create up to ${dialect.maxBatch} records per request`);
    }
    const created: StoredRecord[] = [];
    for (const r of body.records) created.push(await createOne(store, table, r.fields, writes));
    await runBatch(store.db, writes);
  store.markWritten();
    return json({ records: await Promise.all(created.map((r) => toApiRecord(store, table, r))) });
  }
  const rec = await createOne(store, table, body.fields || {}, writes);
  await runBatch(store.db, writes);
  store.markWritten();
  return json(await toApiRecord(store, table, rec));
}

async function patchOne(
  store: RequestStore,
  table: ShimTable,
  id: string,
  fields: Record<string, unknown>,
  writes: PreparedWrite[]
): Promise<StoredRecord> {
  const data = await store.getTable(table.name);
  const rec = data.byId.get(id);
  if (!rec) throw new WriteError(404, 'MODEL_ID_NOT_FOUND', `Record not found: ${id}`);
  const { merged, foreignWrites } = await normalizeWrite(store, table, id, rec.fields, fields || {});
  rec.fields = merged;
  rec.updatedAt = new Date().toISOString();
  writes.push(upsertRecordStmt(table, rec), ...foreignWrites, mutationLogStmt(table.name, 'update', id, fields));
  return rec;
}

async function patch(store: RequestStore, table: ShimTable, recordId: string | undefined, body: WriteBody, dialect: DialectOptions): Promise<Response> {
  const writes: PreparedWrite[] = [];
  if (recordId) {
    const rec = await patchOne(store, table, recordId, body.fields || {}, writes);
    await runBatch(store.db, writes);
  store.markWritten();
    return json(await toApiRecord(store, table, rec));
  }
  const records = body.records || [];
  if (records.length > dialect.maxBatch) {
    return airtableError(422, 'INVALID_REQUEST_BODY', `You can only update up to ${dialect.maxBatch} records per request`);
  }
  const updated: StoredRecord[] = [];
  for (const r of records) {
    if (!r.id) return airtableError(422, 'INVALID_REQUEST_BODY', 'Each record in a batch update needs an id');
    updated.push(await patchOne(store, table, r.id, r.fields, writes));
  }
  await runBatch(store.db, writes);
  store.markWritten();
  return json({ records: await Promise.all(updated.map((r) => toApiRecord(store, table, r))) });
}

async function removeOne(store: RequestStore, table: ShimTable, id: string, writes: PreparedWrite[]): Promise<void> {
  const data = await store.getTable(table.name);
  const rec = data.byId.get(id);
  if (!rec) throw new WriteError(404, 'MODEL_ID_NOT_FOUND', `Record not found: ${id}`);
  await queueDeleteDetach(store, table, rec, writes);
  data.byId.delete(id);
  const idx = data.rows.findIndex((r) => r.id === id);
  if (idx >= 0) data.rows.splice(idx, 1);
  writes.push(deleteRecordStmt(table, id), mutationLogStmt(table.name, 'delete', id, rec.fields));
}

async function remove(store: RequestStore, table: ShimTable, recordId: string | undefined, search: URLSearchParams, dialect: DialectOptions): Promise<Response> {
  const writes: PreparedWrite[] = [];
  if (recordId) {
    await removeOne(store, table, recordId, writes);
    await runBatch(store.db, writes);
  store.markWritten();
    return json({ deleted: true, id: recordId });
  }
  const ids = search.getAll('records[]');
  if (ids.length === 0) return airtableError(422, 'INVALID_REQUEST_BODY', 'No record ids given');
  if (ids.length > dialect.maxBatch) {
    return airtableError(422, 'INVALID_REQUEST_BODY', `You can only delete up to ${dialect.maxBatch} records per request`);
  }
  for (const id of ids) await removeOne(store, table, id, writes);
  await runBatch(store.db, writes);
  store.markWritten();
  return json({ records: ids.map((id) => ({ deleted: true, id })) });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
