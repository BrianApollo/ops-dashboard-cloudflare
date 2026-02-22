// =============================================================================
// SCHEDULE TYPES
// =============================================================================

export type ScheduleType = 'Budget Change' | 'Status Change';
export type ScheduleStatus = 'Pending' | 'Running' | 'Success' | 'Failed';
export type ScheduleSource = 'Manual' | 'Rule';

/** Raw Airtable record shape */
export interface ScheduleRecord {
  id: string;
  fields: {
    'Campaign Id'?: string;
    'Linked Campaign'?: string[];
    'Name (from Linked Campaign)'?: string[];
    Source?: ScheduleSource;
    'From Rule'?: string[];
    Type?: ScheduleType;
    Execute?: string;
    'Scheduled At'?: string;
    Status?: ScheduleStatus;
    'Executed At'?: string;
    Response?: string;
    'Last Reponse Time'?: string;
  };
  createdTime: string;
}

/** Parsed schedule for UI */
export interface ScheduledAction {
  id: string;
  campaignId: string;
  linkedCampaignId?: string;
  linkedCampaignName?: string;
  source: ScheduleSource;
  fromRuleId?: string;
  type: ScheduleType;
  execute: string;
  scheduledAt: string;
  status: ScheduleStatus;
  executedAt?: string;
  response?: string;
  lastResponseTime?: string;
  createdAt: string;
}

/** Form state for creating from Manage page */
export interface ScheduleFormState {
  campaignId: string;
  campaignName: string;
  type: ScheduleType;
  execute: string;
  scheduledAt: string;
}

// =============================================================================
// MAPPERS
// =============================================================================

export function recordToScheduledAction(record: ScheduleRecord): ScheduledAction {
  const f = record.fields;
  return {
    id: record.id,
    campaignId: f['Campaign Id'] || '',
    linkedCampaignId: f['Linked Campaign']?.[0],
    linkedCampaignName: f['Name (from Linked Campaign)']?.[0],
    source: f.Source || 'Manual',
    fromRuleId: f['From Rule']?.[0],
    type: f.Type || 'Budget Change',
    execute: f.Execute || '',
    scheduledAt: f['Scheduled At'] || '',
    status: f.Status || 'Pending',
    executedAt: f['Executed At'],
    response: f.Response,
    lastResponseTime: f['Last Reponse Time'],
    createdAt: record.createdTime,
  };
}

/** Convert form state to Airtable fields for creating a new schedule */
export function formStateToFields(
  form: ScheduleFormState,
  linkedCampaignRecordId?: string,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    'Campaign Id': form.campaignId,
    Source: 'Manual' as ScheduleSource,
    Type: form.type,
    Execute: form.execute,
    'Scheduled At': form.scheduledAt,
    Status: 'Pending' as ScheduleStatus,
  };

  if (linkedCampaignRecordId) {
    fields['Linked Campaign'] = [linkedCampaignRecordId];
  }

  return fields;
}

/** Format the execute value for display */
export function formatExecuteValue(type: ScheduleType, execute: string): string {
  if (type === 'Budget Change') {
    const num = parseFloat(execute);
    return isNaN(num) ? execute : `$${num.toLocaleString()}`;
  }
  return execute === 'ACTIVE' ? 'Activate' : execute === 'PAUSED' ? 'Pause' : execute;
}

/** Default form state */
export function defaultScheduleFormState(): ScheduleFormState {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  return {
    campaignId: '',
    campaignName: '',
    type: 'Budget Change',
    execute: '',
    scheduledAt: `${yyyy}-${mm}-${dd}`,
  };
}
