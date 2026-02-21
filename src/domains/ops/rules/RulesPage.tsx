/**
 * RulesPage - Manage scaling rules with Global and Scoped tabs.
 *
 * Features:
 * - Two-tab view (Global Rules / Scoped Rules)
 * - Table with colored chips for rule types
 * - Add / Edit / Delete rules via dialogs
 * - Fetches from Airtable "Scaling Rules" table
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';

// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ScheduleIcon from '@mui/icons-material/Schedule';

import { ToggleTabs } from '../../../ui/ToggleTabs';
import { RuleDialog } from './RuleDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { fetchRules, createRule, updateRule, deleteRule } from './data';
import { formStateToFields } from './types';
import type { ScalingRule, RuleScope, RuleSelect, RuleFormState } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

type TabValue = 'global' | 'scoped' | 'log';

const SELECT_COLORS: Record<RuleSelect, { bg: string; color: string; darkBg: string; darkColor: string }> = {
  'Budget Change': { bg: '#dbeafe', color: '#1e40af', darkBg: '#1e3a5f', darkColor: '#93c5fd' },
  'Status Change': { bg: '#f3e8ff', color: '#6b21a8', darkBg: '#3b1f5e', darkColor: '#c4b5fd' },
  'Maximum Global Budget': { bg: '#fef3c7', color: '#92400e', darkBg: '#4a3728', darkColor: '#fcd34d' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function RulesPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Data
  const [rules, setRules] = useState<ScalingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<TabValue>('global');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ScalingRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScalingRule | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch rules
  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRules();
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Filter by tab
  const globalRules = useMemo(() => rules.filter((r) => r.scope === 'Global'), [rules]);
  const scopedRules = useMemo(() => rules.filter((r) => r.scope === 'Scoped'), [rules]);
  const displayedRules = activeTab === 'global' ? globalRules : scopedRules;

  // Handlers
  const handleAdd = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const handleEdit = (rule: ScalingRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleSave = async (form: RuleFormState) => {
    setSaving(true);
    try {
      const fields = formStateToFields(form);
      if (editingRule) {
        await updateRule(editingRule.id, fields);
      } else {
        await createRule(fields);
      }
      setDialogOpen(false);
      setEditingRule(null);
      await loadRules();
    } catch (err) {
      throw err; // Let the dialog handle the error display
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteRule(deleteTarget.id);
      setDeleteTarget(null);
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    } finally {
      setSaving(false);
    }
  };

  // Styles
  const headerSx = {
    fontWeight: 600,
    fontSize: '0.75rem',
    color: 'text.secondary',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    py: 1.5,
    borderBottom: '1px solid',
    borderColor: 'divider',
  };

  const cellSx = {
    py: 1.5,
    fontSize: '0.8125rem',
    borderBottom: '1px solid',
    borderColor: alpha(theme.palette.divider, 0.5),
  };

  const currentScope: RuleScope = activeTab === 'global' ? 'Global' : 'Scoped';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Rules
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage scaling rules for your campaigns
          </Typography>
        </Box>
        {activeTab !== 'log' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Add Rule
          </Button>
        )}
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ mb: 2.5 }}>
        <ToggleTabs<TabValue>
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'global', label: 'Global Rules', count: globalRules.length },
            { value: 'scoped', label: 'Scoped Rules', count: scopedRules.length },
            { value: 'log', label: 'Log' },
          ]}
        />
      </Box>

      {/* Log Tab */}
      {activeTab === 'log' && (
        <TableContainer
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>Timestamp</TableCell>
                <TableCell sx={headerSx}>Rule</TableCell>
                <TableCell sx={headerSx}>Campaign</TableCell>
                <TableCell sx={headerSx}>Action Taken</TableCell>
                <TableCell sx={headerSx}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No log entries yet
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Rules Table (Global / Scoped) */}
      {activeTab !== 'log' && (
        <>
          <TableContainer
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headerSx, width: 48 }}>#</TableCell>
                  <TableCell sx={headerSx}>Name</TableCell>
                  <TableCell sx={headerSx}>Type</TableCell>
                  {activeTab === 'scoped' && <TableCell sx={headerSx}>Applies To</TableCell>}
                  <TableCell sx={headerSx}>Check At</TableCell>
                  <TableCell sx={headerSx}>Condition</TableCell>
                  <TableCell sx={headerSx}>Action</TableCell>
                  <TableCell sx={headerSx}>Execute At</TableCell>
                  <TableCell sx={{ ...headerSx, width: 96 }} />
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={activeTab === 'scoped' ? 9 : 8} sx={{ textAlign: 'center', py: 6 }}>
                      <CircularProgress size={28} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        Loading rules...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : displayedRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={activeTab === 'scoped' ? 9 : 8} sx={{ textAlign: 'center', py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No {activeTab} rules yet
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={handleAdd}
                        sx={{ mt: 1, textTransform: 'none' }}
                      >
                        Create one
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedRules.map((rule, index) => {
                    const selectColor = SELECT_COLORS[rule.select] || SELECT_COLORS['Budget Change'];
                    const chipBg = isDark ? selectColor.darkBg : selectColor.bg;
                    const chipColor = isDark ? selectColor.darkColor : selectColor.color;

                    return (
                      <TableRow
                        key={rule.id}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        {/* Row number */}
                        <TableCell sx={{ ...cellSx, color: 'text.secondary', fontWeight: 500 }}>
                          {index + 1}
                        </TableCell>

                        {/* Name */}
                        <TableCell sx={{ ...cellSx, fontWeight: 600 }}>
                          {rule.name}
                        </TableCell>

                        {/* Type chip */}
                        <TableCell sx={cellSx}>
                          <Chip
                            label={rule.select}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.6875rem',
                              bgcolor: chipBg,
                              color: chipColor,
                              letterSpacing: '0.01em',
                            }}
                          />
                        </TableCell>

                        {/* Applies To (scoped only) */}
                        {activeTab === 'scoped' && (
                          <TableCell sx={{ ...cellSx, maxWidth: 280 }}>
                            {rule.appliesTo.length > 0 ? (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {rule.appliesTo.map((campaign, i) => (
                                  <Chip
                                    key={i}
                                    label={campaign}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      fontSize: '0.6875rem',
                                      maxWidth: 240,
                                      '& .MuiChip-label': {
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      },
                                    }}
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                        )}

                        {/* Check At */}
                        <TableCell sx={cellSx}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                              {rule.checkAt}
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Condition */}
                        <TableCell sx={cellSx}>
                          {rule.conditionRaw ? (
                            <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                              {rule.conditionRaw}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>

                        {/* Action */}
                        <TableCell sx={cellSx}>
                          {rule.actionRaw ? (
                            <Chip
                              label={rule.actionRaw}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.6875rem',
                                bgcolor: rule.action?.type === 'turn_off'
                                  ? (isDark ? '#5c2020' : '#fee2e2')
                                  : rule.action?.type === 'reduce_budget'
                                    ? (isDark ? '#5c4020' : '#fff7ed')
                                    : (isDark ? '#1a3a2a' : '#d1fae5'),
                                color: rule.action?.type === 'turn_off'
                                  ? (isDark ? '#fca5a5' : '#991b1b')
                                  : rule.action?.type === 'reduce_budget'
                                    ? (isDark ? '#fdba74' : '#9a3412')
                                    : (isDark ? '#6ee7b7' : '#065f46'),
                              }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>

                        {/* Execute At */}
                        <TableCell sx={cellSx}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                              {rule.executeAt}
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Actions */}
                        <TableCell sx={cellSx}>
                          <Box sx={{ display: 'flex', gap: 0.25 }}>
                            <Tooltip title="Edit rule" arrow>
                              <IconButton size="small" onClick={() => handleEdit(rule)} sx={{ color: 'text.secondary' }}>
                                <EditIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete rule" arrow>
                              <IconButton size="small" onClick={() => setDeleteTarget(rule)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Footer count */}
          {!loading && displayedRules.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                {displayedRules.length} rule{displayedRules.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Rule Dialog */}
      <RuleDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingRule(null); }}
        onSave={handleSave}
        rule={editingRule}
        scope={currentScope}
        saving={saving}
      />

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        ruleName={deleteTarget?.name || ''}
        saving={saving}
      />
    </Box>
  );
}
