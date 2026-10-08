/**
 * Field↔column mapping for the physical per-table D1 schema.
 *
 * THE single source of truth for how Airtable-named fields map onto real
 * SQL tables/columns — imported by the API store (TS), the mirror script,
 * the sync worker, the seed script, and the DDL generator. Plain .mjs so
 * both Node scripts and the Workers bundler can import it.
 *
 * Layout per table:
 *   "<snake_case table>" (
 *     id            TEXT PRIMARY KEY,   -- Airtable rec… id
 *     _created_time TEXT NOT NULL,
 *     _updated_at   TEXT NOT NULL,
 *     <one column per field>
 *   )
 *
 * Column typing by Airtable field type:
 *   number/currency/percent/duration/rating → REAL
 *   checkbox                                → INTEGER (1 = true, NULL = unchecked)
 *   links/attachments/lookups/multi-selects → TEXT holding JSON
 *   computed scalars (formula/count/rollup…) → TEXT holding JSON (value shape varies)
 *   button                                   → no column (never has a value)
 *   everything else                          → TEXT
 */

const RESERVED = new Set(['id', '_created_time', '_updated_at']);

const JSON_TYPES = new Set([
  'multipleRecordLinks', 'multipleAttachments', 'multipleLookupValues',
  'multipleSelects', 'multipleCollaborators',
]);
// button included: Airtable serves buttons as {label, url} objects.
const COMPUTED_JSON_TYPES = new Set(['formula', 'rollup', 'count', 'autoNumber', 'button']);
const NUMBER_TYPES = new Set(['number', 'currency', 'percent', 'duration', 'rating']);
const SKIP_TYPES = new Set([]);

export function sanitizeIdentifier(name) {
  let s = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_');
  if (!s) s = 'field';
  if (/^[0-9]/.test(s)) s = 'f_' + s;
  return s;
}

export function sqlTableName(airtableName) {
  return sanitizeIdentifier(airtableName);
}

/** Build the column plan for one slim-schema table: ordered list of
 *  {field, column, type, kind} where kind ∈ scalar|number|checkbox|json|skip. */
export function columnPlan(slimTable) {
  const used = new Set(RESERVED);
  const plan = [];
  for (const f of slimTable.fields) {
    if (SKIP_TYPES.has(f.type)) continue;
    let col = sanitizeIdentifier(f.name);
    let n = 2;
    while (used.has(col)) col = `${sanitizeIdentifier(f.name)}_${n++}`;
    used.add(col);
    let kind;
    if (JSON_TYPES.has(f.type)) kind = 'json';
    else if (f.type === 'lastModifiedTime' || f.type === 'createdTime') kind = 'scalar';
    else if (COMPUTED_JSON_TYPES.has(f.type)) kind = 'computed';
    else if (NUMBER_TYPES.has(f.type)) kind = 'number';
    else if (f.type === 'checkbox') kind = 'checkbox';
    else kind = 'scalar';
    plan.push({ field: f.name, column: col, type: f.type, kind });
  }
  return plan;
}

export function createTableSql(slimTable) {
  const cols = columnPlan(slimTable).map((c) => {
    const sqlType = c.kind === 'number' ? 'REAL' : c.kind === 'checkbox' ? 'INTEGER' : 'TEXT';
    return `  "${c.column}" ${sqlType}`;
  });
  return [
    `CREATE TABLE IF NOT EXISTS "${sqlTableName(slimTable.name)}" (`,
    `  id TEXT PRIMARY KEY,`,
    `  _created_time TEXT NOT NULL,`,
    `  _updated_at TEXT NOT NULL${cols.length ? ',' : ''}`,
    cols.join(',\n'),
    `);`,
  ].join('\n');
}

/** fields object (Airtable names) → {columns, values} for INSERT OR REPLACE. */
export function encodeRow(slimTable, rec) {
  const columns = ['id', '_created_time', '_updated_at'];
  const values = [rec.id, rec.createdTime, rec.updatedAt];
  for (const c of columnPlan(slimTable)) {
    columns.push(c.column);
    const v = rec.fields[c.field];
    if (v === undefined || v === null) { values.push(null); continue; }
    switch (c.kind) {
      case 'json':
      case 'computed':
        values.push(JSON.stringify(v));
        break;
      case 'checkbox':
        values.push(v ? 1 : null);
        break;
      case 'number':
        values.push(typeof v === 'number' ? v : Number(v));
        break;
      default:
        values.push(typeof v === 'string' ? v : JSON.stringify(v));
    }
  }
  return { columns, values };
}

export function upsertSql(slimTable) {
  const cols = ['id', '_created_time', '_updated_at', ...columnPlan(slimTable).map((c) => c.column)];
  return `INSERT OR REPLACE INTO "${sqlTableName(slimTable.name)}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
}

/** SQL row → {id, fields (Airtable names), createdTime, updatedAt}. */
export function decodeRow(slimTable, row) {
  const fields = {};
  for (const c of columnPlan(slimTable)) {
    const v = row[c.column];
    if (v === undefined || v === null) continue;
    switch (c.kind) {
      case 'json':
      case 'computed':
        try { fields[c.field] = JSON.parse(v); } catch { fields[c.field] = v; }
        break;
      case 'checkbox':
        if (v) fields[c.field] = true;
        break;
      default:
        fields[c.field] = v;
    }
  }
  return {
    id: row.id,
    fields,
    createdTime: row._created_time,
    updatedAt: row._updated_at,
  };
}

/** Slim schema from the Airtable metadata API response (shared builder). */
export function buildSlimSchema(metaTables) {
  const COMPUTED_TYPES = new Set(['formula', 'rollup', 'count', 'multipleLookupValues', 'lastModifiedTime', 'createdTime', 'button', 'autoNumber']);
  const tableById = {};
  const fieldById = {};
  for (const t of metaTables) {
    tableById[t.id] = t;
    for (const f of t.fields) fieldById[f.id] = { table: t, field: f };
  }
  return {
    tables: metaTables.map((t) => ({
      id: t.id,
      name: t.name,
      primaryField: t.fields.find((f) => f.id === t.primaryFieldId)?.name,
      fields: t.fields.map((f) => {
        const out = { name: f.name, type: f.type };
        if (f.type === 'multipleRecordLinks') {
          out.linkedTable = tableById[f.options?.linkedTableId]?.name;
          const inv = f.options?.inverseLinkFieldId ? fieldById[f.options.inverseLinkFieldId] : null;
          if (inv) out.inverseField = inv.field.name;
        }
        if (COMPUTED_TYPES.has(f.type)) out.computed = true;
        if (f.type === 'multipleLookupValues' || f.type === 'count' || f.type === 'rollup') {
          const rl = f.options?.recordLinkFieldId ? fieldById[f.options.recordLinkFieldId]?.field.name : undefined;
          const ff = f.options?.fieldIdInLinkedTable ? fieldById[f.options.fieldIdInLinkedTable]?.field.name : undefined;
          if (rl) out.viaLinkField = rl;
          if (ff) out.lookupField = ff;
        }
        return out;
      }),
    })),
  };
}
