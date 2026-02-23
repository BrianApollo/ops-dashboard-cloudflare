// =============================================================================
// ENVIRONMENT
// =============================================================================

export interface Env {
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  FB_APP_ID: string;
  FB_APP_SECRET: string;
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
