/**
 * RedtrackDuplicateCampaign - Button + dialog to duplicate an existing RedTrack campaign.
 *
 * Self-contained: receives the pre-loaded campaign list and fires a callback when done.
 * Follows the same modular pattern as RedtrackCampaignSelector.
 */

import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { textSm, textXs } from '../../theme/typography';
import type { CampaignOption } from '../../features/redtrack';
import { duplicateRedtrackCampaign } from '../../features/redtrack/api';
import { createAutocompleteFilter } from '../../utils';

// =============================================================================
// PROPS
// =============================================================================

interface RedtrackDuplicateCampaignProps {
  /** Pre-loaded list of campaigns (same as selector uses) */
  campaigns: CampaignOption[];
  /** Whether campaigns are still loading */
  campaignsLoading: boolean;
  /** The launch campaign name (from the Campaign Name field) */
  launchCampaignName: string;
  /** Callback when duplication is complete - returns new campaign ID and name */
  onDuplicated: (campaignId: string, campaignName: string) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function RedtrackDuplicateCampaign({
  campaigns,
  campaignsLoading,
  launchCampaignName,
  onDuplicated,
}: RedtrackDuplicateCampaignProps) {
  const [open, setOpen] = useState(false);
  const [sourceCampaign, setSourceCampaign] = useState<CampaignOption | null>(null);
  const [nameMode, setNameMode] = useState<'launch' | 'custom'>('launch');
  const [customName, setCustomName] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    setSourceCampaign(null);
    setNameMode('launch');
    setCustomName('');
    setError(null);
    setOpen(true);
  };

  const handleClose = () => {
    if (isDuplicating) return;
    setOpen(false);
  };

  const newTitle = nameMode === 'launch' ? launchCampaignName : customName;

  const handleDuplicate = async () => {
    if (!sourceCampaign || !newTitle.trim()) return;

    setIsDuplicating(true);
    setError(null);
    try {
      const result = await duplicateRedtrackCampaign('', sourceCampaign.id, newTitle.trim());
      onDuplicated(result.id, result.title);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate campaign');
    } finally {
      setIsDuplicating(false);
    }
  };

  const canDuplicate = sourceCampaign && newTitle.trim().length > 0 && !isDuplicating;

  // Memoize filter for performance
  const filterFn = useMemo(() => createAutocompleteFilter((c: CampaignOption) => c.name), []);

  return (
    <>
      <Chip
        size="small"
        label="Duplicate RT Campaign"
        icon={<ContentCopyIcon sx={{ fontSize: '0.75rem !important' }} />}
        onClick={handleOpen}
        color="info"
        sx={{ position: 'absolute', top: 0, right: 0, height: 18, fontSize: '0.6875rem', cursor: 'pointer' }}
      />

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Duplicate RedTrack Campaign</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '8px !important' }}>
          {/* Source campaign picker */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Source Campaign
            </Typography>
            <Autocomplete
              value={sourceCampaign}
              onChange={(_, val) => setSourceCampaign(val)}
              options={campaigns}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, val) => option.id === val.id}
              filterOptions={filterFn}
              loading={campaignsLoading}
              size="small"
              fullWidth
              autoHighlight
              openOnFocus
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search campaigns..."
                  autoFocus
                  sx={{ '& .MuiInputBase-input': textSm }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {campaignsLoading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...rest } = props;
                return (
                  <Box
                    component="li"
                    key={option.id}
                    {...rest}
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important' }}
                  >
                    <Typography sx={textSm}>{option.name}</Typography>
                    <Typography sx={{ ...textXs, color: 'text.secondary' }}>{option.id}</Typography>
                  </Box>
                );
              }}
              noOptionsText={campaignsLoading ? 'Loading campaigns...' : 'No campaigns found'}
            />
          </Box>

          {/* Name mode */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              New Campaign Name
            </Typography>
            <RadioGroup value={nameMode} onChange={(e) => setNameMode(e.target.value as 'launch' | 'custom')}>
              <FormControlLabel
                value="launch"
                control={<Radio size="small" />}
                label={
                  <Typography sx={textSm}>
                    Use launcher name: <strong>{launchCampaignName || '(empty)'}</strong>
                  </Typography>
                }
              />
              <FormControlLabel
                value="custom"
                control={<Radio size="small" />}
                label={<Typography sx={textSm}>Custom name</Typography>}
              />
            </RadioGroup>
            {nameMode === 'custom' && (
              <TextField
                size="small"
                fullWidth
                placeholder="Enter campaign name..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                autoFocus
                sx={{ mt: 1, '& .MuiInputBase-input': textSm }}
              />
            )}
          </Box>

          {error && (
            <Typography color="error" sx={textSm}>{error}</Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={isDuplicating} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDuplicate}
            disabled={!canDuplicate}
            startIcon={isDuplicating ? <CircularProgress size={16} color="inherit" /> : <ContentCopyIcon />}
            sx={{ textTransform: 'none' }}
          >
            {isDuplicating ? 'Duplicating...' : 'Duplicate'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
