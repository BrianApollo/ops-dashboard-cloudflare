/**
 * "As received" data — the credentials a profile arrives with on day 0.
 * Stored as a JSON string in the "Original Data" field so it survives the
 * credential rotation in SOP stages 3-6.
 */

export const FIELD_ORIGINAL_DATA = 'Original Data';
export const FIELD_EXTRA_NOTES = 'Extra Notes';
/** AdsPower user_id. Same field the Infrastructure page's AdsPower link uses. */
export const FIELD_LINKED_ADSPROFILE = 'Linked AdsProfile';

export interface OriginalData {
  userId?: string;
  password?: string;
  twoFaKey?: string;
  email?: string;
  emailPassword?: string;
  recoveryEmail?: string;
  cookies?: string;
}

export const ORIGINAL_DATA_KEYS: Array<{
  key: keyof OriginalData;
  label: string;
  hint?: string;
  multiline?: boolean;
}> = [
  { key: 'userId', label: 'User ID' },
  { key: 'password', label: 'Password' },
  { key: 'twoFaKey', label: '2FA key' },
  { key: 'email', label: 'Email' },
  { key: 'emailPassword', label: 'Email password' },
  { key: 'recoveryEmail', label: 'Recovery email', hint: 'Goes to cvlmail.net' },
  { key: 'cookies', label: 'Cookies', multiline: true },
];

export function parseOriginalData(raw: unknown): OriginalData {
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as OriginalData) : {};
  } catch {
    return {};
  }
}
