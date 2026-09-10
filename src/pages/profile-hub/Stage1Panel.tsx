/**
 * Stage1Panel - extras under the "Add profile to AdsPower" checklist row.
 *
 *  1. As received  - the credentials the profile arrived with, stored as JSON
 *                    in "Original Data" (+ free-text "Extra Notes"). Kept
 *                    forever, because stages 3-6 overwrite the live fields.
 *  2. AdsPower     - pick which AdsPower profile this is, then cross-check
 *                    what AdsPower has against what Airtable has.
 */

import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

import {
  listAdsPowerProfiles,
  getAdsPowerProfile,
  type AdsPowerProfile,
} from '../../services/adspower';
import {
  FIELD_ORIGINAL_DATA,
  FIELD_EXTRA_NOTES,
  FIELD_LINKED_ADSPROFILE,
  ORIGINAL_DATA_KEYS,
  parseOriginalData,
  type OriginalData,
} from '../../features/profile-hub/original';

interface Stage1PanelProps {
  draft: Record<string, unknown>;
  setField: (field: string, value: unknown) => void;
}

/** Original-data key -> the live profile field it seeds on day 0. */
const SEEDS: Partial<Record<keyof OriginalData, string>> = {
  userId: 'UID',
  password: 'Profile FB Password',
  twoFaKey: 'Profile 2FA',
  email: 'Profile Email',
  emailPassword: 'Profile Email Password',
  recoveryEmail: 'Profile Security Email',
};

function proxyLabel(p: AdsPowerProfile | null): string {
  const c = p?.user_proxy_config;
  if (!c || !c.proxy_host) return '';
  return c.proxy_port ? `${c.proxy_host}:${c.proxy_port}` : c.proxy_host;
}

export function Stage1Panel({ draft, setField }: Stage1PanelProps) {
  // ---- as received ----------------------------------------------------------
  const original = useMemo(() => parseOriginalData(draft[FIELD_ORIGINAL_DATA]), [draft]);

  const setOriginal = (key: keyof OriginalData, value: string) => {
    setField(FIELD_ORIGINAL_DATA, JSON.stringify({ ...original, [key]: value }, null, 2));
  };

  const hasOriginal = Object.values(original).some((v) => v && v.trim());

  const seedLiveFields = () => {
    for (const [key, field] of Object.entries(SEEDS) as Array<[keyof OriginalData, string]>) {
      const value = original[key];
      if (value && value.trim()) setField(field, value.trim());
    }
  };

  // ---- adspower -------------------------------------------------------------
  const linkedId = String(draft[FIELD_LINKED_ADSPROFILE] ?? '');
  const [options, setOptions] = useState<AdsPowerProfile[]>([]);
  const [live, setLive] = useState<AdsPowerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [apError, setApError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setApError(null);
    listAdsPowerProfiles()
      .then((list) => {
        if (!cancelled) setOptions(list);
      })
      .catch(() => {
        if (!cancelled) setApError('Could not reach AdsPower — is it running on this machine?');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!linkedId) {
      setLive(null);
      return;
    }
    let cancelled = false;
    getAdsPowerProfile(linkedId).then((p) => {
      if (!cancelled) setLive(p);
    });
    return () => {
      cancelled = true;
    };
  }, [linkedId]);

  const selectedOption = options.find((o) => o.user_id === linkedId) ?? null;

  // Cross-checks: what AdsPower says vs what Airtable says.
  const apProxy = proxyLabel(live);
  const atProxy = String(draft['Proxy'] ?? '').trim();
  const proxyOk = Boolean(apProxy) && atProxy.toLowerCase().includes(apProxy.toLowerCase());

  const apUser = (live?.username ?? '').trim();
  const atEmail = String(draft['Profile Email'] ?? '').trim();
  const emailOk = Boolean(apUser) && apUser.toLowerCase() === atEmail.toLowerCase();

  const ap2fa = Boolean(live?.user_2fa);
  const at2fa = Boolean(String(draft['Profile 2FA'] ?? '').trim());

  const checks = live
    ? [
        {
          label: 'Proxy',
          ok: proxyOk,
          adsPower: apProxy || '(none set)',
          airtable: atProxy || '(empty)',
          fix: apProxy && !proxyOk ? () => setField('Proxy', apProxy) : undefined,
        },
        {
          label: 'Login email',
          ok: emailOk,
          adsPower: apUser || '(none set)',
          airtable: atEmail || '(empty)',
          fix: apUser && !emailOk ? () => setField('Profile Email', apUser) : undefined,
        },
        {
          label: '2FA',
          ok: ap2fa && at2fa,
          adsPower: ap2fa ? 'Set' : 'Not set',
          airtable: at2fa ? 'Set' : 'Empty',
          fix: live?.user_2fa && !at2fa ? () => setField('Profile 2FA', live.user_2fa) : undefined,
        },
      ]
    : [];

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Divider />

      {/* ---- As received ---- */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              As received
            </Typography>
            <Typography variant="caption" color="text.secondary">
              What the profile came with on day 0. Kept for good — the live fields get replaced in
              stages 3–6.
            </Typography>
          </Box>
          <Button size="small" variant="outlined" disabled={!hasOriginal} onClick={seedLiveFields}>
            Copy into profile fields
          </Button>
        </Box>

        <Box
          sx={{
            mt: 1.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 1.5,
          }}
        >
          {ORIGINAL_DATA_KEYS.map(({ key, label, hint, multiline }) => (
            <Box key={key} sx={{ gridColumn: multiline ? '1 / -1' : 'auto' }}>
              <TextField
                fullWidth
                size="small"
                label={label}
                helperText={hint}
                value={original[key] ?? ''}
                onChange={(e) => setOriginal(key, e.target.value)}
                multiline={multiline}
                minRows={multiline ? 3 : undefined}
                InputProps={
                  multiline
                    ? { sx: { fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' } }
                    : undefined
                }
              />
            </Box>
          ))}
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField
              fullWidth
              size="small"
              label="Extra notes"
              helperText="Anything else that came with the profile"
              value={String(draft[FIELD_EXTRA_NOTES] ?? '')}
              onChange={(e) => setField(FIELD_EXTRA_NOTES, e.target.value)}
              multiline
              minRows={2}
            />
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* ---- AdsPower ---- */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          AdsPower profile
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Pick the AdsPower profile this is, then check what AdsPower has matches Airtable.
        </Typography>

        {apError ? (
          <Alert severity="warning" sx={{ mt: 1.5, py: 0.25 }}>
            {apError}
            {linkedId && ` Linked AdsPower id: ${linkedId}`}
          </Alert>
        ) : (
          <Autocomplete
            sx={{ mt: 1.5, maxWidth: 520 }}
            size="small"
            loading={loading}
            options={options}
            value={selectedOption}
            onChange={(_, option) => setField(FIELD_LINKED_ADSPROFILE, option?.user_id ?? '')}
            getOptionLabel={(o) => `${o.name || o.user_id}${o.group_name ? ` · ${o.group_name}` : ''}`}
            isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="AdsPower profile"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress size={16} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        )}

        {live && (
          <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {checks.map((c) => (
              <Box
                key={c.label}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: c.ok ? 'success.main' : 'warning.main',
                }}
              >
                {c.ok ? (
                  <CheckCircleIcon fontSize="small" color="success" />
                ) : (
                  <ErrorOutlineIcon fontSize="small" color="warning" />
                )}
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 90 }}>
                  {c.label}
                </Typography>
                <Box sx={{ flex: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" variant="outlined" label={`AdsPower: ${c.adsPower}`} />
                  <Chip size="small" variant="outlined" label={`Airtable: ${c.airtable}`} />
                </Box>
                {c.fix && (
                  <Button size="small" onClick={c.fix} sx={{ textTransform: 'none', flexShrink: 0 }}>
                    Use AdsPower value
                  </Button>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
