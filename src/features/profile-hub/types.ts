/**
 * Profile Hub types.
 *
 * A staff-facing view of the FULL Airtable "Profiles" record — separate from
 * src/features/profiles (which only carries the 4 fields the campaign launch
 * flow needs). Nothing here is shared with that module on purpose.
 */

import { SOP_STAGES, FIELD_SETUP_COMPLETE, FIELD_SETUP_COMPLETED_ON } from './sop';
import { FIELD_ORIGINAL_DATA, FIELD_EXTRA_NOTES, FIELD_LINKED_ADSPROFILE } from './original';

export type FieldKind =
  | 'text'
  | 'secret'
  | 'email'
  | 'url'
  | 'date'
  | 'datetime'
  | 'checkbox'
  | 'status'
  | 'links'
  | 'attachments'
  | 'textarea'
  | 'json';

export interface ProfileFieldDef {
  /** Exact Airtable field name. */
  name: string;
  /** Label shown to staff. */
  label: string;
  kind: FieldKind;
  /** Read-only fields are rendered but never sent back to Airtable. */
  readOnly?: boolean;
  /** Counts towards the "profile complete" indicator. */
  required?: boolean;
  /** Full-width in the two-column group grid. */
  wide?: boolean;
  /** Does not count towards a section being complete (compact view). */
  optional?: boolean;
  hint?: string;
}

export interface ProfileGroupDef {
  key: string;
  title: string;
  /** Short line under the group title. */
  subtitle: string;
  /** Accent colour key — see GROUP_ACCENTS in the page. */
  accent: 'slate' | 'blue' | 'violet' | 'amber' | 'teal' | 'rose';
  /** 'full' spans both columns of the page grid. Defaults to half width. */
  span?: 'full';
  fields: ProfileFieldDef[];
}

/** Statuses offered in the Status dropdown, and the order the list groups by. */
export const PROFILE_STATUSES = ['Active', 'Inactive', 'Banned', 'Restricted'] as const;

/** A profile as edited in the UI: record id + raw Airtable field values. */
export interface HubProfile {
  id: string;
  fields: Record<string, unknown>;
}

// =============================================================================
// FIELD GROUPS — the whole layout of the page is driven by this
// =============================================================================

export const PROFILE_GROUPS: ProfileGroupDef[] = [
  // ---- Row 1: Identity | Token & Sync ----
  {
    key: 'identity',
    title: 'Identity',
    subtitle: 'Who this profile is and whether it is in use',
    accent: 'slate',
    fields: [
      { name: 'Profile Name', label: 'Profile Name', kind: 'text', required: true },
      { name: 'Profile ID', label: 'AdsPower Profile ID', kind: 'text', required: true, hint: 'ID from AdsPower' },
    ],
  },
  {
    key: 'token',
    title: 'Token & Sync',
    subtitle: 'Long-lived Facebook token and last data sync',
    accent: 'amber',
    fields: [
      { name: 'Permanent Token', label: 'Permanent Token', kind: 'secret', wide: true },
      { name: 'Permanent Token End Date', optional: true, label: 'Token Expiry', kind: 'date' },
      { name: 'Last Sync', label: 'Last Sync', kind: 'datetime', readOnly: true },
      { name: 'Profile Review Date', optional: true, label: 'Next Review Date', kind: 'date' },
    ],
  },

  // ---- Row 2: one wide card — the account itself + who it claims to be ----
  {
    key: 'account',
    title: 'Facebook Account & Persona Details',
    subtitle: 'Login, 2FA and the details the account was registered with',
    accent: 'blue',
    span: 'full',
    fields: [
      // Same Airtable field as the "Email 1" card — shown here too because it is
      // half of the Facebook login pair. Editing it in either place is the same edit.
      { name: 'Profile Email', label: 'Facebook Email', kind: 'email', required: true },
      { name: 'Profile FB Password', label: 'Facebook Password', kind: 'secret', required: true },
      { name: 'Profile 2FA', label: '2FA Secret', kind: 'secret', required: true, hint: 'TOTP key' },
      { name: 'UID', optional: true, label: 'Facebook UID', kind: 'text' },
      { name: 'Profile Link', optional: true, label: 'Facebook Profile Link', kind: 'url' },
      { name: 'Profile Birth Date', optional: true, label: 'Birth Date', kind: 'date' },
      { name: 'Profile Gender', optional: true, label: 'Gender', kind: 'text' },
      { name: 'Profile Location', optional: true, label: 'Location', kind: 'text' },
      { name: 'Proxy', label: 'Proxy', kind: 'text', hint: 'Proxy assigned in AdsPower' },
      { name: 'Recovery Codes', optional: true, label: 'Recovery Codes', kind: 'textarea', wide: true, hint: 'Paste the Facebook backup codes here, one per line' },
    ],
  },

  // ---- Row 3: Email 1 | Backup Email ----
  {
    key: 'email',
    title: 'Email 1',
    subtitle: 'The inbox the Facebook account is registered to',
    accent: 'violet',
    fields: [
      { name: 'Profile Email', label: 'Email', kind: 'email', required: true },
      { name: 'Profile Email Password', label: 'Email Password', kind: 'secret', required: true },
    ],
  },
  {
    key: 'security',
    title: 'Backup Email',
    subtitle: 'Backup inbox used for recovery / security checks',
    accent: 'teal',
    fields: [
      { name: 'Profile Security Email', label: 'Email', kind: 'email' },
      { name: 'Security Email Password', label: 'Email Password', kind: 'secret' },
    ],
  },

  // ---- The rest ----
  {
    key: 'received',
    title: 'As Received',
    subtitle: 'What the profile came with on day 0 — set during setup stage 1',
    accent: 'slate',
    span: 'full',
    fields: [
      { name: 'Original Data', label: 'Original credentials', kind: 'json', readOnly: true, wide: true },
      { name: 'Extra Notes', optional: true, label: 'Extra notes', kind: 'textarea', wide: true },
    ],
  },
  {
    key: 'assets',
    title: 'Linked Assets',
    subtitle: 'Managed on the Infrastructure page — shown here for reference',
    accent: 'rose',
    span: 'full',
    fields: [
      { name: 'Linked BM', label: 'Business Managers', kind: 'links', readOnly: true, wide: true },
      { name: 'Linked Pages', label: 'Pages', kind: 'links', readOnly: true, wide: true },
      { name: 'Master Profile', optional: true, label: 'Master Profile', kind: 'links', readOnly: true, wide: true },
    ],
  },
];

/**
 * Fields edited outside the group grid — in the summary bar (Status, Hidden)
 * and on the Token & Sync header (Token Valid, set by the Facebook check).
 * They still have to be writable, so they belong in EDITABLE_FIELDS.
 */
export const HEADER_FIELDS: ProfileFieldDef[] = [
  { name: 'Profile Status', label: 'Status', kind: 'status', required: true },
  { name: 'Hidden', label: 'Hidden from pickers', kind: 'checkbox' },
  { name: 'Token Valid', label: 'Token Valid', kind: 'checkbox' },
  // Setup SOP progress — see sop.ts
  ...SOP_STAGES.map((s) => ({ name: s.doneField, label: s.title, kind: 'checkbox' as const })),
  { name: FIELD_SETUP_COMPLETE, label: 'Setup Complete', kind: 'checkbox' },
  { name: FIELD_SETUP_COMPLETED_ON, label: 'Setup Completed On', kind: 'date' },
  // Day-0 record + AdsPower link — edited on the stage 1 panel (see original.ts)
  { name: FIELD_ORIGINAL_DATA, label: 'Original Data', kind: 'json' },
  { name: FIELD_EXTRA_NOTES, label: 'Extra Notes', kind: 'textarea' },
  { name: FIELD_LINKED_ADSPROFILE, label: 'AdsPower Profile', kind: 'text' },
  // Proof screenshots for the access stages
  { name: 'SOP 7 Screenshot', label: 'Screenshot', kind: 'attachments', optional: true, wide: true, hint: 'proof of BM access' },
  { name: 'SOP 8 Screenshot', label: 'Screenshot', kind: 'attachments', optional: true, wide: true, hint: 'proof of assigned assets' },
  { name: 'SOP 9 Screenshot', label: 'Screenshot', kind: 'attachments', optional: true, wide: true, hint: 'proof of Page access' },
];

/** Airtable field name -> definition, for rendering a field by name. */
export const FIELD_INDEX: Record<string, ProfileFieldDef> = Object.fromEntries(
  [...PROFILE_GROUPS.flatMap((g) => g.fields), ...HEADER_FIELDS].map((f) => [f.name, f]),
);

/** Dedupe by Airtable field name — a field may appear on more than one card. */
function byName(defs: ProfileFieldDef[]): ProfileFieldDef[] {
  const seen = new Map<string, ProfileFieldDef>();
  for (const def of defs) if (!seen.has(def.name)) seen.set(def.name, def);
  return [...seen.values()];
}

const ALL_FIELDS: ProfileFieldDef[] = [
  ...PROFILE_GROUPS.flatMap((g) => g.fields),
  ...HEADER_FIELDS,
];

/** Every editable field name, flattened. */
export const EDITABLE_FIELDS: ProfileFieldDef[] = byName(
  ALL_FIELDS.filter((f) => !f.readOnly),
);

export const REQUIRED_FIELDS: ProfileFieldDef[] = byName(
  ALL_FIELDS.filter((f) => f.required),
);

/**
 * Percentage of required fields that are filled in.
 */
export function completeness(fields: Record<string, unknown>): number {
  const filled = REQUIRED_FIELDS.filter((f) => {
    const v = fields[f.name];
    return v !== undefined && v !== null && String(v).trim() !== '';
  }).length;
  return Math.round((filled / REQUIRED_FIELDS.length) * 100);
}

/** Required fields that are still empty. */
export function missingFields(fields: Record<string, unknown>): string[] {
  return REQUIRED_FIELDS.filter((f) => {
    const v = fields[f.name];
    return v === undefined || v === null || String(v).trim() === '';
  }).map((f) => f.label);
}
