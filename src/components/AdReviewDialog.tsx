/**
 * AdReviewDialog - Shows results of the ad review check.
 *
 * Displays which campaigns have rejected or pending-review ads,
 * with an option to request review for rejected ads via Facebook's API.
 */

import { useState, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GavelIcon from '@mui/icons-material/Gavel';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import type { AdReviewResult } from '../features/manage/types';
import { requestAdReview, type ReviewRequestResult } from '../features/manage/api';

// =============================================================================
// STATUS STYLING
// =============================================================================

function getStatusStyle(status: string) {
  switch (status) {
    case 'DISAPPROVED':
      return { bgcolor: '#fee2e2', color: '#991b1b', label: 'Rejected' };
    case 'PENDING_REVIEW':
      return { bgcolor: '#fef3c7', color: '#92400e', label: 'Pending Review' };
    case 'WITH_ISSUES':
      return { bgcolor: '#ffedd5', color: '#9a3412', label: 'With Issues' };
    default:
      return { bgcolor: '#f3f4f6', color: '#6b7280', label: status };
  }
}

// Only DISAPPROVED ads can be appealed
const APPEALABLE = new Set(['DISAPPROVED']);

// =============================================================================
// COMPONENT
// =============================================================================

interface AdReviewDialogProps {
  open: boolean;
  onClose: () => void;
  results: AdReviewResult[];
  totalChecked: number;
  accessToken: string;
}

export function AdReviewDialog({
  open,
  onClose,
  results,
  totalChecked,
  accessToken,
}: AdReviewDialogProps) {
  const totalFlaggedAds = results.reduce((sum, r) => sum + r.ads.length, 0);
  const allClear = results.length === 0;

  // Collect all appealable ads across campaigns (with their ad account ID)
  const appealableAds = results.flatMap((r) =>
    r.ads
      .filter((ad) => APPEALABLE.has(ad.effective_status))
      .map((ad) => ({ id: ad.id, name: ad.name, adAccountId: r.adAccountId })),
  );

  // Request review state
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestProgress, setRequestProgress] = useState({ done: 0, total: 0 });
  const [requestResults, setRequestResults] = useState<ReviewRequestResult[] | null>(null);

  const handleRequestReview = useCallback(async () => {
    if (appealableAds.length === 0 || !accessToken) return;

    setIsRequesting(true);
    setRequestProgress({ done: 0, total: appealableAds.length });

    try {
      const results = await requestAdReview(
        appealableAds,
        accessToken,
        (done, total) => setRequestProgress({ done, total }),
      );
      setRequestResults(results);
    } finally {
      setIsRequesting(false);
    }
  }, [appealableAds, accessToken]);

  const successCount = requestResults?.filter((r) => r.success).length ?? 0;
  const failCount = requestResults?.filter((r) => !r.success).length ?? 0;

  // Track which ad IDs have been reviewed successfully or failed
  const reviewedIds = new Set(
    requestResults?.filter((r) => r.success).map((r) => r.adId) ?? [],
  );
  const failedIds = new Map(
    requestResults?.filter((r) => !r.success).map((r) => [r.adId, r.error]) ?? [],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
        Ad Review Results
      </DialogTitle>

      <DialogContent>
        {/* Summary */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 2.5,
            p: 2,
            borderRadius: 2,
            bgcolor: allClear ? '#ecfdf5' : '#fef2f2',
          }}
        >
          {allClear ? (
            <>
              <CheckCircleOutlineIcon sx={{ color: '#059669', fontSize: 28 }} />
              <Box>
                <Typography sx={{ fontWeight: 600, color: '#065f46' }}>
                  All clear
                </Typography>
                <Typography variant="body2" sx={{ color: '#047857' }}>
                  Checked {totalChecked} campaign{totalChecked !== 1 ? 's' : ''} — no rejected or pending review ads found.
                </Typography>
              </Box>
            </>
          ) : (
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: '#991b1b' }}>
                    {totalFlaggedAds} ad{totalFlaggedAds !== 1 ? 's' : ''} flagged across {results.length} campaign{results.length !== 1 ? 's' : ''}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b91c1c' }}>
                    Checked {totalChecked} campaign{totalChecked !== 1 ? 's' : ''} total.
                    {appealableAds.length > 0 && !requestResults && (
                      <> {appealableAds.length} rejected ad{appealableAds.length !== 1 ? 's' : ''} can request review.</>
                    )}
                  </Typography>
                </Box>

                {/* Request Review button — only if there are rejected ads */}
                {appealableAds.length > 0 && !requestResults && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleRequestReview}
                    disabled={isRequesting}
                    startIcon={
                      isRequesting ? (
                        <CircularProgress size={14} sx={{ color: 'inherit' }} />
                      ) : (
                        <GavelIcon sx={{ fontSize: 16 }} />
                      )
                    }
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      flexShrink: 0,
                      ml: 2,
                    }}
                  >
                    {isRequesting
                      ? `Requesting ${requestProgress.done}/${requestProgress.total}...`
                      : `Request Review for ${appealableAds.length} Ad${appealableAds.length !== 1 ? 's' : ''}`}
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </Box>

        {/* Request review results summary */}
        {requestResults && (
          <Alert
            severity={failCount === 0 ? 'success' : 'warning'}
            sx={{ mb: 2 }}
          >
            {failCount === 0 ? (
              <>All {successCount} ad{successCount !== 1 ? 's' : ''} submitted for review successfully.</>
            ) : (
              <>
                {successCount > 0 && <>{successCount} ad{successCount !== 1 ? 's' : ''} submitted for review. </>}
                {failCount} ad{failCount !== 1 ? 's' : ''} could not be submitted — see details below.
              </>
            )}
          </Alert>
        )}

        {/* Per-campaign breakdown */}
        {results.map((result, idx) => (
          <Box key={result.campaignId}>
            {idx > 0 && <Divider sx={{ my: 2 }} />}

            <Typography
              sx={{
                fontWeight: 600,
                fontSize: '0.875rem',
                mb: 1,
              }}
            >
              {result.campaignName}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontFamily: 'monospace', display: 'block', mb: 1.5 }}
            >
              {result.campaignId}
            </Typography>

            {/* Flagged ads */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {result.ads.map((ad) => {
                const style = getStatusStyle(ad.effective_status);
                const feedback = ad.ad_review_feedback?.global
                  ? Object.values(ad.ad_review_feedback.global).join('; ')
                  : null;
                const wasReviewed = reviewedIds.has(ad.id);
                const failedError = failedIds.get(ad.id);

                return (
                  <Box
                    key={ad.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: wasReviewed
                        ? '#ecfdf5'
                        : failedError
                          ? '#fef2f2'
                          : 'action.hover',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {/* Status chip or appeal result */}
                    {wasReviewed ? (
                      <Chip
                        icon={<CheckIcon sx={{ fontSize: 14 }} />}
                        label="In Review"
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.6875rem',
                          bgcolor: '#d1fae5',
                          color: '#065f46',
                          flexShrink: 0,
                          '& .MuiChip-icon': { color: '#059669' },
                        }}
                      />
                    ) : failedError ? (
                      <Chip
                        icon={<CloseIcon sx={{ fontSize: 14 }} />}
                        label="Failed"
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.6875rem',
                          bgcolor: '#fee2e2',
                          color: '#991b1b',
                          flexShrink: 0,
                          '& .MuiChip-icon': { color: '#dc2626' },
                        }}
                      />
                    ) : (
                      <Chip
                        label={style.label}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.6875rem',
                          bgcolor: style.bgcolor,
                          color: style.color,
                          flexShrink: 0,
                        }}
                      />
                    )}

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ad.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', fontFamily: 'monospace' }}
                      >
                        {ad.id}
                      </Typography>
                      {feedback && !wasReviewed && (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', color: '#b91c1c', mt: 0.5 }}
                        >
                          {feedback}
                        </Typography>
                      )}
                      {failedError && (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', color: '#dc2626', mt: 0.5 }}
                        >
                          {failedError}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" size="small" sx={{ textTransform: 'none' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
