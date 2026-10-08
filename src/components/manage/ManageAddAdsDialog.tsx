/**
 * ManageAddAdsDialog
 *
 * Add Ads entry point for the Manage page. Loads the campaign's Airtable
 * record (for product media) and its Facebook ad sets, lets the user pick an
 * ad set, then hands off to the shared AddAdsModal using that ad set's first
 * ad as the template — same as the campaign view page.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { getCampaign, getFbAdSets, getFbAds } from '../../features/campaigns';
import { AddAdsModal } from '../campaigns/AddAdsModal';
import type { FbManageCampaign } from '../../features/manage/types';

interface ManageAddAdsDialogProps {
  campaign: FbManageCampaign;
  /** Airtable Campaigns record id linked to this FB campaign. */
  DbRecordId: string;
  accessToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManageAddAdsDialog({
  campaign,
  DbRecordId,
  accessToken,
  onClose,
  onSuccess,
}: ManageAddAdsDialogProps) {
  const [target, setTarget] = useState<{ adSetId: string; templateCreativeId: string } | null>(null);

  const recordQuery = useQuery({
    queryKey: ['campaign', DbRecordId],
    queryFn: () => getCampaign(DbRecordId),
  });

  const fbQuery = useQuery({
    queryKey: ['manage-add-ads-fb', campaign.id],
    queryFn: async () => {
      const [adSets, ads] = await Promise.all([
        getFbAdSets(campaign.id, accessToken),
        getFbAds(campaign.id, accessToken),
      ]);
      return { adSets, ads };
    },
    staleTime: 0,
  });

  // Ad sets with their template ad (first ad that has a creative)
  const adSetRows = useMemo(() => {
    if (!fbQuery.data) return [];
    const { adSets, ads } = fbQuery.data;
    return adSets
      .filter((s) => s.status === 'ACTIVE' || s.status === 'PAUSED')
      .map((adSet) => {
        const adSetAds = ads.filter((a) => a.adset_id === adSet.id);
        const templateAd = adSetAds.find((a) => a.creative?.id);
        return { adSet, adCount: adSetAds.length, templateCreativeId: templateAd?.creative?.id };
      });
  }, [fbQuery.data]);

  const campaignRecord = recordQuery.data;

  // Hand off to the shared modal once an ad set is picked
  if (target && campaignRecord) {
    return (
      <AddAdsModal
        open
        onClose={onClose}
        adSetId={target.adSetId}
        templateCreativeId={target.templateCreativeId}
        campaignRecord={campaignRecord}
        adAccountId={campaign.adAccountId}
        accessToken={accessToken}
        onSuccess={onSuccess}
      />
    );
  }

  const isLoading = recordQuery.isLoading || fbQuery.isLoading;
  const error = recordQuery.error ?? fbQuery.error;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Add Ads
        <Typography variant="body2" color="text.secondary" noWrap>
          {campaign.name}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
            <CircularProgress size={24} />
            <Typography>Loading ad sets…</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error">{error instanceof Error ? error.message : 'Failed to load campaign'}</Alert>
        ) : !campaignRecord?.product ? (
          <Alert severity="warning">Campaign not linked to a product.</Alert>
        ) : adSetRows.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No ad sets in this campaign.
          </Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Choose the ad set to add ads to. Its first ad is used as the template.
            </Typography>
            <List disablePadding>
              {adSetRows.map(({ adSet, adCount, templateCreativeId }) => (
                <ListItemButton
                  key={adSet.id}
                  disabled={!templateCreativeId}
                  onClick={() =>
                    templateCreativeId && setTarget({ adSetId: adSet.id, templateCreativeId })
                  }
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemText
                    primary={adSet.name}
                    secondary={templateCreativeId ? `${adCount} ad${adCount !== 1 ? 's' : ''}` : 'No template ad'}
                  />
                  <Chip
                    label={adSet.status}
                    size="small"
                    color={adSet.status === 'ACTIVE' ? 'success' : 'default'}
                    variant="outlined"
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
