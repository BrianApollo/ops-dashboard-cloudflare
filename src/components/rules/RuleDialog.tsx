/**
 * RuleDialog - Add/Edit scaling rule with a structured form builder.
 *
 * Dynamically shows fields based on rule type:
 * - Budget Change: condition (ROAS threshold) + action (increase/reduce)
 * - Status Change: condition (ROAS threshold) + action (turn off)
 * - Maximum Global Budget: budget amount only
 */

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';

import { AppDialog } from '../../core/dialog/AppDialog';
import { defaultFormState, ruleToFormState } from '../../features/rules/types';
import type { ScalingRule, RuleScope, RuleFormState, RuleSelect, ActionType, ConditionOperator } from '../../features/rules/types';

// =============================================================================
// TYPES
// =============================================================================

interface RuleDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (form: RuleFormState) => Promise<void>;
  rule: ScalingRule | null; // null = create mode
  scope: RuleScope;
  saving: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function RuleDialog({ open, onClose, onSave, rule, scope, saving }: RuleDialogProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isEditing = !!rule;

  const [form, setForm] = useState<RuleFormState>(defaultFormState(scope));
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      if (rule) {
        setForm(ruleToFormState(rule));
      } else {
        setForm(defaultFormState(scope));
      }
    }
  }, [open, rule, scope]);

  // When rule type changes, set sensible defaults
  const handleSelectChange = (select: RuleSelect) => {
    setForm((prev) => {
      const next = { ...prev, select };
      if (select === 'Status Change') {
        next.actionType = 'turn_off';
        next.actionValue = '';
      } else if (select === 'Maximum Global Budget') {
        next.actionType = 'set_max_budget';
        next.actionValue = '';
      } else {
        next.actionType = 'increase_budget';
        next.actionValue = '2';
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Rule name is required');
      return;
    }
    setError(null);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule');
    }
  };

  const update = (key: keyof RuleFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const showCondition = form.select !== 'Maximum Global Budget';
  const showBudgetAction = form.select === 'Budget Change';
  const showMaxBudget = form.select === 'Maximum Global Budget';

  const labelSx = {
    fontWeight: 600,
    fontSize: '0.75rem',
    color: 'text.secondary',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    mb: 0.75,
  };

  const sectionSx = {
    p: 2,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: isDark ? alpha(theme.palette.common.white, 0.02) : alpha(theme.palette.common.black, 0.01),
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Rule' : 'Add Rule'}
      size="sm"
      actions={
        <>
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
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Rule'}
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {/* Error */}
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

        {/* Name */}
        <Box>
          <Typography sx={labelSx}>Rule Name</Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="e.g. Scale up profitable campaigns"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
          />
        </Box>

        {/* Scope chip (read-only indicator) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ ...labelSx, mb: 0 }}>Scope</Typography>
          <Chip
            label={form.scope}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.6875rem',
              bgcolor: form.scope === 'Global'
                ? (isDark ? '#1e3a5f' : '#dbeafe')
                : (isDark ? '#3b1f5e' : '#f3e8ff'),
              color: form.scope === 'Global'
                ? (isDark ? '#93c5fd' : '#1e40af')
                : (isDark ? '#c4b5fd' : '#6b21a8'),
            }}
          />
        </Box>

        {/* Applies To (scoped only) */}
        {form.scope === 'Scoped' && (
          <Box>
            <Typography sx={labelSx}>Applies To (Campaign)</Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Campaign name or ID"
              value={form.appliesTo}
              onChange={(e) => update('appliesTo', e.target.value)}
              sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
            />
          </Box>
        )}

        {/* Rule Type */}
        <Box>
          <Typography sx={labelSx}>Rule Type</Typography>
          <Select
            fullWidth
            size="small"
            value={form.select}
            onChange={(e) => handleSelectChange(e.target.value as RuleSelect)}
            sx={{ fontSize: '0.875rem' }}
          >
            <MenuItem value="Budget Change">Budget Change</MenuItem>
            <MenuItem value="Status Change">Status Change</MenuItem>
            <MenuItem value="Maximum Global Budget">Maximum Global Budget</MenuItem>
          </Select>
        </Box>

        {/* Condition Section */}
        {showCondition && (
          <Box sx={sectionSx}>
            <Typography sx={{ ...labelSx, mb: 1.5 }}>If...</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip label="ROAS" size="small" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>is</Typography>
              <Select
                size="small"
                value={form.conditionOperator}
                onChange={(e) => update('conditionOperator', e.target.value as ConditionOperator)}
                sx={{ minWidth: 90, fontSize: '0.8125rem' }}
              >
                <MenuItem value="over">over</MenuItem>
                <MenuItem value="under">under</MenuItem>
              </Select>
              <TextField
                size="small"
                type="number"
                value={form.conditionValue}
                onChange={(e) => update('conditionValue', e.target.value)}
                sx={{
                  width: 80,
                  '& .MuiInputBase-input': { fontSize: '0.8125rem', py: 0.75, textAlign: 'center' },
                }}
                slotProps={{ htmlInput: { step: 0.1, min: 0 } }}
              />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>for</Typography>
              <TextField
                size="small"
                type="number"
                value={form.conditionDays}
                onChange={(e) => update('conditionDays', e.target.value)}
                sx={{
                  width: 60,
                  '& .MuiInputBase-input': { fontSize: '0.8125rem', py: 0.75, textAlign: 'center' },
                }}
                slotProps={{ htmlInput: { step: 1, min: 1 } }}
              />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>days</Typography>
            </Box>
          </Box>
        )}

        {/* Action Section */}
        <Box sx={sectionSx}>
          <Typography sx={{ ...labelSx, mb: 1.5 }}>Then...</Typography>

          {showBudgetAction && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Select
                size="small"
                value={form.actionType}
                onChange={(e) => update('actionType', e.target.value as ActionType)}
                sx={{ minWidth: 160, fontSize: '0.8125rem' }}
              >
                <MenuItem value="increase_budget">Increase Budget by</MenuItem>
                <MenuItem value="reduce_budget">Reduce by</MenuItem>
              </Select>
              <TextField
                size="small"
                type="number"
                value={form.actionValue}
                onChange={(e) => update('actionValue', e.target.value)}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        {form.actionType === 'increase_budget' ? 'x' : '%'}
                      </InputAdornment>
                    ),
                  },
                  htmlInput: { step: form.actionType === 'increase_budget' ? 0.5 : 5, min: 0 },
                }}
                sx={{
                  width: 100,
                  '& .MuiInputBase-input': { fontSize: '0.8125rem', py: 0.75 },
                }}
              />
            </Box>
          )}

          {form.select === 'Status Change' && (
            <Chip
              label="Turn Off Campaign"
              sx={{
                fontWeight: 600,
                fontSize: '0.75rem',
                bgcolor: isDark ? '#5c2020' : '#fee2e2',
                color: isDark ? '#fca5a5' : '#991b1b',
              }}
            />
          )}

          {showMaxBudget && (
            <TextField
              size="small"
              type="number"
              placeholder="Maximum budget amount"
              value={form.actionValue}
              onChange={(e) => update('actionValue', e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                },
                htmlInput: { step: 100, min: 0 },
              }}
              sx={{
                width: 200,
                '& .MuiInputBase-input': { fontSize: '0.875rem' },
              }}
            />
          )}
        </Box>

        {/* Timing */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={labelSx}>Check At</Typography>
            <Select
              fullWidth
              size="small"
              value={form.checkAt}
              onChange={(e) => update('checkAt', e.target.value)}
              sx={{ fontSize: '0.875rem' }}
            >
              <MenuItem value="Midnight">Midnight</MenuItem>
            </Select>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={labelSx}>Execute At</Typography>
            <Select
              fullWidth
              size="small"
              value={form.executeAt}
              onChange={(e) => update('executeAt', e.target.value)}
              sx={{ fontSize: '0.875rem' }}
            >
              <MenuItem value="Midnight">Midnight</MenuItem>
            </Select>
          </Box>
        </Box>
      </Box>
    </AppDialog>
  );
}
