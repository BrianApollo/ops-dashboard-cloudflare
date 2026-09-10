/**
 * ProfileHubPage - staff-facing view of the Airtable "Profiles" table.
 *
 * Two modes of the same record:
 *   In Setup - the nine-stage SOP checklist, each stage carrying the fields
 *              it edits. Ends with the Final Verification dialog.
 *   Live     - every field grouped into cards, for day-to-day upkeep.
 *
 * Master/detail: searchable list on the left (In Setup / Live tabs, grouped
 * by status), the selected profile on the right.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
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
import ChecklistIcon from '@mui/icons-material/Checklist';

import { ToggleTabs, type ToggleTabOption } from '../../ui/ToggleTabs';
import { ProfileField } from './ProfileField';
import { SetupChecklist } from './SetupChecklist';
import { Stage1Panel } from './Stage1Panel';
import { StageHelpDrawer } from './StageHelpDrawer';
import { VerifyDialog } from './VerifyDialog';
import {
  listHubProfiles,
  updateHubProfile,
  createHubProfile,
  deleteHubProfile,
  checkProfileToken,
  fetchLinkedNames,
  uploadRecoveryCodes,
  type AirtableAttachment,
} from '../../features/profile-hub/data';
import {
  PROFILE_GROUPS,
  PROFILE_STATUSES,
  completeness,
  missingFields,
  type HubProfile,
  type ProfileGroupDef,
} from '../../features/profile-hub/types';
import {
  SOP_STAGES,
  FIELD_SETUP_COMPLETE,
  FIELD_SETUP_COMPLETED_ON,
  stagesDone,
  isSetupComplete,
  type SopStage,
} from '../../features/profile-hub/sop';

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

/** Dot colour for each status section header in the list. */
const STATUS_DOT: Record<string, string> = {
  Active: 'success.main',
  Inactive: 'text.disabled',
  Banned: 'error.main',
  Restricted: 'warning.main',
};

type ListTab = 'setup' | 'live';
const LIST_TABS: ToggleTabOption<ListTab>[] = [
  { value: 'setup', label: 'In Setup' },
  { value: 'live', label: 'Live' },
];

type DetailView = 'checklist' | 'fields';
const DETAIL_VIEWS: ToggleTabOption<DetailView>[] = [
  { value: 'checklist', label: 'Setup checklist' },
  { value: 'fields', label: 'All fields' },
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
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [helpStage, setHelpStage] = useState<SopStage | null>(null);

  const [linkedNames, setLinkedNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<ListTab>('setup');
  const [detailView, setDetailView] = useState<DetailView>('checklist');
  const [tokenChecking, setTokenChecking] = useState(false);

  // ---- load ----------------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listHubProfiles();
      setProfiles(data);
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

  // Reset the draft (and the view) whenever a different profile is opened.
  // Keyed on the id, not the object, so a save/upload that replaces the
  // profile object doesn't wipe other unsaved edits.
  useEffect(() => {
    const profile = profiles.find((p) => p.id === selectedId);
    setDraft(profile ? { ...profile.fields } : {});
    setDetailView('checklist');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

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
  const counts = useMemo(
    () => ({
      setup: profiles.filter((p) => !isSetupComplete(p.fields)).length,
      live: profiles.filter((p) => isSetupComplete(p.fields)).length,
    }),
    [profiles],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return profiles
      .filter((p) => {
        if (isSetupComplete(p.fields) !== (tab === 'live')) return false;
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

  // Select the first visible profile when nothing (or nothing visible) is selected.
  useEffect(() => {
    if (loading) return;
    if (selectedId && filtered.some((p) => p.id === selectedId)) return;
    setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId, loading]);

  /**
   * Split the filtered list into status sections, in PROFILE_STATUSES order.
   * Anything with an unrecognised/blank status falls into "No Status" last.
   */
  const sections = useMemo(() => {
    const buckets = new Map<string, HubProfile[]>();
    for (const profile of filtered) {
      const status = String(profile.fields['Profile Status'] ?? '').trim() || 'No Status';
      const list = buckets.get(status);
      if (list) list.push(profile);
      else buckets.set(status, [profile]);
    }

    const order = [...PROFILE_STATUSES, 'No Status'] as readonly string[];
    return [...buckets.entries()]
      .sort(([a], [b]) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
      })
      .map(([status, items]) => ({ status, items }));
  }, [filtered]);

  // ---- actions --------------------------------------------------------------
  const applyUpdated = (updated: HubProfile) => {
    setProfiles((list) => list.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const changed: Record<string, unknown> = {};
      for (const key of dirtyFields) changed[key] = draft[key];
      const updated = await updateHubProfile(selected.id, changed);
      applyUpdated(updated);
      setDraft({ ...updated.fields });
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
      setTab('setup');
      setSelectedId(created.id);
      setToast('Profile created - start with stage 1');
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

  /** Final verification passed: flag complete and stamp the date. Saves immediately. */
  const handleVerify = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const changed: Record<string, unknown> = {};
      for (const key of dirtyFields) changed[key] = draft[key];
      changed[FIELD_SETUP_COMPLETE] = true;
      changed[FIELD_SETUP_COMPLETED_ON] = new Date().toISOString().slice(0, 10);
      const updated = await updateHubProfile(selected.id, changed);
      applyUpdated(updated);
      setDraft({ ...updated.fields });
      setVerifyOpen(false);
      setTab('live');
      setToast('Setup complete - profile is now live');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark complete');
    } finally {
      setSaving(false);
    }
  };

  /** Send a live profile back to the checklist. */
  const handleReopen = () => {
    setDraft((d) => ({ ...d, [FIELD_SETUP_COMPLETE]: false }));
  };

  /** Attachments save straight away — there is no "draft" for a file. */
  const handleUpload = async (field: string, file: File) => {
    if (!selected) return;
    try {
      const existing = (selected.fields[field] as AirtableAttachment[] | undefined) ?? [];
      const updated = await uploadRecoveryCodes(selected.id, file, existing);
      applyUpdated(updated);
      setDraft((d) => ({ ...d, [field]: updated.fields[field] }));
      setToast('File uploaded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
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

  const setField = (field: string, value: unknown) =>
    setDraft((d) => ({ ...d, [field]: value }));

  // ---- render ---------------------------------------------------------------
  const inSetup = selected ? !isSetupComplete(draft) : false;
  const done = selected ? stagesDone(draft) : 0;
  const percent = selected ? completeness(draft) : 0;
  const missing = selected ? missingFields(draft) : [];
  const showChecklist = inSetup && detailView === 'checklist';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            Profile Hub
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set up new Facebook profiles step by step, and keep live ones accurate.
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
              options={LIST_TABS.map((t) => ({ ...t, count: counts[t.value] }))}
              onChange={setTab}
              fullWidth
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
                {tab === 'setup' ? 'No profiles in setup.' : 'No live profiles yet.'}
              </Typography>
            ) : (
              sections.map((section) => (
                <Box key={section.status}>
                  {/* Status section header */}
                  <Box
                    sx={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      px: 1.75,
                      py: 0.75,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      bgcolor: 'background.default',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        flexShrink: 0,
                        bgcolor: STATUS_DOT[section.status] ?? 'text.disabled',
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                    >
                      {section.status}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {section.items.length}
                    </Typography>
                  </Box>

                  {section.items.map((profile) => {
                    const active = profile.id === selectedId;
                    const setupProfile = !isSetupComplete(profile.fields);
                    const stageCount = stagesDone(profile.fields);
                    const pct = completeness(profile.fields);
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
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ fontWeight: active ? 700 : 500, flex: 1 }}
                          >
                            {String(profile.fields['Profile Name'] ?? 'Untitled')}
                          </Typography>
                          {setupProfile ? (
                            <Typography
                              variant="caption"
                              sx={{
                                color: stageCount === SOP_STAGES.length ? 'success.main' : 'primary.main',
                                fontWeight: 700,
                              }}
                            >
                              {stageCount}/{SOP_STAGES.length}
                            </Typography>
                          ) : (
                            <Typography
                              variant="caption"
                              sx={{
                                color: pct === 100 ? 'success.main' : 'warning.main',
                                fontWeight: 700,
                              }}
                            >
                              {pct}%
                            </Typography>
                          )}
                        </Box>
                        {setupProfile ? (
                          <LinearProgress
                            variant="determinate"
                            value={(stageCount / SOP_STAGES.length) * 100}
                            sx={{ height: 3, borderRadius: 2, mt: 0.75 }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {String(
                              profile.fields['Profile Email'] ?? profile.fields['Profile ID'] ?? '-',
                            )}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              ))
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
              {/* Summary bar — sticky so Save is always reachable */}
              <Paper
                variant="outlined"
                sx={{ borderRadius: 2, p: 2, position: 'sticky', top: 16, zIndex: 2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 220 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {String(draft['Profile Name'] ?? 'Untitled')}
                      </Typography>
                      {inSetup ? (
                        <Chip size="small" icon={<ChecklistIcon />} label="In setup" color="primary" />
                      ) : (
                        <Chip size="small" icon={<VerifiedIcon />} label="Live" color="success" />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <TextField
                        select
                        size="small"
                        label="Status"
                        value={String(draft['Profile Status'] ?? 'Active')}
                        onChange={(e) => setField('Profile Status', e.target.value)}
                        sx={{ minWidth: 130 }}
                      >
                        {PROFILE_STATUSES.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>

                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={Boolean(draft['Hidden'])}
                            onChange={(e) => setField('Hidden', e.target.checked)}
                          />
                        }
                        label={
                          <Typography variant="body2" color="text.secondary">
                            Hidden from pickers
                          </Typography>
                        }
                      />

                      {isDirty && (
                        <Chip size="small" color="warning" label={`${dirtyFields.size} unsaved`} />
                      )}
                    </Box>
                  </Box>

                  {/* Progress */}
                  <Box sx={{ minWidth: 200 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {inSetup ? 'Setup progress' : 'Data complete'}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {inSetup ? `${done} / ${SOP_STAGES.length}` : `${percent}%`}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={inSetup ? (done / SOP_STAGES.length) * 100 : percent}
                      color={
                        inSetup
                          ? done === SOP_STAGES.length
                            ? 'success'
                            : 'primary'
                          : percent === 100
                            ? 'success'
                            : 'warning'
                      }
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {inSetup ? (
                      <Tooltip
                        title={
                          done === SOP_STAGES.length
                            ? 'Run the final verification checklist'
                            : `Tick all ${SOP_STAGES.length} stages first`
                        }
                      >
                        <span>
                          <Button
                            variant="outlined"
                            color="success"
                            size="small"
                            startIcon={<VerifiedIcon />}
                            disabled={done !== SOP_STAGES.length || saving}
                            onClick={() => setVerifyOpen(true)}
                          >
                            Verify &amp; Complete
                          </Button>
                        </span>
                      </Tooltip>
                    ) : (
                      <Button size="small" onClick={handleReopen} sx={{ textTransform: 'none' }}>
                        Reopen setup
                      </Button>
                    )}
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

                {/* Setup profiles can flip between the checklist and the full field view */}
                {inSetup && (
                  <Box sx={{ mt: 1.5 }}>
                    <ToggleTabs
                      value={detailView}
                      options={DETAIL_VIEWS}
                      onChange={setDetailView}
                      size="small"
                    />
                  </Box>
                )}

                {!inSetup && missing.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 1.5, py: 0.25 }}>
                    Missing: {missing.join(', ')}
                  </Alert>
                )}
              </Paper>

              {showChecklist ? (
                <SetupChecklist
                  draft={draft}
                  dirtyFields={dirtyFields}
                  linkedNames={linkedNames}
                  onChange={setField}
                  onUpload={handleUpload}
                  onHelp={setHelpStage}
                  renderExtra={(stage) =>
                    stage.number === 1 ? <Stage1Panel draft={draft} setField={setField} /> : null
                  }
                />
              ) : (
                /* Field groups */
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                              {draft['Token Valid'] ? (
                                <Chip
                                  size="small"
                                  icon={<VerifiedIcon />}
                                  color="success"
                                  label="Token valid"
                                />
                              ) : (
                                <Chip size="small" variant="outlined" label="Not verified" />
                              )}
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={handleCheckToken}
                                disabled={tokenChecking}
                              >
                                {tokenChecking ? 'Checking...' : 'Check with Facebook'}
                              </Button>
                            </Box>
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
                                onChange={(value) => setField(def.name, value)}
                                onUpload={
                                  def.kind === 'attachments'
                                    ? (file) => handleUpload(def.name, file)
                                    : undefined
                                }
                              />
                            </Box>
                          ))}
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Stage help */}
      <StageHelpDrawer stage={helpStage} onClose={() => setHelpStage(null)} />

      {/* Final verification */}
      {selected && (
        <VerifyDialog
          key={selected.id}
          open={verifyOpen}
          profileName={String(draft['Profile Name'] ?? '')}
          busy={saving}
          onClose={() => setVerifyOpen(false)}
          onConfirm={handleVerify}
        />
      )}

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
