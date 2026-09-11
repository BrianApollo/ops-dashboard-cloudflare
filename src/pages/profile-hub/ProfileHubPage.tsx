/**
 * ProfileHubPage - staff-facing view of the Airtable "Profiles" table.
 *
 * Works like the Products page: one profile picked from a dropdown, then a
 * stack of boxes, each with its own Edit / Cancel / Save.
 *
 *   In Setup - Box 1 "What we received", Box 2 "AdsPower", then the remaining
 *              SOP stages. Ends with the Final Verification dialog.
 *   Live     - every field grouped into boxes, for day-to-day upkeep.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
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

import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VerifiedIcon from '@mui/icons-material/Verified';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

import { ToggleTabs, type ToggleTabOption } from '../../ui/ToggleTabs';
import { ProfileSelector } from './ProfileSelector';
import { EditableSection } from './EditableSection';
import { ReceivedSection } from './ReceivedSection';
import { AdsPowerSection } from './AdsPowerSection';
import { StageSection, StageHeaderExtra } from './StageSection';
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

const GROUP_ACCENTS: Record<ProfileGroupDef['accent'], string> = {
  slate: '#64748b',
  blue: '#2563eb',
  violet: '#7c3aed',
  amber: '#d97706',
  teal: '#0d9488',
  rose: '#e11d48',
};

type DetailView = 'setup' | 'fields';
const DETAIL_VIEWS: ToggleTabOption<DetailView>[] = [
  { value: 'setup', label: 'Setup steps' },
  { value: 'fields', label: 'All fields' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function ProfileHubPage() {
  const [profiles, setProfiles] = useState<HubProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkedNames, setLinkedNames] = useState<Record<string, string>>({});
  const [detailView, setDetailView] = useState<DetailView>('setup');

  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [helpStage, setHelpStage] = useState<SopStage | null>(null);
  const [busy, setBusy] = useState(false);
  const [tokenChecking, setTokenChecking] = useState(false);

  // ---- load ----------------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfiles(await listHubProfiles());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchLinkedNames().then(setLinkedNames).catch(() => {});
  }, []);

  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? null,
    [profiles, selectedId],
  );

  useEffect(() => {
    setDetailView('setup');
  }, [selectedId]);

  // ---- saving ---------------------------------------------------------------
  const applyUpdated = (updated: HubProfile) =>
    setProfiles((list) => list.map((p) => (p.id === updated.id ? updated : p)));

  /** Every box saves through here: PATCH only the changed fields. */
  const saveFields = useCallback(
    async (changed: Record<string, unknown>) => {
      if (!selectedId || Object.keys(changed).length === 0) return;
      try {
        applyUpdated(await updateHubProfile(selectedId, changed));
        setToast('Saved');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
        throw err;
      }
    },
    [selectedId],
  );

  const handleUpload = async (field: string, file: File) => {
    if (!selected) return;
    try {
      const existing = (selected.fields[field] as AirtableAttachment[] | undefined) ?? [];
      applyUpdated(await uploadRecoveryCodes(selected.id, file, existing));
      setToast('File uploaded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleCreate = async () => {
    setBusy(true);
    try {
      const created = await createHubProfile({ 'Profile Name': 'New Profile', 'Profile Status': 'Inactive' });
      setProfiles((list) => [...list, created]);
      setSelectedId(created.id);
      setToast('Profile created — start with box 1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create profile');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await deleteHubProfile(selected.id);
      setProfiles((list) => list.filter((p) => p.id !== selected.id));
      setSelectedId(null);
      setDeleteOpen(false);
      setToast('Profile deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setBusy(true);
    try {
      await saveFields({
        [FIELD_SETUP_COMPLETE]: true,
        [FIELD_SETUP_COMPLETED_ON]: new Date().toISOString().slice(0, 10),
      });
      setVerifyOpen(false);
      setToast('Setup complete — profile is now live');
    } catch {
      /* surfaced by saveFields */
    } finally {
      setBusy(false);
    }
  };

  const handleCheckToken = async () => {
    if (!selected) return;
    setTokenChecking(true);
    const result = await checkProfileToken(String(selected.fields['Permanent Token'] ?? ''));
    setTokenChecking(false);
    await saveFields({ 'Token Valid': result.valid }).catch(() => {});
    setToast(result.valid ? `Token is valid — ${result.name ?? 'Facebook user'}` : `Token invalid: ${result.error}`);
  };

  // ---- render ---------------------------------------------------------------
  const fields = selected?.fields ?? {};
  const inSetup = selected ? !isSetupComplete(fields) : false;
  const done = selected ? stagesDone(fields) : 0;
  const percent = selected ? completeness(fields) : 0;
  const missing = selected ? missingFields(fields) : [];

  const stageHeader = (stage: SopStage) => (
    <StageHeaderExtra
      stage={stage}
      done={Boolean(fields[stage.doneField])}
      onToggleDone={(v) => saveFields({ [stage.doneField]: v }).catch(() => {})}
      onHelp={setHelpStage}
    />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header: selector + actions */}
      <Box component="header" sx={{ display: 'flex', alignItems: 'stretch', gap: 2 }}>
        {loading ? (
          <Paper variant="outlined" sx={{ flex: 1, display: 'flex', alignItems: 'center', px: 2, minHeight: 56 }}>
            <CircularProgress size={20} />
          </Paper>
        ) : (
          <ProfileSelector profiles={profiles} selected={selected} onSelect={setSelectedId} onCreate={handleCreate} />
        )}
        <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={load} disabled={loading} sx={{ flexShrink: 0 }}>
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!selected ? (
        <Paper variant="outlined" sx={{ p: 8, textAlign: 'center', color: 'text.secondary' }}>
          <PersonOutlineIcon sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            {loading ? 'Loading profiles…' : 'Pick a profile from the dropdown above, or create a new one.'}
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Status strip */}
          <Paper variant="outlined" sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => setStatusAnchor(e.currentTarget)}
              sx={{ textTransform: 'none' }}
            >
              Status: {String(fields['Profile Status'] ?? '—')}
            </Button>
            <Menu anchorEl={statusAnchor} open={Boolean(statusAnchor)} onClose={() => setStatusAnchor(null)}>
              {PROFILE_STATUSES.map((s) => (
                <MenuItem
                  key={s}
                  selected={fields['Profile Status'] === s}
                  onClick={() => {
                    setStatusAnchor(null);
                    saveFields({ 'Profile Status': s }).catch(() => {});
                  }}
                >
                  {s}
                </MenuItem>
              ))}
            </Menu>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={Boolean(fields['Hidden'])}
                  onChange={(e) => saveFields({ Hidden: e.target.checked }).catch(() => {})}
                />
              }
              label={<Typography variant="body2" color="text.secondary">Hidden from pickers</Typography>}
            />

            {inSetup && (
              <ToggleTabs value={detailView} options={DETAIL_VIEWS} onChange={setDetailView} size="small" />
            )}

            <Box sx={{ flex: 1 }} />

            <Box sx={{ minWidth: 180 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
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
                color={inSetup ? (done === SOP_STAGES.length ? 'success' : 'primary') : percent === 100 ? 'success' : 'warning'}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>

            {inSetup ? (
              <Tooltip title={done === SOP_STAGES.length ? 'Run the final verification checklist' : `Tick all ${SOP_STAGES.length} stages first`}>
                <span>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<VerifiedIcon />}
                    disabled={done !== SOP_STAGES.length || busy}
                    onClick={() => setVerifyOpen(true)}
                  >
                    Verify &amp; Complete
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button size="small" onClick={() => saveFields({ [FIELD_SETUP_COMPLETE]: false }).catch(() => {})} sx={{ textTransform: 'none' }}>
                Reopen setup
              </Button>
            )}

            <Tooltip title="Delete profile">
              <IconButton size="small" color="error" onClick={() => setDeleteOpen(true)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>

          {!inSetup && missing.length > 0 && (
            <Alert severity="warning" sx={{ py: 0.25 }}>
              Missing: {missing.join(', ')}
            </Alert>
          )}

          {/* Boxes */}
          {inSetup && detailView === 'setup' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <ReceivedSection values={fields} onSave={saveFields} />
              <AdsPowerSection values={fields} onSave={saveFields} headerExtra={stageHeader(SOP_STAGES[0])} />
              {SOP_STAGES.slice(1).map((stage) => (
                <StageSection
                  key={stage.number}
                  stage={stage}
                  boxNumber={stage.number + 1}
                  done={Boolean(fields[stage.doneField])}
                  onToggleDone={(v) => saveFields({ [stage.doneField]: v }).catch(() => {})}
                  onHelp={setHelpStage}
                  values={fields}
                  onSave={saveFields}
                  linkedNames={linkedNames}
                  onUpload={handleUpload}
                />
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
              {PROFILE_GROUPS.map((group) => (
                <Box key={group.key} sx={{ gridColumn: group.span === 'full' ? '1 / -1' : 'auto' }}>
                  <EditableSection
                    title={group.title}
                    subtitle={group.subtitle}
                    accent={GROUP_ACCENTS[group.accent]}
                    fields={group.fields}
                    columns={group.span === 'full' ? 4 : 2}
                    values={fields}
                    onSave={saveFields}
                    linkedNames={linkedNames}
                    onUpload={handleUpload}
                    headerExtra={
                      group.key === 'token' ? (
                        <>
                          {fields['Token Valid'] ? (
                            <Chip size="small" icon={<VerifiedIcon />} color="success" label="Token valid" />
                          ) : (
                            <Chip size="small" variant="outlined" label="Not verified" />
                          )}
                          <Button size="small" variant="text" onClick={handleCheckToken} disabled={tokenChecking} sx={{ textTransform: 'none' }}>
                            {tokenChecking ? 'Checking…' : 'Check with Facebook'}
                          </Button>
                        </>
                      ) : undefined
                    }
                  />
                </Box>
              ))}
            </Box>
          )}
        </>
      )}

      <StageHelpDrawer stage={helpStage} onClose={() => setHelpStage(null)} />

      {selected && (
        <VerifyDialog
          key={selected.id}
          open={verifyOpen}
          profileName={String(fields['Profile Name'] ?? '')}
          busy={busy}
          onClose={() => setVerifyOpen(false)}
          onConfirm={handleVerify}
        />
      )}

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete this profile?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            "{String(fields['Profile Name'] ?? '')}" will be permanently removed from Airtable. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={busy}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
