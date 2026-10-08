/**
 * Data abstraction layer for Profiles.
 *
 * This file is the ONLY place that knows about Airtable for Profiles.
 * All Airtable field names are mapped here — nowhere else.
 */

import type { Profile, ProfileStatus } from './types';
import { dbFetch } from '../../core/data/db-client';
import type { DbRecord, DbResponse } from '../../lib/db-types';
import { fetchAllRecords } from '../../lib/db-helpers';

// Table name
const PROFILES_TABLE = 'Profiles';

// =============================================================================
// AIRTABLE FIELD MAPPINGS
// =============================================================================

const FIELD_PROFILE_ID = 'Profile ID';
const FIELD_PROFILE_NAME = 'Profile Name';
const FIELD_PROFILE_STATUS = 'Profile Status';
const FIELD_PERMANENT_TOKEN = 'Permanent Token';

// =============================================================================
// AIRTABLE HELPERS
// =============================================================================


// =============================================================================
// MAPPER
// =============================================================================

function mapAirtableToProfile(record: DbRecord): Profile | null {
    const fields = record.fields;

    const profileId = typeof fields[FIELD_PROFILE_ID] === 'string'
        ? fields[FIELD_PROFILE_ID]
        : '';

    const profileName = typeof fields[FIELD_PROFILE_NAME] === 'string'
        ? fields[FIELD_PROFILE_NAME]
        : '';

    const status = typeof fields[FIELD_PROFILE_STATUS] === 'string'
        ? (fields[FIELD_PROFILE_STATUS] as ProfileStatus)
        : 'Inactive';

    const permanentToken = typeof fields[FIELD_PERMANENT_TOKEN] === 'string'
        ? fields[FIELD_PERMANENT_TOKEN]
        : '';

    // Skip records without a profile name
    if (!profileName) {
        return null;
    }

    return {
        id: record.id,
        profileId,
        profileName,
        status,
        permanentToken,
    };
}

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * List all profiles from Airtable.
 */
export async function listProfiles(): Promise<Profile[]> {
    const allRecords = await fetchAllRecords(PROFILES_TABLE);

    return allRecords
        .map((record) => mapAirtableToProfile(record))
        .filter((p): p is Profile => p !== null);
}

/**
 * Get the master profile record ID from the "Master Profile" table.
 * Returns the Airtable record ID of the default profile, or null if not set.
 */
export async function getMasterProfileId(): Promise<string | null> {
    const response = await dbFetch('Master Profile?maxRecords=1');
    const data: DbResponse = await response.json();

    if (data.records.length === 0) return null;

    const profileRecord = data.records[0].fields['Profile Record'];

    // Linked records are stored as arrays of record IDs
    if (Array.isArray(profileRecord) && profileRecord.length > 0) {
        return profileRecord[0] as string;
    }

    // Could also be a single string
    if (typeof profileRecord === 'string') {
        return profileRecord;
    }

    return null;
}

/**
 * Get only Active profiles.
 */
export async function getActiveProfiles(): Promise<Profile[]> {
    const response = await dbFetch(`${PROFILES_TABLE}?where[${encodeURIComponent(FIELD_PROFILE_STATUS)}]=Active`);
    const data: DbResponse = await response.json();

    return data.records
        .map((record) => mapAirtableToProfile(record))
        .filter((p): p is Profile => p !== null);
}
