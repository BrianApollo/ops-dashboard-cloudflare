/**
 * CloneCampaignDialog - Pick a launched campaign of the same product to clone
 * its setup and creatives into the launcher.
 */

import { useState, useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import VideocamIcon from '@mui/icons-material/Videocam';
import ImageIcon from '@mui/icons-material/Image';
import type { CloneCandidate } from '../../features/campaigns/launch/useLaunchCloneCampaign';

// =============================================================================
// TYPES
// =============================================================================

interface CloneCampaignDialogProps {
  open: boolean;
  productName: string;
  candidates: CloneCandidate[];
  onClose: () => void;
  onClone: (sourceCampaignId: string) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CloneCampaignDialog({ open, productName, candidates, onClose, onClone }: CloneCampaignDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) =>
      [c.name, c.redtrackName, c.adAccountName].some((v) => v?.toLowerCase().includes(q))
    );
  }, [candidates, search]);

  const handleClose = () => {
    setSearch('');
    setSelectedId(null);
    onClose();
  };

  const handleClone = () => {
    if (!selectedId) return;
    onClone(selectedId);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>
        Clone Existing Campaign
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        <Typography variant="body2" color="text.secondary">
          Campaigns for <strong>{productName}</strong> that have been launched on Facebook. Cloning copies the setup, profile and
          the videos and images it used. The name and start date of this campaign stay the same.
        </Typography>

        <TextField
          size="small"
          placeholder="Search by campaign, RedTrack or ad account"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400, overflowY: 'auto' }}>
          {candidates.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No launched campaigns for this product yet.
            </Typography>
          )}
          {candidates.length > 0 && filtered.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No campaigns match "{search}".
            </Typography>
          )}
          {filtered.map((c) => {
            const selected = c.id === selectedId;
            const details = [
              c.adAccountName,
              c.budget !== undefined ? `$${c.budget}/day` : undefined,
              c.geo,
            ].filter(Boolean).join(' · ');
            return (
              <Box
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(c.id)}
                onDoubleClick={() => { setSelectedId(c.id); onClone(c.id); handleClose(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedId(c.id); }}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: selected ? 'primary.main' : 'divider',
                  bgcolor: selected ? 'action.selected' : 'transparent',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 14, flex: 1, minWidth: 0 }} noWrap title={c.name}>
                    {c.name}
                  </Typography>
                  {c.paused && <Chip size="small" label="Paused" color="warning" variant="outlined" />}
                  {c.launchedAt && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      Launched {c.launchedAt.slice(0, 10)}
                    </Typography>
                  )}
                </Box>
                {c.redtrackName && (
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }} noWrap title={c.redtrackName}>
                    RedTrack: {c.redtrackName}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
                  <Chip size="small" icon={<VideocamIcon />} label={`${c.videoCount} videos`} variant="outlined" />
                  <Chip size="small" icon={<ImageIcon />} label={`${c.imageCount} images`} variant="outlined" />
                  {details && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', ml: 'auto' }} noWrap>
                      {details}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>

        {selectedId && (
          <Alert severity="warning" sx={{ py: 0 }}>
            This replaces the current setup and media selection.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!selectedId}
          onClick={handleClone}
          sx={{ textTransform: 'none' }}
        >
          Clone
        </Button>
      </DialogActions>
    </Dialog>
  );
}
