/**
 * LogTab - Execution history table with result status chips.
 */

import { useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import { formatExecuteValue } from '../../features/schedules/types';
import type { ScheduledAction } from '../../features/schedules/types';

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_COLORS = {
  Success: { bg: '#d1fae5', color: '#065f46', darkBg: '#1a3a2a', darkColor: '#6ee7b7' },
  Failed: { bg: '#fee2e2', color: '#991b1b', darkBg: '#5c2020', darkColor: '#fca5a5' },
};

const TYPE_COLORS = {
  'Budget Change': { bg: '#dbeafe', color: '#1e40af', darkBg: '#1e3a5f', darkColor: '#93c5fd' },
  'Status Change': { bg: '#f3e8ff', color: '#6b21a8', darkBg: '#3b1f5e', darkColor: '#c4b5fd' },
};

// =============================================================================
// ROW COMPONENT
// =============================================================================

function LogRow({
  action,
  index,
  isDark,
  cellSx,
}: {
  action: ScheduledAction;
  index: number;
  isDark: boolean;
  cellSx: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);

  const statusColor = STATUS_COLORS[action.status as keyof typeof STATUS_COLORS];
  const typeColor = TYPE_COLORS[action.type] || TYPE_COLORS['Budget Change'];

  function formatDateTime(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const hasResponse = !!action.response;

  return (
    <>
      <TableRow hover sx={{ '&:last-child td': { borderBottom: open ? undefined : 0 } }}>
        <TableCell sx={{ ...cellSx, color: 'text.secondary', fontWeight: 500 }}>
          {index + 1}
        </TableCell>

        <TableCell sx={cellSx}>
          <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
            {formatDateTime(action.executedAt)}
          </Typography>
        </TableCell>

        <TableCell sx={{ ...cellSx, fontWeight: 600 }}>
          {action.linkedCampaignName ? (
            <Box>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                {action.linkedCampaignName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                {action.campaignId}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
              {action.campaignId}
            </Typography>
          )}
        </TableCell>

        <TableCell sx={cellSx}>
          <Chip
            label={action.type}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.6875rem',
              bgcolor: isDark ? typeColor.darkBg : typeColor.bg,
              color: isDark ? typeColor.darkColor : typeColor.color,
            }}
          />
        </TableCell>

        <TableCell sx={{ ...cellSx, fontFamily: 'monospace' }}>
          {formatExecuteValue(action.type, action.execute)}
        </TableCell>

        <TableCell sx={cellSx}>
          {statusColor && (
            <Chip
              label={action.status}
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: '0.6875rem',
                bgcolor: isDark ? statusColor.darkBg : statusColor.bg,
                color: isDark ? statusColor.darkColor : statusColor.color,
              }}
            />
          )}
        </TableCell>

        <TableCell sx={cellSx}>
          <Chip
            label={action.source}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.6875rem' }}
          />
        </TableCell>

        <TableCell sx={cellSx}>
          {hasResponse && (
            <IconButton size="small" onClick={() => setOpen(!open)} sx={{ color: 'text.secondary' }}>
              {open ? <KeyboardArrowUpIcon sx={{ fontSize: 16 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          )}
        </TableCell>
      </TableRow>

      {hasResponse && (
        <TableRow>
          <TableCell colSpan={8} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ py: 1.5, px: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Response
                  </Typography>
                  {action.lastResponseTime && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                      {new Date(action.lastResponseTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </Typography>
                  )}
                </Box>
                <Box
                  component="pre"
                  sx={{
                    mt: 0.5,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    maxHeight: 200,
                    overflow: 'auto',
                    m: 0,
                  }}
                >
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(action.response!), null, 2);
                    } catch {
                      return action.response;
                    }
                  })()}
                </Box>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

interface LogTabProps {
  actions: ScheduledAction[];
  loading: boolean;
}

export function LogTab({ actions, loading }: LogTabProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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

  return (
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
              <TableCell sx={headerSx}>Executed</TableCell>
              <TableCell sx={headerSx}>Campaign</TableCell>
              <TableCell sx={headerSx}>Type</TableCell>
              <TableCell sx={headerSx}>Execute</TableCell>
              <TableCell sx={headerSx}>Result</TableCell>
              <TableCell sx={headerSx}>Source</TableCell>
              <TableCell sx={{ ...headerSx, width: 48 }} />
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Loading log...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : actions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No log entries yet
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              actions.map((action, index) => (
                <LogRow
                  key={action.id}
                  action={action}
                  index={index}
                  isDark={isDark}
                  cellSx={cellSx}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {!loading && actions.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            {actions.length} log entr{actions.length !== 1 ? 'ies' : 'y'}
          </Typography>
        </Box>
      )}
    </>
  );
}
