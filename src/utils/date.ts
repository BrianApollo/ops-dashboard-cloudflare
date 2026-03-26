/**
 * Date utilities.
 *
 * All stored timestamps use GMT+7 (Indochina Time) so that every user,
 * regardless of their local timezone, sees the same wall-clock value in
 * Airtable and in the launch snapshot.
 */

const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Return an ISO-8601 string representing "now" in GMT+7.
 *
 * Example output: "2026-03-25T19:45:12.345+07:00"
 */
export function nowGMT7(): string {
  const now = new Date();
  const gmt7 = new Date(now.getTime() + GMT7_OFFSET_MS + now.getTimezoneOffset() * 60_000);

  const year = gmt7.getFullYear();
  const month = String(gmt7.getMonth() + 1).padStart(2, '0');
  const day = String(gmt7.getDate()).padStart(2, '0');
  const hours = String(gmt7.getHours()).padStart(2, '0');
  const minutes = String(gmt7.getMinutes()).padStart(2, '0');
  const seconds = String(gmt7.getSeconds()).padStart(2, '0');
  const ms = String(gmt7.getMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+07:00`;
}
