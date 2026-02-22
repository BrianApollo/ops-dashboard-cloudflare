/**
 * AdsPowerSection - Profile sidebar widget for linking/viewing an AdsPower profile.
 *
 * States:
 *   - Not linked: shows "Connect" button → inline dropdown to pick + save
 *   - Linked (collapsed): shows profile name + Change button
 *   - Linked (expanded): shows live browser status, group, proxy, created date
 */

import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Collapse, CircularProgress,
  Select, MenuItem, Chip, IconButton,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  listAdsPowerProfiles,
  getAdsPowerBrowserStatus,
  getAdsPowerProfile,
} from '../../services/adspower';
import type { AdsPowerProfile } from '../../services/adspower';

// =============================================================================
// PROPS
// =============================================================================

interface AdsPowerSectionProps {
  profileId: string;
  currentAdsPowerId: string; // '' if not linked
  onSave: (adsPowerUserId: string) => Promise<void>;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AdsPowerSection({ profileId: _profileId, currentAdsPowerId, onSave }: AdsPowerSectionProps) {
  const theme = useTheme();

  const isLinked = Boolean(currentAdsPowerId);

  // Connect panel (shown when not linked and user clicked Connect)
  const [connecting, setConnecting] = useState(false);
  const [allProfiles, setAllProfiles] = useState<AdsPowerProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Linked expanded panel
  const [expanded, setExpanded] = useState(false);
  const [liveProfile, setLiveProfile] = useState<AdsPowerProfile | null>(null);
  const [browserStatus, setBrowserStatus] = useState<'Active' | 'Inactive' | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);

  // When "Connect" is clicked, load all profiles
  const handleOpenConnect = async () => {
    setConnecting(true);
    setLoadError('');
    setLoadingProfiles(true);
    try {
      const profiles = await listAdsPowerProfiles();
      setAllProfiles(profiles);
    } catch (e) {
      setLoadError('Could not reach AdsPower — is it running?');
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleCancelConnect = () => {
    setConnecting(false);
    setSelectedId('');
    setLoadError('');
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await onSave(selectedId);
      setConnecting(false);
      setSelectedId('');
    } finally {
      setSaving(false);
    }
  };

  // When linked and expanded, load live data
  useEffect(() => {
    if (!expanded || !isLinked) return;
    let cancelled = false;
    setLoadingLive(true);
    setBrowserStatus(null);
    setLiveProfile(null);

    Promise.all([
      getAdsPowerProfile(currentAdsPowerId),
      getAdsPowerBrowserStatus(currentAdsPowerId),
    ]).then(([profile, status]) => {
      if (!cancelled) {
        setLiveProfile(profile);
        setBrowserStatus(status);
      }
    }).catch(() => {
      // silently ignore if AdsPower is unreachable
    }).finally(() => {
      if (!cancelled) setLoadingLive(false);
    });

    return () => { cancelled = true; };
  }, [expanded, isLinked, currentAdsPowerId]);

  // Reset expanded when profile changes
  useEffect(() => {
    setExpanded(false);
    setConnecting(false);
  }, [currentAdsPowerId]);

  const sectionHeaderSx = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    px: 2, py: 1.5, cursor: 'pointer',
    '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.03) },
    borderTop: '1px solid', borderColor: 'divider',
  };

  // AdsPower "logo" placeholder — simple colored box with "AP"
  const ApIcon = () => (
    <Box sx={{
      width: 18, height: 18, borderRadius: 0.5,
      bgcolor: alpha(theme.palette.primary.main, 0.12),
      color: 'primary.main', fontSize: 9, fontWeight: 800,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      AP
    </Box>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // NOT LINKED
  // ──────────────────────────────────────────────────────────────────────────
  if (!isLinked) {
    return (
      <Box>
        {/* Header */}
        <Box sx={sectionHeaderSx} onClick={connecting ? undefined : handleOpenConnect}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ApIcon />
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>AdsPower</Typography>
          </Box>
          {!connecting && (
            <Button size="small" variant="outlined" sx={{ fontSize: 11, py: 0.25, px: 1, textTransform: 'none' }}>
              Connect
            </Button>
          )}
        </Box>

        {/* Connect panel */}
        <Collapse in={connecting}>
          <Box sx={{ px: 2, pb: 1.5 }}>
            {loadError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                {loadError}
              </Typography>
            )}

            {loadingProfiles ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                <CircularProgress size={14} />
                <Typography variant="caption" color="text.secondary">Loading profiles...</Typography>
              </Box>
            ) : (
              <>
                <Select
                  fullWidth
                  size="small"
                  displayEmpty
                  value={selectedId}
                  onChange={(e: SelectChangeEvent) => setSelectedId(e.target.value)}
                  sx={{ mb: 1.5, fontSize: 12 }}
                >
                  <MenuItem value="" disabled>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Select an AdsPower profile...</Typography>
                  </MenuItem>
                  {allProfiles.map(p => (
                    <MenuItem key={p.user_id} value={p.user_id} sx={{ fontSize: 12 }}>
                      {p.name || p.user_id}
                    </MenuItem>
                  ))}
                </Select>

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button size="small" onClick={handleCancelConnect} sx={{ fontSize: 11, textTransform: 'none' }}>
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSave}
                    disabled={!selectedId || saving}
                    startIcon={saving ? <CircularProgress size={12} /> : undefined}
                    sx={{ fontSize: 11, textTransform: 'none' }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Collapse>
      </Box>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LINKED
  // ──────────────────────────────────────────────────────────────────────────

  // Find the display name from already-loaded live profile, or show the ID
  const displayName = liveProfile?.name || currentAdsPowerId;

  return (
    <Box>
      {/* Header — click to expand/collapse */}
      <Box sx={sectionHeaderSx} onClick={() => setExpanded(prev => !prev)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <ApIcon />
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); handleOpenConnect(); }}
            sx={{ fontSize: 11, py: 0.25, px: 1, textTransform: 'none', color: 'text.secondary' }}
          >
            Change
          </Button>
          <ExpandMoreIcon
            sx={{
              fontSize: 18, color: 'text.secondary',
              transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.2s',
            }}
          />
        </Box>
      </Box>

      {/* Change panel (reuse connecting state) */}
      <Collapse in={connecting}>
        <Box sx={{ px: 2, pb: 1.5 }}>
          {loadError && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
              {loadError}
            </Typography>
          )}
          {loadingProfiles ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">Loading profiles...</Typography>
            </Box>
          ) : (
            <>
              <Select
                fullWidth
                size="small"
                displayEmpty
                value={selectedId}
                onChange={(e: SelectChangeEvent) => setSelectedId(e.target.value)}
                sx={{ mb: 1.5, fontSize: 12 }}
              >
                <MenuItem value="" disabled>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Select an AdsPower profile...</Typography>
                </MenuItem>
                {allProfiles.map(p => (
                  <MenuItem key={p.user_id} value={p.user_id} sx={{ fontSize: 12 }}>
                    {p.name || p.user_id}
                  </MenuItem>
                ))}
              </Select>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={handleCancelConnect} sx={{ fontSize: 11, textTransform: 'none' }}>
                  Cancel
                </Button>
                <Button
                  size="small" variant="contained" onClick={handleSave}
                  disabled={!selectedId || saving}
                  startIcon={saving ? <CircularProgress size={12} /> : undefined}
                  sx={{ fontSize: 11, textTransform: 'none' }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Collapse>

      {/* Expanded live data */}
      <Collapse in={expanded && !connecting}>
        <Box sx={{ px: 2, pb: 1.5 }}>
          {loadingLive ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">Loading live data...</Typography>
            </Box>
          ) : (
            <>
              {/* Browser status */}
              <LiveRow label="Browser">
                {browserStatus === 'Active' ? (
                  <Chip label="Active" size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(theme.palette.success.main, 0.12), color: 'success.main', fontWeight: 700 }} />
                ) : browserStatus === 'Inactive' ? (
                  <Chip label="Inactive" size="small" sx={{ fontSize: 10, height: 18, bgcolor: alpha(theme.palette.grey[500], 0.12), color: 'text.secondary', fontWeight: 600 }} />
                ) : (
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>—</Typography>
                )}
              </LiveRow>

              {liveProfile && (
                <>
                  {liveProfile.group_name && (
                    <LiveRow label="Group">
                      <Typography variant="caption" sx={{ fontSize: 11 }}>{liveProfile.group_name}</Typography>
                    </LiveRow>
                  )}

                  <LiveRow label="User ID">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: 11, fontFamily: 'monospace' }}>{liveProfile.user_id}</Typography>
                      <IconButton size="small" onClick={() => navigator.clipboard.writeText(liveProfile.user_id)} sx={{ p: 0.25 }}>
                        <ContentCopyIcon sx={{ fontSize: 11 }} />
                      </IconButton>
                    </Box>
                  </LiveRow>

                  {liveProfile.username && (
                    <LiveRow label="Username">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ fontSize: 11, fontFamily: 'monospace' }}>{liveProfile.username}</Typography>
                        <IconButton size="small" onClick={() => navigator.clipboard.writeText(liveProfile.username)} sx={{ p: 0.25 }}>
                          <ContentCopyIcon sx={{ fontSize: 11 }} />
                        </IconButton>
                      </Box>
                    </LiveRow>
                  )}

                  {liveProfile.password && (
                    <SecretRow label="Password" value={liveProfile.password} />
                  )}

                  {liveProfile.user_2fa && (
                    <SecretRow label="2FA Key" value={liveProfile.user_2fa} />
                  )}

                  {liveProfile.user_proxy_config?.proxy_host && (
                    <LiveRow label="IP">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ fontSize: 11, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                          {liveProfile.user_proxy_config.proxy_host}
                        </Typography>
                        <IconButton size="small" onClick={() => navigator.clipboard.writeText(liveProfile.user_proxy_config.proxy_host)} sx={{ p: 0.25 }}>
                          <ContentCopyIcon sx={{ fontSize: 11 }} />
                        </IconButton>
                      </Box>
                    </LiveRow>
                  )}

                  {liveProfile.created_time > 0 && (
                    <LiveRow label="Created">
                      <Typography variant="caption" sx={{ fontSize: 11 }}>
                        {new Date(liveProfile.created_time * 1000).toLocaleDateString()}
                      </Typography>
                    </LiveRow>
                  )}

                  {liveProfile.remark && (
                    <LiveRow label="Note">
                      <Typography variant="caption" sx={{ fontSize: 11 }}>{liveProfile.remark}</Typography>
                    </LiveRow>
                  )}
                </>
              )}
            </>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// LIVE ROW — label + value, same styling as SetupRow
// ──────────────────────────────────────────────────────────────────────────────

function LiveRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      py: 0.5, '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' },
    }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SECRET ROW — masked value with reveal toggle + copy
// ──────────────────────────────────────────────────────────────────────────────

function SecretRow({ label, value }: { label: string; value: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <LiveRow label={label}>
      <Typography variant="caption" sx={{ fontSize: 11, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
        {visible ? value : '••••••••••••'}
      </Typography>
      <IconButton size="small" onClick={() => setVisible(v => !v)} sx={{ p: 0.25 }}>
        {visible ? <VisibilityOffIcon sx={{ fontSize: 11 }} /> : <VisibilityIcon sx={{ fontSize: 11 }} />}
      </IconButton>
      <IconButton size="small" onClick={() => navigator.clipboard.writeText(value)} sx={{ p: 0.25 }}>
        <ContentCopyIcon sx={{ fontSize: 11 }} />
      </IconButton>
    </LiveRow>
  );
}
