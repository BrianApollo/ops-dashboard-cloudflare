/**
 * ProfileHubPage - staff-facing view of the Airtable "Profiles" table.
 *
 * Master/detail:
 *   left  - searchable profile list with a "data complete" indicator
 *   right - every field, grouped into cards, editable inline
 *
 * Standalone: nothing here is imported by the existing pages, and it only
 * reuses the shared Airtable client + theme.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { alpha, useTheme } from '@mui/material/styles';

import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UndoIcon from '@mui/icons-material/Undo';
import VerifiedIcon from '@mui/icons-material/Verified';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

import { ToggleTabs, type ToggleTabOption } from '../../ui/ToggleTabs';
import { ProfileField } from './ProfileField';
import {
  listHubProfiles,
  updateHubProfile,
  createHubProfile,
  deleteHubProfile,
  checkProfileToken,
  fetchLinkedNames,
} from '../../features/profile-hub/data';
import {
  PROFILE_GROUPS,
  completeness,
  missingFields,
  type HubProfile,
  type ProfileGroupDef,
} from '../../features/profile-hub/types';

// =============================================================================
// CONSTANTS
// =============================================================================

const LIST_WIDTH = 320;

const GROUP_ACCENTS: Record<ProfileGroupDef['accent'], string> = {
  slate: '#64748b',
  blue: '#2563eb',
  violet: '#7c3aed',
  amber: '#d97706',
  teal: '#0d9488',
  rose: '#e11d48',
};

type StatusFilter = 'all' | 'active' | 'incomplete';

const STATUS_TABS: ToggleTabOption<StatusFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'incomplete', label: 'Needs Info' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function ProfileHubPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [profiles, setProfiles] = useState<HubProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [linkedNames, setLinkedNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<StatusFilter>('all');
  const [tokenChecking, setTokenChecking] = useState(false);

  // ---- load ----------------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listHubProfiles();
      setProfiles(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Linked BM / Page names. Non-blocking: chips fall back to record IDs.
  useEffect(() => {
    fetchLinkedNames().then(setLinkedNames).catch(() => {});
  }, []);

  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? null,
    [profiles, selectedId],
  );

  // Reset the draft whenever a different profile is opened.
  useEffect(() => {
    setDraft(selected ? { ...selected.fields } : {});
  }, [selected]);

  const dirtyFields = useMemo(() => {
    if (!selected) return new Set<string>();
    const changed = new Set<string>();
    for (const key of Object.keys(draft)) {
      const before = selected.fields[key] ?? '';
      const after = draft[key] ?? '';
      if (JSON.stringify(before) !== JSON.stringify(after)) changed.add(key);
    }
    return changed;
  }, [draft, selected]);

  const isDirty = dirtyFields.size > 0;

  // ---- list filtering -------------------------------------------------------
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return profiles
      .filter((p) => {
        if (tab === 'active' && String(p.fields['Profile Status'] ?? '') !== 'Active') return false;
        if (tab === 'incomplete' && completeness(p.fields) === 100) return false;
        if (!query) return true;
        return [
          p.fields['Profile Name'],
          p.fields['Profile ID'],
          p.fields['Profile Email'],
          p.fields['UID'],
        ].some((v) => String(v ?? '').toLowerCase().includes(query));
      })
      .sort((a, b) =>
        String(a.fields['Profile Name'] ?? '').localeCompare(String(b.fields['Profile Name'] ?? '')),
      );
  }, [profiles, search, tab]);

  // ---- actions --------------------------------------------------------------
  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const changed: Record<string, unknown> = {};
      for (const key of dirtyFields) changed[key] = draft[key];
      const updated = await updateHubProfile(selected.id, changed);
      setProfiles((list) => list.map((p) => (p.id === updated.id ? updated : p)));
      setToast('Profile saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const created = await createHubProfile({
        'Profile Name': 'New Profile',
        'Profile Status': 'Inactive',
      });
      setProfiles((list) => [...list, created]);
      setSelectedId(created.id);
      setToast('Profile created - fill in the details');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteHubProfile(selected.id);
      setProfiles((list) => list.filter((p) => p.id !== selected.id));
      setSelectedId(null);
      setDeleteOpen(false);
      setToast('Profile deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckToken = async () => {
    if (!selected) return;
    setTokenChecking(true);
    const result = await checkProfileToken(String(draft['Permanent Token'] ?? ''));
    setTokenChecking(false);
    setDraft((d) => ({ ...d, 'Token Valid': result.valid }));
    setToast(
      result.valid
        ? `Token is valid - ${result.name ?? 'Facebook user'}`
        : `Token invalid: ${result.error}`,
    );
  };

  // ---- render ---------------------------------------------------------------
  const percent = selected ? completeness(draft) : 0;
  const missing = selected ? missingFields(draft) : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            Profile Hub
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Keep every Facebook profile's details accurate and up to date.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={load}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleCreate}>
            New Profile
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* ---------------- Left: profile list ---------------- */}
        <Paper
          variant="outlined"
          sx={{
            width: LIST_WIDTH,
            flexShrink: 0,
            borderRadius: 2,
            overflow: 'hidden',
            position: 'sticky',
            top: 16,
          }}
        >
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              size="small"
              placeholder="Search profiles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <ToggleTabs
              value={tab}
              options={STATUS_TABS}
              onChange={(value) => setTab(value)}
            />
          </Box>
          <Divider />

          <Box sx={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
            {loading ? (
              <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={22} />
              </Box>
            ) : filtered.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                No profiles match.
              </Typography>
            ) : (
              filtered.map((profile) => {
                const active = profile.id === selectedId;
                const pct = completeness(profile.fields);
                const status = String(profile.fields['Profile Status'] ?? '');
                return (
                  <Box
                    key={profile.id}
                    onClick={() => setSelectedId(profile.id)}
                    sx={{
                      px: 1.75,
                      py: 1.25,
                      cursor: 'pointer',
                      borderLeft: '3px solid',
                      borderColor: active ? 'primary.main' : 'transparent',
                      bgcolor: active
                        ? alpha(theme.palette.primary.main, isDark ? 0.16 : 0.07)
                        : 'transparent',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, isDark ? 0.1 : 0.04),
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          flexShrink: 0,
                          bgcolor: status === 'Active' ? 'success.main' : 'text.disabled',
                        }}
                      />
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontWeight: active ? 700 : 500, flex: 1 }}
                      >
                        {String(profile.fields['Profile Name'] ?? 'Untitled')}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: pct === 100 ? 'success.main' : 'warning.main',
                          fontWeight: 700,
                        }}
                      >
                        {pct}%
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ pl: 2 }}>
                      {String(profile.fields['Profile Email'] ?? profile.fields['Profile ID'] ?? '-')}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Box>
        </Paper>

        {/* ---------------- Right: detail ---------------- */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!selected ? (
            <Paper
              variant="outlined"
              sx={{ borderRadius: 2, p: 8, textAlign: 'center', color: 'text.secondary' }}
            >
              <PersonOutlineIcon sx={{ fontSize: 40, opacity: 0.4 }} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Select a profile on the left to view and edit its details.
              </Typography>
            </Paper>
          ) : (
            <>
              {/* Summary bar */}
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 220 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {String(draft['Profile Name'] ?? 'Untitled')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={String(draft['Profile Status'] ?? 'Unknown')}
                        color={draft['Profile Status'] === 'Active' ? 'success' : 'default'}
                      />
                      {draft['Token Valid'] ? (
                        <Chip size="small" icon={<VerifiedIcon />} color="info" label="Token valid" />
                      ) : (
                        <Chip size="small" variant="outlined" label="Token unverified" />
                      )}
                      {isDirty && (
                        <Chip size="small" color="warning" label={`${dirtyFields.size} unsaved`} />
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ minWidth: 200 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Data complete
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {percent}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={percent}
                      color={percent === 100 ? 'success' : 'warning'}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Discard changes">
                      <span>
                        <IconButton
                          size="small"
                          disabled={!isDirty}
                          onClick={() => setDraft({ ...selected.fields })}
                        >
                          <UndoIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Delete profile">
                      <IconButton size="small" color="error" onClick={() => setDeleteOpen(true)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<SaveIcon />}
                      disabled={!isDirty || saving}
                      onClick={handleSave}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </Box>
                </Box>

                {missing.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 1.5, py: 0.25 }}>
                    Missing: {missing.join(', ')}
                  </Alert>
                )}
              </Paper>

              {/* Field groups */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                  gap: 2,
                  alignItems: 'start',
                }}
              >
                {PROFILE_GROUPS.map((group) => {
                  const accent = GROUP_ACCENTS[group.accent];
                  const full = group.span === 'full';
                  return (
                    <Paper
                      key={group.key}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        overflow: 'hidden',
                        gridColumn: full ? '1 / -1' : 'auto',
                      }}
                    >
                      <Box
                        sx={{
                          px: 2,
                          py: 1.25,
                          borderLeft: '3px solid',
                          borderColor: accent,
                          bgcolor: alpha(accent, isDark ? 0.14 : 0.06),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {group.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {group.subtitle}
                          </Typography>
                        </Box>
                        {group.key === 'token' && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={handleCheckToken}
                            disabled={tokenChecking}
                          >
                            {tokenChecking ? 'Checking...' : 'Check with Facebook'}
                          </Button>
                        )}
                      </Box>
                      <Box
                        sx={{
                          p: 2,
                          display: 'grid',
                          gridTemplateColumns: full
                            ? { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }
                            : { xs: '1fr', sm: '1fr 1fr' },
                          gap: 2,
                        }}
                      >
                        {group.fields.map((def) => (
                          <Box key={def.name} sx={{ gridColumn: def.wide ? '1 / -1' : 'auto' }}>
                            <ProfileField
                              def={def}
                              value={draft[def.name]}
                              dirty={dirtyFields.has(def.name)}
                              linkedNames={linkedNames}
                              onChange={(value) => setDraft((d) => ({ ...d, [def.name]: value }))}
                            />
                          </Box>
                        ))}
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete this profile?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            "{String(draft['Profile Name'] ?? '')}" will be permanently removed from Airtable. This
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={saving}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
