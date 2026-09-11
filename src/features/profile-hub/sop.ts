/**
 * Facebook Profile Setup SOP — the nine stages a new profile goes through,
 * ported from the staff SOP PDF.
 *
 * Each stage lists the Airtable fields it touches so the Setup checklist can
 * embed them inline, plus the detailed how-to shown in the help drawer.
 * Screenshots / video for a stage are plain URLs (host them on R2 under
 * `sop/`), left empty until they exist.
 */

import { FIELD_ORIGINAL_DATA, ORIGINAL_DATA_KEYS, parseOriginalData, type OriginalData } from './original';

export interface SopStage {
  /** 1-9 */
  number: number;
  /** Airtable checkbox field that records this stage as done. */
  doneField: string;
  title: string;
  timing: string;
  /** One line under the title in the checklist row. */
  summary: string;
  /** Airtable field names this stage edits — rendered inline in the row. */
  fields: string[];
  /** The SOP's own checklist lines, shown in the help drawer. */
  steps: string[];
  /** Per-stage label overrides (field name -> label shown in this box). */
  labels?: Record<string, string>;
  /**
   * Credentials this stage rotates: show the delivered value (from Box 1)
   * next to the live field, and whether it has actually been changed.
   */
  compare?: Array<{ field: string; originalKey: keyof OriginalData }>;
  /** Optional media for the help drawer. */
  video?: string;
  screenshots?: string[];
}

export const SOP_STAGES: SopStage[] = [
  {
    number: 1,
    doneField: 'SOP 1 AdsPower Setup',
    title: 'Add profile to AdsPower',
    timing: 'Day 0',
    summary: 'Profile, proxy and 2FA verified in AdsPower before any other work.',
    fields: ['Profile ID', 'Proxy', 'Profile 2FA'],
    steps: [
      'Add the profile to AdsPower.',
      'Add the assigned U.S. proxy.',
      'Add the existing 2FA secret/code setup.',
      'Open the profile and confirm the displayed IP is U.S.-based and matches the expected proxy.',
      'Confirm AdsPower displays a live 2FA code with a countdown timer.',
      'Record/update all profile, proxy and authentication details in Airtable.',
    ],
  },
  {
    number: 2,
    doneField: 'SOP 2 Initial Activity',
    title: 'Initial profile activity',
    timing: 'Days 1-14',
    summary: 'Light, normal activity every day while the profile settles.',
    fields: [],
    steps: [
      'For approximately the first two weeks, log in and click around the profile each day.',
      'After the initial period, activity can normally be reduced to once every 2-3 days.',
      'Record relevant status/notes in Airtable.',
    ],
  },
  {
    number: 3,
    doneField: 'SOP 3 New Email',
    title: 'Create replacement email',
    timing: 'Day 7+',
    summary: 'A new mailbox that will become the Facebook login email.',
    fields: [
      'Profile Email',
      'Profile Email Password',
      'Profile Security Email',
      'Security Email Password',
    ],
    labels: {
      'Profile Security Email': 'Backup Email',
      'Security Email Password': 'Backup Email Password',
    },
    steps: [
      'Create a new Hotmail, Mail.com, Proton Mail, or other suitable mailbox.',
      'Set the company backup email as the mailbox recovery/backup email.',
      'Store the new mailbox login and recovery details in Airtable.',
      'Wait roughly 1-2 days before changing the Facebook login email.',
    ],
  },
  {
    number: 4,
    doneField: 'SOP 4 Facebook Email',
    title: 'Change Facebook login email',
    timing: '+1-2 days',
    summary: 'Point the Facebook profile at the new mailbox.',
    fields: ['Profile Email'],
    compare: [{ field: 'Profile Email', originalKey: 'email' }],
    steps: [
      'Update the Facebook login email to the new mailbox.',
      'Confirm the new email is working correctly.',
      'Update Airtable immediately.',
      'Wait a few days before the next credential change.',
    ],
  },
  {
    number: 5,
    doneField: 'SOP 5 Password',
    title: 'Change Facebook password',
    timing: '+a few days',
    summary: 'Rotate the password separately from the email change.',
    fields: ['Profile FB Password'],
    compare: [{ field: 'Profile FB Password', originalKey: 'password' }],
    steps: [
      'Change the Facebook password.',
      'Verify the new password works.',
      'Update Airtable immediately.',
      'Wait a few days before changing 2FA.',
    ],
  },
  {
    number: 6,
    doneField: 'SOP 6 2FA & Recovery',
    title: 'Replace 2FA and recovery codes',
    timing: '+a few days',
    summary: 'New authenticator secret in Airtable and AdsPower, fresh recovery codes stored.',
    fields: ['Profile 2FA', 'Recovery Codes'],
    compare: [{ field: 'Profile 2FA', originalKey: 'twoFaKey' }],
    steps: [
      'Change the Facebook 2FA setup.',
      'Capture the long authenticator secret string (typically around 16 characters).',
      'Store the secret string in Airtable.',
      'Add the same secret to AdsPower.',
      'Confirm AdsPower generates the new 2FA codes correctly.',
      'Regenerate/download new Facebook recovery or backup codes.',
      'Upload/store the new recovery codes in Airtable.',
    ],
  },
  {
    number: 7,
    doneField: 'SOP 7 BM Access',
    title: 'Accept Business Manager access',
    timing: 'Around week 2+',
    summary: 'Add the profile to the required existing Business Managers.',
    fields: ['Linked BM', 'SOP 7 Screenshot'],
    steps: [
      'Send/share the required Business Manager invitations to the new profile.',
      'Open the invitation email from the new profile and accept it.',
      'Enter the profile name where required.',
      'Do not opt into unnecessary marketing/promotional emails.',
      'Confirm access and update Airtable.',
      'Wait roughly 1-3 days before assigning the full asset set.',
    ],
  },
  {
    number: 8,
    doneField: 'SOP 8 Assets Assigned',
    title: 'Assign business assets',
    timing: '+1-3 days',
    summary: 'Ad Accounts, Data Sources and Pixels assigned in one controlled pass.',
    fields: ['SOP 8 Screenshot'],
    steps: [
      'Select the profile/person inside the Business Manager settings.',
      'Choose Assign Assets.',
      'Assign all required Ad Accounts, Data Sources, and Pixels.',
      'Check that the intended permissions/access levels are enabled.',
      'Update Airtable.',
    ],
  },
  {
    number: 9,
    doneField: 'SOP 9 Page Access',
    title: 'Complete Page admin access',
    timing: 'Final stage',
    summary: 'Page admin access accepted, then Pages assigned to the profile.',
    fields: ['Linked Pages', 'SOP 9 Screenshot'],
    steps: [
      'From an existing Page admin profile, invite/share Page access with the new profile.',
      'Open the invitation from the new profile and accept it.',
      'Accept the required permissions.',
      'Confirm the new profile now has the intended Page access.',
      'Return to the business asset assignment area and assign the relevant Pages to the profile.',
      'Update Airtable.',
    ],
  },
];

/** The Final Verification Checklist — confirmed once, in the Verify dialog. */
export const FINAL_VERIFICATION: string[] = [
  'AdsPower profile opens correctly.',
  'Assigned U.S. proxy is live and showing the expected IP.',
  'Current 2FA generates correctly in AdsPower.',
  'New email and Facebook password are confirmed.',
  '2FA secret and current recovery codes are stored in Airtable.',
  'Required Business Managers are accessible.',
  'Required Ad Accounts, Data Sources and Pixels are assigned.',
  'Direct Page access and final Page assignment are confirmed where required.',
  'Airtable matches the live setup.',
];

export const FIELD_SETUP_COMPLETE = 'Setup Complete';
export const FIELD_SETUP_COMPLETED_ON = 'Setup Completed On';

/** How many of the nine stages are ticked. */
export function stagesDone(fields: Record<string, unknown>): number {
  return SOP_STAGES.filter((s) => Boolean(fields[s.doneField])).length;
}

export function isSetupComplete(fields: Record<string, unknown>): boolean {
  return Boolean(fields[FIELD_SETUP_COMPLETE]);
}

/**
 * Overall setup progress: Box 1 (what we received) counts when its data is
 * complete, then one per ticked SOP stage. Total is stages + 1.
 */
export function setupProgress(fields: Record<string, unknown>): { done: number; total: number } {
  const received = ORIGINAL_DATA_KEYS.every(({ key }) => {
    const v = parseOriginalData(fields[FIELD_ORIGINAL_DATA])[key];
    return typeof v === 'string' && v.trim() !== '';
  });
  return { done: stagesDone(fields) + (received ? 1 : 0), total: SOP_STAGES.length + 1 };
}
