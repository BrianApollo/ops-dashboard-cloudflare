/**
 * Profile Hub types.
 *
 * A staff-facing view of the FULL Airtable "Profiles" record — separate from
 * src/features/profiles (which only carries the 4 fields the campaign launch
 * flow needs). Nothing here is shared with that module on purpose.
 */

export type FieldKind =
  | 'text'
  | 'secret'
  | 'email'
  | 'url'
  | 'date'
  | 'datetime'
  | 'checkbox'
  | 'status'
  | 'links';

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
  hint?: string;
}

export interface ProfileGroupDef {
  key: string;
  title: string;
  /** Short line under the group title. */
  subtitle: string;
  /** Accent colour key — see GROUP_ACCENTS in the page. */
  accent: 'slate' | 'blue' | 'violet' | 'amber' | 'teal' | 'rose';
  fields: ProfileFieldDef[];
}

/** A profile as edited in the UI: record id + raw Airtable field values. */
export interface HubProfile {
  id: string;
  fields: Record<string, unknown>;
}

// =============================================================================
// FIELD GROUPS — the whole layout of the page is driven by this
// =============================================================================

export const PROFILE_GROUPS: ProfileGroupDef[] = [
  {
    key: 'identity',
    title: 'Identity',
    subtitle: 'Who this profile is and whether it is in use',
    accent: 'slate',
    fields: [
      { name: 'Profile Name', label: 'Profile Name', kind: 'text', required: true },
      { name: 'Profile Status', label: 'Status', kind: 'status', required: true },
      { name: 'Profile ID', label: 'AdsPower Profile ID', kind: 'text', required: true, hint: 'ID from AdsPower' },
      { name: 'UID', label: 'UID', kind: 'text' },
      { name: 'Hidden', label: 'Hidden from pickers', kind: 'checkbox' },
    ],
  },
  {
    key: 'facebook',
    title: 'Facebook Account',
    subtitle: 'Login + 2FA for the Facebook profile itself',
    accent: 'blue',
    fields: [
      { name: 'Profile FB Password', label: 'Facebook Password', kind: 'secret', required: true },
      { name: 'Profile 2FA', label: '2FA Secret', kind: 'secret', required: true, hint: 'TOTP key' },
      { name: 'Profile Link', label: 'Facebook Profile Link', kind: 'url', wide: true },
    ],
  },
  {
    key: 'email',
    title: 'Account Email',
    subtitle: 'The inbox the Facebook account is registered to',
    accent: 'violet',
    fields: [
      { name: 'Profile Email', label: 'Email', kind: 'email', required: true },
      { name: 'Profile Email Password', label: 'Email Password', kind: 'secret', required: true },
    ],
  },
  {
    key: 'security',
    title: 'Recovery Email',
    subtitle: 'Backup inbox used for recovery / security checks',
    accent: 'violet',
    fields: [
      { name: 'Profile Security Email', label: 'Security Email', kind: 'email' },
      { name: 'Security Email Password', label: 'Security Email Password', kind: 'secret' },
    ],
  },
  {
    key: 'persona',
    title: 'Persona Details',
    subtitle: 'The details the account was registered with',
    accent: 'teal',
    fields: [
      { name: 'Profile Birth Date', label: 'Birth Date', kind: 'date' },
      { name: 'Profile Gender', label: 'Gender', kind: 'text' },
      { name: 'Profile Location', label: 'Location', kind: 'text' },
      { name: 'Proxy', label: 'Proxy', kind: 'text', wide: true, hint: 'Proxy assigned in AdsPower' },
    ],
  },
  {
    key: 'token',
    title: 'Token & Sync',
    subtitle: 'Long-lived Facebook token and last data sync',
    accent: 'amber',
    fields: [
      { name: 'Permanent Token', label: 'Permanent Token', kind: 'secret', wide: true },
      { name: 'Permanent Token End Date', label: 'Token Expiry', kind: 'date' },
      { name: 'Token Valid', label: 'Token Valid', kind: 'checkbox' },
      { name: 'Last Sync', label: 'Last Sync', kind: 'datetime', readOnly: true },
      { name: 'Profile Review Date', label: 'Next Review Date', kind: 'date' },
    ],
  },
  {
    key: 'assets',
    title: 'Linked Assets',
    subtitle: 'Managed on the Infrastructure page — shown here for reference',
    accent: 'rose',
    fields: [
      { name: 'Linked BM', label: 'Business Managers', kind: 'links', readOnly: true, wide: true },
      { name: 'Linked Pages', label: 'Pages', kind: 'links', readOnly: true, wide: true },
      { name: 'Master Profile', label: 'Master Profile', kind: 'links', readOnly: true, wide: true },
    ],
  },
];

/** Every editable field name, flattened. */
export const EDITABLE_FIELDS: ProfileFieldDef[] = PROFILE_GROUPS.flatMap((g) =>
  g.fields.filter((f) => !f.readOnly),
);

export const REQUIRED_FIELDS: ProfileFieldDef[] = PROFILE_GROUPS.flatMap((g) =>
  g.fields.filter((f) => f.required),
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
