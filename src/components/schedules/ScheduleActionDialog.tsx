/**
 * ScheduleActionDialog - Create a new scheduled action.
 * Can be opened standalone or pre-filled from the Manage page.
 */

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { defaultScheduleFormState } from '../../features/schedules/types';
import type { ScheduleFormState, ScheduleType } from '../../features/schedules/types';

// =============================================================================
// TYPES
// =============================================================================

export interface ScheduleDialogPrefill {
  campaignId?: string;
  campaignName?: string;
  currentBudgetDollars?: string;
}

interface ScheduleActionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (form: ScheduleFormState) => Promise<void>;
  saving: boolean;
  prefill?: ScheduleDialogPrefill;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ScheduleActionDialog({
  open,
  onClose,
  onSave,
  saving,
  prefill,
}: ScheduleActionDialogProps) {
  const [form, setForm] = useState<ScheduleFormState>(defaultScheduleFormState());
  const [error, setError] = useState<string | null>(null);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      const defaults = defaultScheduleFormState();
      setForm({
        ...defaults,
        campaignId: prefill?.campaignId || '',
        campaignName: prefill?.campaignName || '',
        execute: prefill?.currentBudgetDollars || '',
      });
      setError(null);
    }
  }, [open, prefill]);

  const handleTypeChange = (_: unknown, value: ScheduleType | null) => {
    if (!value) return;
    setForm((prev) => ({
      ...prev,
      type: value,
      execute: value === 'Status Change' ? 'PAUSED' : (prefill?.currentBudgetDollars || ''),
    }));
  };

  const handleStatusToggle = (_: unknown, value: string | null) => {
    if (!value) return;
    setForm((prev) => ({ ...prev, execute: value }));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!form.campaignId.trim()) {
      setError('Campaign ID is required');
      return;
    }
    if (form.type === 'Budget Change') {
      const num = parseFloat(form.execute);
      if (isNaN(num) || num <= 0) {
        setError('Budget must be a positive number');
        return;
      }
    }

    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule action');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Schedule Action</DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '8px !important' }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Type */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Type
          </Typography>
          <ToggleButtonGroup
            value={form.type}
            exclusive
            onChange={handleTypeChange}
            size="small"
            fullWidth
            sx={{ mt: 0.5 }}
          >
            <ToggleButton value="Budget Change" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' }}>
              Budget Change
            </ToggleButton>
            <ToggleButton value="Status Change" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' }}>
              Status Change
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Campaign */}
        <TextField
          label="Campaign ID"
          value={form.campaignId}
          onChange={(e) => setForm((prev) => ({ ...prev, campaignId: e.target.value }))}
          size="small"
          fullWidth
          helperText={form.campaignName || 'Facebook campaign ID'}
        />

        {/* Execute value */}
        {form.type === 'Budget Change' ? (
          <TextField
            label="Daily Budget"
            value={form.execute}
            onChange={(e) => setForm((prev) => ({ ...prev, execute: e.target.value }))}
            size="small"
            fullWidth
            type="number"
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              },
              htmlInput: { min: 0, step: 1 },
            }}
            helperText="Amount in dollars"
          />
        ) : (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Target Status
            </Typography>
            <ToggleButtonGroup
              value={form.execute}
              exclusive
              onChange={handleStatusToggle}
              size="small"
              fullWidth
              sx={{ mt: 0.5 }}
            >
              <ToggleButton value="ACTIVE" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' }}>
                Active
              </ToggleButton>
              <ToggleButton value="PAUSED" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' }}>
                Paused
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {/* Scheduled At */}
        <TextField
          label="Scheduled For (midnight GMT+7)"
          value={form.scheduledAt}
          onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
          size="small"
          fullWidth
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          helperText="Executes at midnight GMT+7 on this date"
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {saving ? 'Scheduling...' : 'Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
