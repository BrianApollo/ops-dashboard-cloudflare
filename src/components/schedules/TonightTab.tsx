/**
 * TonightTab - Table of pending scheduled actions.
 */

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import ScheduleIcon from '@mui/icons-material/Schedule';

import { formatExecuteValue } from '../../features/schedules/types';
import type { ScheduledAction } from '../../features/schedules/types';

// =============================================================================
// CONSTANTS
// =============================================================================

const TYPE_COLORS = {
  'Budget Change': { bg: '#dbeafe', color: '#1e40af', darkBg: '#1e3a5f', darkColor: '#93c5fd' },
  'Status Change': { bg: '#f3e8ff', color: '#6b21a8', darkBg: '#3b1f5e', darkColor: '#c4b5fd' },
};

// =============================================================================
// COMPONENT
// =============================================================================

interface TonightTabProps {
  actions: ScheduledAction[];
  loading: boolean;
  onCancel: (action: ScheduledAction) => void;
  onAdd: () => void;
}

export function TonightTab({ actions, loading, onCancel, onAdd }: TonightTabProps) {
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

  function formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

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
              <TableCell sx={headerSx}>Campaign</TableCell>
              <TableCell sx={headerSx}>Type</TableCell>
              <TableCell sx={headerSx}>Execute</TableCell>
              <TableCell sx={headerSx}>Scheduled For</TableCell>
              <TableCell sx={headerSx}>Source</TableCell>
              <TableCell sx={{ ...headerSx, width: 64 }} />
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Loading schedules...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : actions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No actions scheduled
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={onAdd}
                    sx={{ mt: 1, textTransform: 'none' }}
                  >
                    Schedule one
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              actions.map((action, index) => {
                const typeColor = TYPE_COLORS[action.type] || TYPE_COLORS['Budget Change'];
                const chipBg = isDark ? typeColor.darkBg : typeColor.bg;
                const chipColor = isDark ? typeColor.darkColor : typeColor.color;

                return (
                  <TableRow
                    key={action.id}
                    hover
                    sx={{ '&:last-child td': { borderBottom: 0 } }}
                  >
                    <TableCell sx={{ ...cellSx, color: 'text.secondary', fontWeight: 500 }}>
                      {index + 1}
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
                          bgcolor: chipBg,
                          color: chipColor,
                        }}
                      />
                    </TableCell>

                    <TableCell sx={{ ...cellSx, fontFamily: 'monospace' }}>
                      {formatExecuteValue(action.type, action.execute)}
                    </TableCell>

                    <TableCell sx={cellSx}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                          {formatDate(action.scheduledAt)}
                        </Typography>
                      </Box>
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
                      <Tooltip title="Cancel" arrow>
                        <IconButton
                          size="small"
                          onClick={() => onCancel(action)}
                          sx={{
                            color: 'text.secondary',
                            '&:hover': { color: 'error.main' },
                          }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {!loading && actions.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            {actions.length} action{actions.length !== 1 ? 's' : ''} scheduled
          </Typography>
        </Box>
      )}
    </>
  );
}
