/**
 * CampaignTable - Displays Facebook campaigns in a table
 * with status toggles, inline budget editing, and bulk selection.
 *
 * Modelled after the campaign-dashboard reference.
 */

import React, { useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import { RedTrackDataPanel } from '../../features/redtrack';

import type { FbManageCampaign, FbAdAccount, ManageFilters, DatePreset } from './types';

// =============================================================================
// TYPES
// =============================================================================

interface CampaignTableProps {
  campaigns: FbManageCampaign[];
  adAccounts: FbAdAccount[];
  redtrackMap: Map<string, string>;
  filters: ManageFilters;
  isLoading: boolean;
  onSearchChange: (search: string) => void;
  onAdAccountChange: (id: string) => void;
  onStatusChange: (status: ManageFilters['status']) => void;
  onDatePresetChange: (preset: DatePreset) => void;
  onRefresh: () => void;
  onToggleStatus: (campaignId: string, currentStatus: string) => Promise<void>;
  onEditBudget: (campaignId: string, newBudgetCents: number) => Promise<void>;
  adReviewButton?: React.ReactNode;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatBudget(cents?: string): string {
  if (!cents) return '—';
  const dollars = parseInt(cents, 10) / 100;
  return `$${dollars.toFixed(2)}`;
}

function getRoas(campaign: FbManageCampaign): number | null {
  const roasData = campaign.insights?.data?.[0]?.purchase_roas;
  if (!roasData?.length) return null;
  return parseFloat(roasData[0].value);
}

function getSpend(campaign: FbManageCampaign): string {
  const spend = campaign.insights?.data?.[0]?.spend;
  if (!spend) return '—';
  return `$${parseFloat(spend).toFixed(2)}`;
}

function getSpendNum(campaign: FbManageCampaign): number {
  const spend = campaign.insights?.data?.[0]?.spend;
  return spend ? parseFloat(spend) : 0;
}

function getBudgetNum(campaign: FbManageCampaign): number {
  const budget = campaign.daily_budget || campaign.lifetime_budget;
  return budget ? parseInt(budget, 10) : 0;
}

// =============================================================================
// SORTING
// =============================================================================

type SortKey = 'name' | 'adAccount' | 'budget' | 'spend' | 'roas' | 'status';
type SortDir = 'asc' | 'desc';

function getSortValue(campaign: FbManageCampaign, key: SortKey): string | number {
  switch (key) {
    case 'name': return campaign.name.toLowerCase();
    case 'adAccount': return (campaign.adAccountName ?? '').toLowerCase();
    case 'budget': return getBudgetNum(campaign);
    case 'spend': return getSpendNum(campaign);
    case 'roas': return getRoas(campaign) ?? -1;
    case 'status': return campaign.status;
  }
}

function sortCampaigns(campaigns: FbManageCampaign[], key: SortKey, dir: SortDir): FbManageCampaign[] {
  return [...campaigns].sort((a, b) => {
    const va = getSortValue(a, key);
    const vb = getSortValue(b, key);
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// =============================================================================
// STATUS PILL
// =============================================================================

function StatusToggle({
  status,
  onToggle,
  isUpdating,
  flashState,
}: {
  status: string;
  onToggle: () => void;
  isUpdating: boolean;
  flashState?: 'success' | 'error';
}) {
  const isActive = status === 'ACTIVE';

  // Flash overrides
  const flashBg = flashState === 'success' ? '#bbf7d0' : flashState === 'error' ? '#fecaca' : undefined;

  return (
    <Chip
      label={isUpdating ? 'Updating...' : isActive ? 'Active' : 'Paused'}
      size="small"
      onClick={isUpdating ? undefined : onToggle}
      sx={{
        fontWeight: 600,
        fontSize: '0.6875rem',
        letterSpacing: '0.02em',
        cursor: isUpdating ? 'default' : 'pointer',
        bgcolor: flashBg ?? (isActive ? '#d1fae5' : '#fee2e2'),
        color: isActive ? '#065f46' : '#991b1b',
        transition: 'background-color 0.3s ease',
        '&:hover': isUpdating
          ? {}
          : {
              bgcolor: isActive ? '#a7f3d0' : '#fecaca',
            },
      }}
    />
  );
}

// =============================================================================
// BUDGET CELL (inline editable)
// =============================================================================

function BudgetCell({
  campaign,
  onSave,
  onResult,
}: {
  campaign: FbManageCampaign;
  onSave: (campaignId: string, newCents: number) => Promise<void>;
  onResult: (campaignId: string, success: boolean, message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<'success' | 'error' | null>(null);

  const budget = campaign.daily_budget || campaign.lifetime_budget;
  const displayValue = formatBudget(budget);
  const isDaily = !!campaign.daily_budget;

  const handleStartEdit = () => {
    if (!budget) return;
    setValue((parseInt(budget, 10) / 100).toFixed(2));
    setEditing(true);
  };

  const handleSave = async () => {
    const cents = Math.round(parseFloat(value) * 100);
    if (isNaN(cents) || cents <= 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(campaign.id, cents);
      setFlash('success');
      onResult(campaign.id, true, `Budget updated to $${(cents / 100).toFixed(2)}`);
      setTimeout(() => setFlash(null), 2000);
    } catch (err) {
      setFlash('error');
      onResult(campaign.id, false, err instanceof Error ? err.message : 'Failed to update budget');
      setTimeout(() => setFlash(null), 2000);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <TextField
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={saving}
        size="small"
        autoFocus
        slotProps={{
          input: {
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          },
        }}
        sx={{
          width: 110,
          '& .MuiInputBase-input': {
            py: 0.5,
            fontSize: '0.8125rem',
          },
        }}
      />
    );
  }

  const flashBg = flash === 'success' ? '#d1fae5' : flash === 'error' ? '#fee2e2' : 'transparent';

  return (
    <Tooltip title={isDaily ? 'Daily budget (click to edit)' : 'Lifetime budget'} arrow>
      <Typography
        variant="body2"
        onClick={isDaily ? handleStartEdit : undefined}
        sx={{
          cursor: isDaily ? 'pointer' : 'default',
          fontFamily: 'monospace',
          fontSize: '0.8125rem',
          borderRadius: 1,
          px: 0.5,
          py: 0.25,
          bgcolor: flashBg,
          transition: 'background-color 0.3s ease',
          '&:hover': isDaily
            ? { textDecoration: 'underline', textUnderlineOffset: 3 }
            : {},
        }}
      >
        {displayValue}
      </Typography>
    </Tooltip>
  );
}

// =============================================================================
// TOOLBAR
// =============================================================================

function Toolbar({
  filters,
  adAccounts,
  onSearchChange,
  onAdAccountChange,
  onStatusChange,
  onDatePresetChange,
  onRefresh,
  isLoading,
  adReviewButton,
}: {
  filters: ManageFilters;
  adAccounts: FbAdAccount[];
  onSearchChange: (v: string) => void;
  onAdAccountChange: (v: string) => void;
  onStatusChange: (v: ManageFilters['status']) => void;
  onDatePresetChange: (v: DatePreset) => void;
  onRefresh: () => void;
  isLoading: boolean;
  adReviewButton?: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        mb: 2,
      }}
    >
      {/* Search */}
      <TextField
        placeholder="Search campaigns..."
        value={filters.search}
        onChange={(e) => onSearchChange(e.target.value)}
        size="small"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{
          flex: 1,
          minWidth: 200,
          maxWidth: 320,
          '& .MuiInputBase-input': {
            py: 0.875,
            fontSize: '0.8125rem',
          },
        }}
      />

      {/* Ad Account Filter */}
      <Select
        value={filters.adAccountId}
        onChange={(e) => onAdAccountChange(e.target.value)}
        size="small"
        sx={{
          minWidth: 160,
          fontSize: '0.8125rem',
          '& .MuiSelect-select': { py: 0.875 },
        }}
      >
        <MenuItem value="all">All Ad Accounts</MenuItem>
        {adAccounts.map((acc) => (
          <MenuItem key={acc.id} value={acc.id}>
            {acc.name || acc.account_id}
          </MenuItem>
        ))}
      </Select>

      {/* Date Range */}
      <Select
        value={filters.datePreset}
        onChange={(e) => onDatePresetChange(e.target.value as DatePreset)}
        size="small"
        sx={{
          minWidth: 130,
          fontSize: '0.8125rem',
          '& .MuiSelect-select': { py: 0.875 },
        }}
      >
        <MenuItem value="today">Today</MenuItem>
        <MenuItem value="yesterday">Yesterday</MenuItem>
        <MenuItem value="last_7d">Last 7 Days</MenuItem>
        <MenuItem value="last_30d">Last 30 Days</MenuItem>
      </Select>

      {/* Status Filter */}
      <Select
        value={filters.status}
        onChange={(e) => onStatusChange(e.target.value as ManageFilters['status'])}
        size="small"
        sx={{
          minWidth: 110,
          fontSize: '0.8125rem',
          '& .MuiSelect-select': { py: 0.875 },
        }}
      >
        <MenuItem value="all">All Status</MenuItem>
        <MenuItem value="ACTIVE">Active</MenuItem>
        <MenuItem value="PAUSED">Paused</MenuItem>
      </Select>

      {/* Refresh */}
      <Button
        variant="outlined"
        size="small"
        onClick={onRefresh}
        disabled={isLoading}
        startIcon={
          isLoading ? (
            <CircularProgress size={14} />
          ) : (
            <RefreshIcon sx={{ fontSize: 16 }} />
          )
        }
        sx={{
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.8125rem',
          borderColor: theme.palette.divider,
          color: 'text.secondary',
          '&:hover': {
            borderColor: theme.palette.text.secondary,
          },
        }}
      >
        Refresh
      </Button>

      {/* Spacer to push ad review button right */}
      <Box sx={{ flex: 1 }} />

      {adReviewButton}
    </Box>
  );
}

// =============================================================================
// MAIN TABLE
// =============================================================================

export function CampaignTable({
  campaigns,
  adAccounts,
  redtrackMap,
  filters,
  isLoading,
  onSearchChange,
  onAdAccountChange,
  onStatusChange,
  onDatePresetChange,
  onRefresh,
  onToggleStatus,
  onEditBudget,
  adReviewButton,
}: CampaignTableProps) {
  const theme = useTheme();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = useCallback((key: SortKey) => {
    setSortDir((prev) => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'));
    setSortKey(key);
  }, [sortKey]);

  const sortedCampaigns = useMemo(
    () => sortCampaigns(campaigns, sortKey, sortDir),
    [campaigns, sortKey, sortDir],
  );

  // Mutation flash state per campaign
  const [statusFlash, setStatusFlash] = useState<Map<string, 'success' | 'error'>>(new Map());

  // Snackbar
  const [toast, setToast] = useState<{ open: boolean; severity: 'success' | 'error'; message: string }>({
    open: false, severity: 'success', message: '',
  });

  const showToast = useCallback((severity: 'success' | 'error', message: string) => {
    setToast({ open: true, severity, message });
  }, []);

  const handleToggleExpand = useCallback((campaignId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  }, []);

  const allSelected =
    campaigns.length > 0 && selected.size === campaigns.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(campaigns.map((c) => c.id)));
    }
  };

  const handleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggle = useCallback(
    async (campaignId: string, currentStatus: string) => {
      setUpdatingIds((prev) => new Set(prev).add(campaignId));
      try {
        await onToggleStatus(campaignId, currentStatus);
        const newStatus = currentStatus === 'ACTIVE' ? 'Paused' : 'Active';
        showToast('success', `Campaign ${newStatus.toLowerCase()} successfully`);
        setStatusFlash((prev) => new Map(prev).set(campaignId, 'success'));
        setTimeout(() => setStatusFlash((prev) => { const n = new Map(prev); n.delete(campaignId); return n; }), 2000);
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to update status');
        setStatusFlash((prev) => new Map(prev).set(campaignId, 'error'));
        setTimeout(() => setStatusFlash((prev) => { const n = new Map(prev); n.delete(campaignId); return n; }), 2000);
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(campaignId);
          return next;
        });
      }
    },
    [onToggleStatus, showToast],
  );

  const handleBudgetResult = useCallback((_campaignId: string, success: boolean, message: string) => {
    showToast(success ? 'success' : 'error', message);
  }, [showToast]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
  };

  // Header cell styles
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
    py: 1.25,
    fontSize: '0.8125rem',
    borderBottom: '1px solid',
    borderColor: alpha(theme.palette.divider, 0.5),
  };

  return (
    <Box>
      <Toolbar
        filters={filters}
        adAccounts={adAccounts}
        onSearchChange={onSearchChange}
        onAdAccountChange={onAdAccountChange}
        onStatusChange={onStatusChange}
        onDatePresetChange={onDatePresetChange}
        onRefresh={onRefresh}
        isLoading={isLoading}
        adReviewButton={adReviewButton}
      />

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
              <TableCell sx={{ ...headerSx, width: 40 }} />
              <TableCell padding="checkbox" sx={headerSx}>
                <Checkbox
                  checked={allSelected}
                  indeterminate={selected.size > 0 && !allSelected}
                  onChange={handleSelectAll}
                  size="small"
                />
              </TableCell>
              <TableCell sx={headerSx}>
                <TableSortLabel active={sortKey === 'name'} direction={sortKey === 'name' ? sortDir : 'asc'} onClick={() => handleSort('name')}>
                  Campaign
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerSx}>
                <TableSortLabel active={sortKey === 'adAccount'} direction={sortKey === 'adAccount' ? sortDir : 'asc'} onClick={() => handleSort('adAccount')}>
                  Ad Account
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...headerSx, textAlign: 'right' }}>
                <TableSortLabel active={sortKey === 'budget'} direction={sortKey === 'budget' ? sortDir : 'asc'} onClick={() => handleSort('budget')}>
                  Budget
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...headerSx, textAlign: 'right' }}>
                <TableSortLabel active={sortKey === 'spend'} direction={sortKey === 'spend' ? sortDir : 'asc'} onClick={() => handleSort('spend')}>
                  Spend
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...headerSx, textAlign: 'right' }}>
                <TableSortLabel active={sortKey === 'roas'} direction={sortKey === 'roas' ? sortDir : 'asc'} onClick={() => handleSort('roas')}>
                  ROAS
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerSx}>
                <TableSortLabel active={sortKey === 'status'} direction={sortKey === 'status' ? sortDir : 'asc'} onClick={() => handleSort('status')}>
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...headerSx, width: 48 }} />
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading && campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6 }}>
                  <CircularProgress size={28} />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1.5 }}
                  >
                    Loading campaigns...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No campaigns found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedCampaigns.map((campaign) => {
                const roas = getRoas(campaign);
                const redtrackId = redtrackMap.get(campaign.name);
                const isExpanded = expandedIds.has(campaign.id);

                return (
                  <React.Fragment key={campaign.id}>
                    <TableRow
                      hover
                      selected={selected.has(campaign.id)}
                      sx={{
                        '&:last-child td': isExpanded ? {} : { borderBottom: 0 },
                      }}
                    >
                      {/* Expand button */}
                      <TableCell sx={{ ...cellSx, width: 40, px: 0.5 }}>
                        {redtrackId ? (
                          <IconButton
                            size="small"
                            onClick={() => handleToggleExpand(campaign.id)}
                            sx={{ color: 'text.secondary' }}
                          >
                            {isExpanded ? (
                              <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
                            ) : (
                              <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
                            )}
                          </IconButton>
                        ) : null}
                      </TableCell>

                      {/* Checkbox */}
                      <TableCell padding="checkbox" sx={cellSx}>
                        <Checkbox
                          checked={selected.has(campaign.id)}
                          onChange={() => handleSelect(campaign.id)}
                          size="small"
                        />
                      </TableCell>

                      {/* Campaign Name + ID */}
                      <TableCell sx={{ ...cellSx, maxWidth: 320 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {campaign.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            fontFamily: 'monospace',
                            fontSize: '0.6875rem',
                          }}
                        >
                          {campaign.id}
                        </Typography>
                      </TableCell>

                      {/* Ad Account */}
                      <TableCell sx={cellSx}>
                        <Typography variant="body2" noWrap>
                          {campaign.adAccountName}
                        </Typography>
                      </TableCell>

                      {/* Budget */}
                      <TableCell sx={{ ...cellSx, textAlign: 'right' }}>
                        <BudgetCell campaign={campaign} onSave={onEditBudget} onResult={handleBudgetResult} />
                      </TableCell>

                      {/* Spend */}
                      <TableCell
                        sx={{
                          ...cellSx,
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {getSpend(campaign)}
                      </TableCell>

                      {/* ROAS */}
                      <TableCell
                        sx={{
                          ...cellSx,
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color:
                            roas === null
                              ? 'text.secondary'
                              : roas >= 1
                                ? '#059669'
                                : '#dc2626',
                        }}
                      >
                        {roas !== null ? roas.toFixed(2) : '—'}
                      </TableCell>

                      {/* Status Toggle */}
                      <TableCell sx={cellSx}>
                        <StatusToggle
                          status={campaign.status}
                          onToggle={() =>
                            handleToggle(campaign.id, campaign.status)
                          }
                          isUpdating={updatingIds.has(campaign.id)}
                          flashState={statusFlash.get(campaign.id)}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell sx={cellSx}>
                        <Tooltip title="Copy Campaign ID" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleCopyId(campaign.id)}
                            sx={{ color: 'text.secondary' }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>

                    {/* Expanded RedTrack row */}
                    {redtrackId && (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          sx={{ p: 0, borderBottom: isExpanded ? '1px solid' : 'none', borderColor: 'divider' }}
                        >
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                              <RedTrackDataPanel redtrackCampaignId={redtrackId} />
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer count */}
      {campaigns.length > 0 && (
        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
            {selected.size > 0 && ` · ${selected.size} selected`}
          </Typography>
        </Box>
      )}

      {/* Toast notification for mutations */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{ fontWeight: 500 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
