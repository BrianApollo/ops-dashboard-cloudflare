/**
 * LinkRedtrackDialog - Dialog for linking a Facebook campaign
 * to a RedTrack campaign when no RedTrack ID exists yet.
 * Optionally assigns a product, which enables Add Ads on the Manage page.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useRedtrackCampaignList } from '../features/redtrack/useRedtrackCampaignList';
import { RedtrackCampaignSelector } from './campaigns/RedtrackCampaignSelector';
import { getProducts } from '../features/campaigns';
import type { FbManageCampaign } from '../features/manage/types';

// =============================================================================
// TYPES
// =============================================================================

interface LinkRedtrackDialogProps {
  /** The campaign to link, or null if dialog is closed */
  campaign: FbManageCampaign | null;
  /** Close the dialog */
  onClose: () => void;
  /** Save handler — receives FB + RedTrack details */
  onSave: (
    fbCampaignId: string,
    fbCampaignName: string,
    fbAdAccountId: string,
    redtrackCampaignId: string,
    redtrackCampaignName: string,
    productId?: string,
  ) => Promise<void>;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function LinkRedtrackDialog({ campaign, onClose, onSave }: LinkRedtrackDialogProps) {
  const [redtrackId, setRedtrackId] = useState('');
  const [redtrackName, setRedtrackName] = useState('');
  const [product, setProduct] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { campaigns: redtrackCampaigns, isLoading: redtrackCampaignsLoading } =
    useRedtrackCampaignList(!!campaign);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['link-redtrack-products'],
    queryFn: getProducts,
    enabled: !!campaign,
    staleTime: 5 * 60 * 1000,
  });

  const open = !!campaign;

  const handleClose = () => {
    if (saving) return;
    setRedtrackId('');
    setRedtrackName('');
    setProduct(null);
    setError('');
    onClose();
  };

  const handleSave = async () => {
    if (!campaign || !redtrackId) return;
    setSaving(true);
    setError('');
    try {
      await onSave(
        campaign.id,
        campaign.name,
        campaign.adAccountId,
        redtrackId,
        redtrackName,
        product?.id,
      );
      setRedtrackId('');
      setRedtrackName('');
      setProduct(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>
        Link RedTrack Campaign
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        <TextField
          label="Facebook Campaign ID"
          value={campaign?.id ?? ''}
          disabled
          size="small"
          fullWidth
        />
        <TextField
          label="Facebook Campaign Name"
          value={campaign?.name ?? ''}
          disabled
          size="small"
          fullWidth
        />
        <TextField
          label="Ad Account ID"
          value={campaign?.adAccountId ?? ''}
          disabled
          size="small"
          fullWidth
        />
        <Box>
          <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500, color: 'text.secondary' }}>
            RedTrack Campaign
          </Typography>
          <RedtrackCampaignSelector
            value={redtrackId}
            campaigns={redtrackCampaigns}
            campaignsLoading={redtrackCampaignsLoading}
            onSelect={(id, name) => { setRedtrackId(id); setRedtrackName(name); }}
            displayName={redtrackName}
          />
        </Box>
        <Box>
          <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500, color: 'text.secondary' }}>
            Product (needed for Add Ads)
          </Typography>
          <Autocomplete
            options={products}
            value={product}
            onChange={(_, v) => setProduct(v)}
            getOptionLabel={(p) => p.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            loading={productsLoading}
            size="small"
            renderInput={(params) => <TextField {...params} placeholder="Select product" />}
          />
        </Box>
        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          disabled={saving}
          sx={{ textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!redtrackId || saving}
          onClick={handleSave}
          startIcon={saving ? <CircularProgress size={14} /> : undefined}
          sx={{ textTransform: 'none' }}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
