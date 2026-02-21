/**
 * ManagePage - Facebook Campaign Management page.
 *
 * Uses the selected Airtable profile's access token to fetch and
 * display all active Facebook campaigns in a data table.
 */

import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import PolicyIcon from '@mui/icons-material/Policy';

import { ProfileSelector } from './ProfileSelector';
import { CampaignTable } from './CampaignTable';
import { AdReviewDialog } from './AdReviewDialog';
import { useManageData } from './useManageData';
import { checkAdReview } from './api';
import type { AdReviewResult } from './types';

export function ManagePage() {
  const {
    profiles,
    selectedProfile,
    setSelectedProfileId,
    filteredCampaigns,
    adAccounts,
    redtrackMap,
    filters,
    setSearch,
    setAdAccountFilter,
    setStatusFilter,
    setDatePreset,
    isLoadingProfiles,
    isLoadingCampaigns,
    isError,
    error,
    refetch,
    toggleCampaignStatus,
    editCampaignBudget,
  } = useManageData();

  // ── Ad review check state ──
  const [isChecking, setIsChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ checked: 0, total: 0 });
  const [reviewResults, setReviewResults] = useState<AdReviewResult[] | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [totalChecked, setTotalChecked] = useState(0);

  const handleCheckAdReview = useCallback(async () => {
    if (!selectedProfile?.permanentToken || filteredCampaigns.length === 0) return;

    setIsChecking(true);
    setCheckProgress({ checked: 0, total: filteredCampaigns.length });

    try {
      const results = await checkAdReview(
        filteredCampaigns.map((c) => ({ id: c.id, name: c.name, adAccountId: c.adAccountId })),
        selectedProfile.permanentToken,
        (checked, total) => setCheckProgress({ checked, total }),
      );

      setReviewResults(results);
      setTotalChecked(filteredCampaigns.length);
      setReviewDialogOpen(true);
    } catch {
      // Error will show via the general error handling
    } finally {
      setIsChecking(false);
    }
  }, [selectedProfile, filteredCampaigns]);

  return (
    <Box>
      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              fontSize: '1.25rem',
              letterSpacing: '-0.01em',
            }}
          >
            Manage Campaigns
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            View and manage Facebook campaigns across ad accounts
          </Typography>
        </Box>

        {/* Profile selector + refresh - top right */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ProfileSelector
            profiles={profiles}
            selectedProfile={selectedProfile}
            onSelect={setSelectedProfileId}
            isLoading={isLoadingProfiles}
          />
          <Tooltip title="Refresh campaigns" arrow>
            <IconButton
              onClick={() => refetch()}
              disabled={isLoadingCampaigns}
              size="small"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                width: 36,
                height: 36,
              }}
            >
              {isLoadingCampaigns ? (
                <CircularProgress size={16} />
              ) : (
                <RefreshIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error alert */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.message || 'Failed to load campaigns. Check that the profile has a valid access token.'}
        </Alert>
      )}

      {/* No token warning */}
      {!isLoadingProfiles && selectedProfile && !selectedProfile.permanentToken && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The selected profile does not have a Facebook access token configured.
        </Alert>
      )}

      {/* Campaign table */}
      <CampaignTable
        campaigns={filteredCampaigns}
        adAccounts={adAccounts}
        redtrackMap={redtrackMap}
        filters={filters}
        isLoading={isLoadingCampaigns}
        onSearchChange={setSearch}
        onAdAccountChange={setAdAccountFilter}
        onStatusChange={setStatusFilter}
        onDatePresetChange={setDatePreset}
        onRefresh={refetch}
        onToggleStatus={toggleCampaignStatus}
        onEditBudget={editCampaignBudget}
        // Ad review button
        adReviewButton={
          <Button
            variant="outlined"
            size="small"
            onClick={handleCheckAdReview}
            disabled={isChecking || filteredCampaigns.length === 0}
            startIcon={
              isChecking ? (
                <CircularProgress size={14} />
              ) : (
                <PolicyIcon sx={{ fontSize: 16 }} />
              )
            }
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.8125rem',
              borderColor: '#e5e7eb',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'text.secondary',
              },
            }}
          >
            {isChecking
              ? `Checking ${checkProgress.checked}/${checkProgress.total}...`
              : 'Check Ad Review'}
          </Button>
        }
      />

      {/* Review results dialog */}
      {reviewResults !== null && (
        <AdReviewDialog
          open={reviewDialogOpen}
          onClose={() => setReviewDialogOpen(false)}
          results={reviewResults}
          totalChecked={totalChecked}
          accessToken={selectedProfile?.permanentToken ?? ''}
        />
      )}
    </Box>
  );
}
