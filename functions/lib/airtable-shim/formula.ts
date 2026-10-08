/**
 * Minimal filterByFormula evaluator — supports exactly the patterns the app
 * and the scheduled-executor send (audited 2026-10-08):
 *
 *   {Field} = 'value'        (incl. linked fields coerced to display names)
 *   {Field} != ''            AND(...) / OR(...) / NOT(...)
 *   FIND(needle, hay)        ARRAYJOIN({Field})
 *   IS_BEFORE(a, b)          IS_AFTER(a, b)
 *   DATEADD('date', n, 'days')
 *   TRUE() / FALSE(), string/number literals, parentheses
 *
 * Anything else throws FormulaError → the shim returns 422
 * INVALID_FILTER_BY_FORMULA, same as Airtable does for invalid formulas —
 * unsupported usage fails loudly instead of silently returning wrong rows.
 */

export class FormulaError extends Error {}

// ─────────────────────────────────────────────────────────────
// AST
// ─────────────────────────────────────────────────────────────
export type Node =
  | { kind: 'str'; value: string }
  | { kind: 'num'; value: number }
  | { kind: 'field'; name: string }
  | { kind: 'cmp'; op: '=' | '!=' | '<' | '>' | '<=' | '>='; left: Node; right: Node }
  | { kind: 'call'; name: string; args: Node[] };

// ─────────────────────────────────────────────────────────────
// TOKENIZER
// ─────────────────────────────────────────────────────────────
interface Token { t: string; v: string }

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '{') {
      const end = src.indexOf('}', i);
      if (end < 0) throw new FormulaError('Unterminated field reference');
      tokens.push({ t: 'field', v: src.slice(i + 1, end) });
      i = end + 1; continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1, out = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\' && src[j + 1] === c) { out += c; j += 2; continue; }
        out += src[j]; j++;
      }
      if (j >= src.length) throw new FormulaError('Unterminated string');
      tokens.push({ t: 'str', v: out });
      i = j + 1; continue;
    }
    if (/[0-9]/.test(c) || (c === '-' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ t: 'num', v: src.slice(i, j) });
      i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      tokens.push({ t: 'ident', v: src.slice(i, j) });
      i = j; continue;
    }
    if (c === '!' && src[i + 1] === '=') { tokens.push({ t: 'op', v: '!=' }); i += 2; continue; }
    if ((c === '<' || c === '>') && src[i + 1] === '=') { tokens.push({ t: 'op', v: c + '=' }); i += 2; continue; }
    if (c === '=' || c === '<' || c === '>') { tokens.push({ t: 'op', v: c }); i++; continue; }
    if (c === '(' || c === ')' || c === ',') { tokens.push({ t: c, v: c }); i++; continue; }
    throw new FormulaError(`Unexpected character "${c}" in formula`);
  }
  return tokens;
}

// ─────────────────────────────────────────────────────────────
// PARSER (recursive descent)
// ─────────────────────────────────────────────────────────────
export function parseFormula(src: string): Node {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const expect = (t: string) => {
    const tok = next();
    if (!tok || tok.t !== t) throw new FormulaError(`Expected ${t}`);
    return tok;
  };

  function parseValue(): Node {
    const tok = next();
    if (!tok) throw new FormulaError('Unexpected end of formula');
    if (tok.t === 'str') return { kind: 'str', value: tok.v };
    if (tok.t === 'num') return { kind: 'num', value: parseFloat(tok.v) };
    if (tok.t === 'field') return { kind: 'field', name: tok.v };
    if (tok.t === '(') {
      const inner = parseExpr();
      expect(')');
      return inner;
    }
    if (tok.t === 'ident') {
      const name = tok.v.toUpperCase();
      expect('(');
      const args: Node[] = [];
      if (peek() && peek().t !== ')') {
        args.push(parseExpr());
        while (peek() && peek().t === ',') { next(); args.push(parseExpr()); }
      }
      expect(')');
      return { kind: 'call', name, args };
    }
    throw new FormulaError(`Unexpected token "${tok.v}"`);
  }

  function parseExpr(): Node {
    const left = parseValue();
    const tok = peek();
    if (tok && tok.t === 'op') {
      next();
      const right = parseValue();
      return { kind: 'cmp', op: tok.v as '=' | '!=', left, right };
    }
    return left;
  }

  const ast = parseExpr();
  if (pos < tokens.length) throw new FormulaError('Trailing tokens in formula');
  return ast;
}

// ─────────────────────────────────────────────────────────────
// EVALUATOR
// ─────────────────────────────────────────────────────────────

/** Resolves a field reference to its formula-context value for one record.
 *  Linked-record fields must already be coerced to display names (string[]). */
export type FieldGetter = (fieldName: string) => unknown;

const SUPPORTED_CALLS = new Set(['AND', 'OR', 'NOT', 'FIND', 'ARRAYJOIN', 'IS_BEFORE', 'IS_AFTER', 'DATEADD', 'TRUE', 'FALSE']);

export function collectFieldNames(node: Node, into: Set<string> = new Set()): Set<string> {
  if (node.kind === 'field') into.add(node.name);
  else if (node.kind === 'cmp') { collectFieldNames(node.left, into); collectFieldNames(node.right, into); }
  else if (node.kind === 'call') {
    if (!SUPPORTED_CALLS.has(node.name)) throw new FormulaError(`Unsupported function ${node.name}`);
    node.args.forEach((a) => collectFieldNames(a, into));
  }
  return into;
}

function toText(v: unknown): string {
  if (v === undefined || v === null || v === false) return '';
  if (v === true) return '1';
  if (Array.isArray(v)) return v.map((x) => toText(x)).join(', ');
  return String(v);
}

function truthy(v: unknown): boolean {
  if (v === undefined || v === null || v === false) return false;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v !== '';
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function evalFormula(node: Node, get: FieldGetter): unknown {
  switch (node.kind) {
    case 'str': return node.value;
    case 'num': return node.value;
    case 'field': return get(node.name);
    case 'cmp': {
      const l = evalFormula(node.left, get);
      const r = evalFormula(node.right, get);
      if (node.op === '=' || node.op === '!=') {
        let eq: boolean;
        if (typeof l === 'number' && typeof r === 'number') eq = l === r;
        else eq = toText(l).toLowerCase() === toText(r).toLowerCase(); // Airtable's = is case-insensitive for text
        return node.op === '=' ? eq : !eq;
      }
      const ln = typeof l === 'number' ? l : parseFloat(toText(l));
      const rn = typeof r === 'number' ? r : parseFloat(toText(r));
      if (Number.isNaN(ln) || Number.isNaN(rn)) return false;
      switch (node.op) {
        case '<': return ln < rn;
        case '>': return ln > rn;
        case '<=': return ln <= rn;
        case '>=': return ln >= rn;
      }
      return false;
    }
    case 'call': {
      const { name, args } = node;
      switch (name) {
        case 'TRUE': return true;
        case 'FALSE': return false;
        case 'AND': return args.every((a) => truthy(evalFormula(a, get)));
        case 'OR': return args.some((a) => truthy(evalFormula(a, get)));
        case 'NOT': return !truthy(evalFormula(args[0], get));
        case 'ARRAYJOIN': {
          const v = evalFormula(args[0], get);
          const sep = args[1] ? toText(evalFormula(args[1], get)) : ', ';
          return Array.isArray(v) ? v.map(toText).join(sep) : toText(v);
        }
        case 'FIND': {
          const needle = toText(evalFormula(args[0], get));
          const hay = toText(evalFormula(args[1], get));
          return hay.indexOf(needle) + 1; // 1-based, 0 = not found (falsy)
        }
        case 'IS_BEFORE': case 'IS_AFTER': {
          const a = Date.parse(toText(evalFormula(args[0], get)));
          const b = Date.parse(toText(evalFormula(args[1], get)));
          if (Number.isNaN(a) || Number.isNaN(b)) return false;
          return name === 'IS_BEFORE' ? a < b : a > b;
        }
        case 'DATEADD': {
          const base = Date.parse(toText(evalFormula(args[0], get)));
          const n = Number(evalFormula(args[1], get));
          const unit = toText(evalFormula(args[2], get)).toLowerCase();
          if (Number.isNaN(base) || Number.isNaN(n)) throw new FormulaError('Invalid DATEADD arguments');
          let ms: number;
          if (unit === 'days' || unit === 'day' || unit === 'd') ms = n * 86400_000;
          else if (unit === 'hours' || unit === 'hour' || unit === 'h') ms = n * 3600_000;
          else throw new FormulaError(`Unsupported DATEADD unit "${unit}"`);
          return new Date(base + ms).toISOString();
        }
        default: throw new FormulaError(`Unsupported function ${name}`);
      }
    }
  }
}

export function formulaMatches(node: Node, get: FieldGetter): boolean {
  return truthy(evalFormula(node, get));
}
