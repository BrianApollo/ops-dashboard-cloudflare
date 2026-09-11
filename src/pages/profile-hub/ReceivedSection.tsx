/**
 * Box 1 - "What we received": the credentials the profile arrived with on
 * day 0, stored as JSON in "Original Data" plus free-text "Extra Notes".
 * Kept for good, because SOP stages 3-6 overwrite the live fields.
 */

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import BoltIcon from '@mui/icons-material/Bolt';

import { QuickAddDialog } from './QuickAddDialog';

import { EditableSection } from './EditableSection';
import { ProfileField } from './ProfileField';
import { CompactValue, CompactGrid, isFilled } from './CompactValue';
import type { ProfileFieldDef } from '../../features/profile-hub/types';
import {
  FIELD_ORIGINAL_DATA,
  FIELD_EXTRA_NOTES,
  ORIGINAL_DATA_KEYS,
  parseOriginalData,
  type OriginalData,
  type SupplierParse,
} from '../../features/profile-hub/original';

interface ReceivedSectionProps {
  values: Record<string, unknown>;
  onSave: (changed: Record<string, unknown>) => Promise<void>;
}

/** How each received item renders — secrets masked, cookies as a block. */
const KIND: Record<keyof OriginalData, ProfileFieldDef['kind']> = {
  userId: 'text',
  password: 'secret',
  twoFaKey: 'secret',
  email: 'email',
  emailPassword: 'secret',
  recoveryEmail: 'email',
  cookies: 'textarea',
};

/** Received item -> the live profile field it seeds on day 0. */
const SEEDS: Partial<Record<keyof OriginalData, string>> = {
  userId: 'UID',
  password: 'Profile FB Password',
  twoFaKey: 'Profile 2FA',
  email: 'Profile Email',
  emailPassword: 'Profile Email Password',
  recoveryEmail: 'Profile Security Email',
};

const NOTES_DEF: ProfileFieldDef = {
  name: FIELD_EXTRA_NOTES,
  label: 'Extra notes',
  kind: 'textarea',
  hint: 'Anything else that came with the profile',
};

export function ReceivedSection({ values, onSave }: ReceivedSectionProps) {
  const [quickOpen, setQuickOpen] = useState(false);
  const saved = useMemo(() => parseOriginalData(values[FIELD_ORIGINAL_DATA]), [values]);
  const hasSaved = Object.values(saved).some((v) => v && v.trim());
  // Complete = every received item present. Extra notes are not needed.
  const complete = ORIGINAL_DATA_KEYS.every(({ key }) => isFilled(saved[key]));

  /** Copy the saved day-0 values into the live profile fields. Saves straight away. */
  const seedLiveFields = () => {
    const changed: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(SEEDS) as Array<[keyof OriginalData, string]>) {
      const value = saved[key];
      if (value && value.trim()) changed[field] = value.trim();
    }
    return onSave(changed);
  };

  /** Quick add: write the parsed supplier line (and optionally seed the live fields) in one save. */
  const fillFromSupplier = async (parsed: SupplierParse, copyToProfile: boolean) => {
    const changed: Record<string, unknown> = {
      [FIELD_ORIGINAL_DATA]: JSON.stringify(parsed.data, null, 2),
    };
    if (parsed.extras.length > 0) {
      const existing = String(values[FIELD_EXTRA_NOTES] ?? '').trim();
      const extra = 'Extra from supplier line: ' + parsed.extras.join(' | ');
      changed[FIELD_EXTRA_NOTES] = existing ? `${existing}\n${extra}` : extra;
    }
    if (copyToProfile) {
      for (const [key, field] of Object.entries(SEEDS) as Array<[keyof OriginalData, string]>) {
        const value = parsed.data[key];
        if (value && value.trim()) changed[field] = value.trim();
      }
    }
    await onSave(changed);
  };

  return (
    <>
    <QuickAddDialog open={quickOpen} onClose={() => setQuickOpen(false)} onFill={fillFromSupplier} />
    <EditableSection
      title="1 · What we received"
      subtitle="Exactly what the profile came with on day 0. This never changes — the live fields get replaced in stages 3–6."
      accent="#64748b"
      values={values}
      onSave={onSave}
      complete={complete}
      headerExtra={
        <>
          <Button size="small" variant="outlined" startIcon={<BoltIcon />} onClick={() => setQuickOpen(true)} sx={{ textTransform: 'none' }}>
            Quick add
          </Button>
        <Tooltip title="Fill the live profile fields (UID, passwords, 2FA, emails) from these values">
          <span>
            <Button size="small" variant="text" disabled={!hasSaved} onClick={seedLiveFields} sx={{ textTransform: 'none' }}>
              Copy into profile fields
            </Button>
          </span>
        </Tooltip>
        </>
      }
    >
      {({ editing, saving, compact, draft, setField }) => {
        const original = parseOriginalData(draft[FIELD_ORIGINAL_DATA]);
        const setOriginal = (key: keyof OriginalData, value: string) =>
          setField(FIELD_ORIGINAL_DATA, JSON.stringify({ ...original, [key]: value }, null, 2));

        if (compact) {
          const notes = String(values[FIELD_EXTRA_NOTES] ?? '').trim();
          // Row 1: the Facebook login trio. Row 2: the mailbox + cookies.
          const row = (keys: Array<keyof OriginalData>) =>
            ORIGINAL_DATA_KEYS.filter(({ key }) => keys.includes(key)).map(({ key, label }) => (
              <CompactValue
                key={key}
                def={{ name: key, label, kind: key === 'cookies' ? 'secret' : KIND[key] }}
                value={saved[key]}
              />
            ));
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <CompactGrid columns={3}>{row(['userId', 'password', 'twoFaKey'])}</CompactGrid>
              <CompactGrid columns={4}>{row(['email', 'emailPassword', 'recoveryEmail', 'cookies'])}</CompactGrid>
              {notes && <CompactValue def={NOTES_DEF} value={notes} />}
            </Box>
          );
        }

        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
            {ORIGINAL_DATA_KEYS.map(({ key, label, hint, multiline }) => (
              <Box key={key} sx={{ gridColumn: multiline ? '1 / -1' : 'auto' }}>
                <ProfileField
                  def={{ name: key, label, kind: KIND[key], hint }}
                  value={original[key] ?? ''}
                  disabled={!editing || saving}
                  onChange={(v) => setOriginal(key, String(v ?? ''))}
                />
              </Box>
            ))}
            <Box sx={{ gridColumn: '1 / -1' }}>
              <ProfileField
                def={NOTES_DEF}
                value={draft[FIELD_EXTRA_NOTES]}
                disabled={!editing || saving}
                onChange={(v) => setField(FIELD_EXTRA_NOTES, v)}
              />
            </Box>
          </Box>
        );
      }}
    </EditableSection>
    </>
  );
}
