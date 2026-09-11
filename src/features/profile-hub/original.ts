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

// =============================================================================
// SUPPLIER "FULL" LINE
// =============================================================================
//
// Some suppliers hand profiles over as one pipe-separated line:
//   uid | password | 2fa key | email | email password | recovery email | cookies [| extra…]
// Cookies never contain "|" (they use ";" and "="), so a plain split is safe.

export interface SupplierParse {
  data: OriginalData;
  /** Anything after the cookies column — kept, never silently dropped. */
  extras: string[];
  /** Things that look off. The line still parses; staff decide. */
  warnings: string[];
}

const looksLikeEmail = (s: string) => /^[^\s@|]+@[^\s@|]+\.[^\s@|]+$/.test(s);

export function parseSupplierLine(text: string): SupplierParse | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const warnings: string[] = [];
  if (lines.length > 1) warnings.push(`${lines.length} lines pasted — only the first is used.`);

  // Trailing "|" leaves an empty last column; drop empties from the end only.
  const cols = lines[0].split('|').map((c) => c.trim());
  while (cols.length > 0 && cols[cols.length - 1] === '') cols.pop();
  if (cols.length < 7) return null;

  const [userId, password, twoFaKey, email, emailPassword, recoveryEmail, cookies, ...extras] = cols;

  if (!/^\d{6,}$/.test(userId)) warnings.push('User ID is not all digits.');
  if (!/^[A-Z2-7]{16,}$/i.test(twoFaKey)) warnings.push('2FA key does not look like an authenticator secret.');
  if (!looksLikeEmail(email)) warnings.push('Email does not look like an email address.');
  if (!looksLikeEmail(recoveryEmail)) warnings.push('Recovery email does not look like an email address.');
  if (!cookies.includes('=')) warnings.push('Cookies column does not look like cookies.');
  if (cookies.includes('c_user=') && !cookies.includes(`c_user=${userId}`)) {
    warnings.push('The c_user cookie does not match the User ID.');
  }

  return {
    data: { userId, password, twoFaKey, email, emailPassword, recoveryEmail, cookies },
    extras: extras.filter(Boolean),
    warnings,
  };
}
