/**
 * Box 2 - "Add profile to AdsPower" (SOP stage 1).
 * Pick which AdsPower profile this is, record the AdsPower details, and
 * cross-check what AdsPower has against Airtable.
 *
 * AdsPower calls go through the local bridge (scripts/adspower-bridge.bat).
 */

import { useEffect, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

import { formLabelSx, textFieldEditModeSx, textFieldViewModeSx } from '../../components/products/composition/styles';
import { EditableSection } from './EditableSection';
import { isFilled } from './CompactValue';
import { listAdsPowerProfiles, getAdsPowerProfile, type AdsPowerProfile } from '../../services/adspower';
import { FIELD_INDEX } from '../../features/profile-hub/types';
import { FIELD_LINKED_ADSPROFILE } from '../../features/profile-hub/original';

interface AdsPowerSectionProps {
  values: Record<string, unknown>;
  onSave: (changed: Record<string, unknown>) => Promise<void>;
  headerExtra?: ReactNode;
}

/** Fields verified against the live API: 2FA comes back as `fakey`. */
type ApLive = AdsPowerProfile & { fakey?: string; ip?: string; ip_country?: string };

function proxyLabel(p: ApLive | null): string {
  const c = p?.user_proxy_config;
  if (!c || !c.proxy_host) return '';
  return c.proxy_port ? `${c.proxy_host}:${c.proxy_port}` : c.proxy_host;
}

const FIELDS = [FIELD_INDEX['Profile ID'], FIELD_INDEX['Proxy'], FIELD_INDEX['Profile 2FA']];

export function AdsPowerSection({ values, onSave, headerExtra }: AdsPowerSectionProps) {
  const [options, setOptions] = useState<AdsPowerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [apError, setApError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAdsPowerProfiles()
      .then((list) => {
        if (!cancelled) setOptions(list);
      })
      .catch(() => {
        if (!cancelled) setApError('unreachable');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Complete = the three fields filled AND an AdsPower profile linked.
  const complete =
    FIELDS.every((f) => isFilled(values[f.name])) && isFilled(values[FIELD_LINKED_ADSPROFILE]);

  return (
    <EditableSection
      title="2 · Add profile to AdsPower"
      subtitle="Day 0 · Profile, proxy and 2FA verified in AdsPower before any other work."
      accent="#2563eb"
      values={values}
      onSave={onSave}
      fields={FIELDS}
      complete={complete}
      headerExtra={headerExtra}
    >
      {({ editing, saving, compact, draft, setField }) => (
        <AdsPowerBody
          editing={editing}
          saving={saving}
          compact={compact}
          draft={draft}
          setField={setField}
          options={options}
          loading={loading}
          apError={apError}
        />
      )}
    </EditableSection>
  );
}

// -----------------------------------------------------------------------------

interface BodyProps {
  editing: boolean;
  saving: boolean;
  compact: boolean;
  draft: Record<string, unknown>;
  setField: (field: string, value: unknown) => void;
  options: AdsPowerProfile[];
  loading: boolean;
  apError: string | null;
}

function AdsPowerBody({ editing, saving, compact, draft, setField, options, loading, apError }: BodyProps) {
  const linkedId = String(draft[FIELD_LINKED_ADSPROFILE] ?? '');
  const [live, setLive] = useState<ApLive | null>(null);

  // Prefer the list (it already carries proxy / username / 2FA) — AdsPower
  // rate-limits to ~1 req/s, so a second call straight after the list trips it.
  useEffect(() => {
    if (!linkedId) {
      setLive(null);
      return;
    }
    const fromList = options.find((o) => o.user_id === linkedId);
    if (fromList) {
      setLive(fromList);
      return;
    }
    if (loading || apError) return;
    let cancelled = false;
    getAdsPowerProfile(linkedId).then((p) => {
      if (!cancelled) setLive(p);
    });
    return () => {
      cancelled = true;
    };
  }, [linkedId, options, loading, apError]);

  const selectedOption = options.find((o) => o.user_id === linkedId) ?? null;
  const at = (field: string) => String(draft[field] ?? '').trim();
  const same = (a: string, b: string) => Boolean(a) && a.toLowerCase() === b.toLowerCase();

  const apProxy = proxyLabel(live);
  const proxyOk = Boolean(apProxy) && at('Proxy').toLowerCase().includes(apProxy.toLowerCase());
  const apCountry = (live?.ip_country ?? '').toLowerCase();
  const apUser = (live?.username ?? '').trim();
  const loginOk = same(apUser, at('Profile Email')) || same(apUser, at('UID'));
  const apPassword = (live?.password ?? '').trim();
  const passwordOk = Boolean(apPassword) && apPassword === at('Profile FB Password');
  const ap2fa = (live?.fakey ?? live?.user_2fa ?? '').trim();
  const twoFaOk = Boolean(ap2fa) && ap2fa === at('Profile 2FA');

  const checks = live
    ? [
        { label: 'Proxy', ok: proxyOk, adsPower: apProxy || '(none set)', airtable: at('Proxy') || '(empty)', fix: apProxy && !proxyOk ? () => setField('Proxy', apProxy) : undefined },
        { label: 'IP is US', ok: apCountry === 'us', adsPower: live.ip ? `${live.ip} (${apCountry || '?'})` : '(no IP yet — open the profile once)', airtable: '', fix: undefined },
        { label: 'Login', ok: loginOk, adsPower: apUser || '(none set)', airtable: at('Profile Email') || at('UID') || '(empty)', fix: apUser && !loginOk ? () => setField(apUser.includes('@') ? 'Profile Email' : 'UID', apUser) : undefined },
        { label: 'Password', ok: passwordOk, adsPower: apPassword ? 'Set' : '(none set)', airtable: at('Profile FB Password') ? (passwordOk ? 'Matches' : 'Different') : '(empty)', fix: apPassword && !passwordOk ? () => setField('Profile FB Password', apPassword) : undefined },
        { label: '2FA secret', ok: twoFaOk, adsPower: ap2fa ? 'Set' : '(none set)', airtable: at('Profile 2FA') ? (twoFaOk ? 'Matches' : 'Different') : '(empty)', fix: ap2fa && !twoFaOk ? () => setField('Profile 2FA', ap2fa) : undefined },
      ]
    : [];

  // Collapsed: the linked profile as a value, and the checks as a single chip row.
  if (compact) {
    const passing = checks.filter((c) => c.ok).length;
    const linkedLabel = selectedOption
      ? `${selectedOption.name || selectedOption.user_id}${selectedOption.group_name ? ` · ${selectedOption.group_name}` : ''}`
      : linkedId;
    return (
      <Box sx={{ mt: 1.25, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
            AdsPower profile
          </Typography>
          <Typography variant="body2" noWrap>{linkedLabel}</Typography>
        </Box>
        {live ? (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              size="small"
              color={passing === checks.length ? 'success' : 'warning'}
              label={`${passing}/${checks.length} checks match AdsPower`}
              sx={{ height: 22 }}
            />
            {checks.filter((c) => !c.ok).map((c) => (
              <Chip key={c.label} size="small" variant="outlined" color="warning" icon={<ErrorOutlineIcon />} label={c.label} sx={{ height: 22 }} />
            ))}
          </Box>
        ) : apError ? (
          <Typography variant="caption" color="text.secondary">AdsPower not reachable on this PC — checks unavailable (press Edit for how to fix)</Typography>
        ) : null}
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={formLabelSx}>
        AdsPower profile
      </Typography>

      {apError ? (
        <Alert severity="warning" sx={{ py: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Can't reach AdsPower on this PC.
          </Typography>
          <Typography variant="body2" component="div">
            AdsPower's API only works on the computer it's installed on, and it blocks websites unless the
            bridge is running. On this PC:
            <Box component="ol" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
              <li>Make sure AdsPower is open.</li>
              <li>
                <Link href="/adspower-bridge.bat" download underline="always">
                  Download adspower-bridge.bat
                </Link>{' '}
                and double-click it — leave its window open.
              </li>
              <li>Press Edit here again.</li>
            </Box>
          </Typography>
          {linkedId && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Linked AdsPower id: {linkedId}
            </Typography>
          )}
        </Alert>
      ) : (
        <Autocomplete
          sx={{ maxWidth: 520 }}
          size="small"
          loading={loading}
          disabled={!editing || saving}
          options={options}
          value={selectedOption}
          onChange={(_, option) => setField(FIELD_LINKED_ADSPROFILE, option?.user_id ?? '')}
          getOptionLabel={(o) => `${o.name || o.user_id}${o.group_name ? ` · ${o.group_name}` : ''}`}
          isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={editing ? 'Choose the AdsPower profile…' : undefined}
              sx={editing ? textFieldEditModeSx : textFieldViewModeSx}
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
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={formLabelSx}>
            AdsPower vs Airtable
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {checks.map((c) => (
              <Box
                key={c.label}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: 1.5, border: '1px solid', borderColor: c.ok ? 'success.main' : 'warning.main' }}
              >
                {c.ok ? <CheckCircleIcon fontSize="small" color="success" /> : <ErrorOutlineIcon fontSize="small" color="warning" />}
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 90 }}>
                  {c.label}
                </Typography>
                <Box sx={{ flex: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" variant="outlined" label={`AdsPower: ${c.adsPower}`} />
                  {c.airtable && <Chip size="small" variant="outlined" label={`Airtable: ${c.airtable}`} />}
                </Box>
                {c.fix && editing && (
                  <Button size="small" onClick={c.fix} disabled={saving} sx={{ textTransform: 'none', flexShrink: 0 }}>
                    Use AdsPower value
                  </Button>
                )}
              </Box>
            ))}
          </Box>
          {!editing && checks.some((c) => c.fix) && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Press Edit to copy AdsPower values into Airtable.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
