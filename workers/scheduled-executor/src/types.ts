// =============================================================================
// ENVIRONMENT
// =============================================================================

export interface Env {
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  FB_APP_ID: string;
  FB_APP_SECRET: string;
  /**
   * Optional D1 binding for rule execution logs.
   * When unbound, Airtable remains the only log destination.
   */
  DB?: D1Database;
}

// =============================================================================
// SCHEDULING TIME
// =============================================================================

/** Business timezone for all scheduling — the crons fire at midnight GMT+7. */
export const SCHEDULE_UTC_OFFSET_HOURS = 7;

/**
 * Today's date (YYYY-MM-DD) in the scheduling timezone.
 *
 * The 17:00 UTC cron IS midnight GMT+7, so locally it is already the next
 * calendar day. Deriving the date from UTC there makes every scheduled action
 * fire a day late, so always go through this helper.
 */
export function scheduleToday(now: Date = new Date()): string {
  const shifted = new Date(
    now.getTime() + SCHEDULE_UTC_OFFSET_HOURS * 60 * 60 * 1000,
  );
  return shifted.toISOString().split('T')[0];
}

// =============================================================================
// AIRTABLE RECORD TYPES
// =============================================================================

export interface ScheduleRecord {
  id: string;
  fields: {
    'Campaign Id'?: string;
    Source?: string;
    Type?: string;
    Execute?: string;
    'Scheduled At'?: string;
    Status?: string;
    'Executed At'?: string;
    Response?: string;
  };
}

export interface ProfileRecord {
  id: string;
  fields: {
    'Permanent Token'?: string;
    'Profile Name'?: string;
    'Profile Status'?: string;
  };
}

export interface MasterProfileRecord {
  id: string;
  fields: {
    'Profile Record'?: string[];
  };
}
