/**
 * RedTrackDataPanel — Reusable RedTrack performance data display.
 *
 * Shows 5 KPI summary cards + daily breakdown table (last 30 days).
 * Used in CampaignViewPage and Manage page expand rows.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';

import { fetchRedtrackReport } from '../features/redtrack/api';

// API key is injected server-side by the proxy — this is just a sentinel value
const REDTRACK_API_KEY = 'proxy-managed' as string | undefined;

interface RedTrackDataPanelProps {
  redtrackCampaignId?: string;
}

export function RedTrackDataPanel({ redtrackCampaignId }: RedTrackDataPanelProps) {
  const theme = useTheme();
  const [showExpanded, setShowExpanded] = useState(false);

  const reportQuery = useQuery({
    queryKey: ['redtrack-report', redtrackCampaignId],
    queryFn: async () => {
      if (!REDTRACK_API_KEY) throw new Error('RedTrack API key not configured');

      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
      const dateTo = today.toISOString().split('T')[0];

      const report = await fetchRedtrackReport(REDTRACK_API_KEY, {
        campaignId: redtrackCampaignId!,
        dateFrom,
        dateTo,
        group: 'date',
      });

      report.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return b.date.localeCompare(a.date);
      });

      return report;
    },
    enabled: !!redtrackCampaignId && !!REDTRACK_API_KEY,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (!redtrackCampaignId) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No RedTrack campaign linked. Link a RedTrack campaign to view tracking data.
      </Alert>
    );
  }

  if (!REDTRACK_API_KEY) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        RedTrack API key not configured.
      </Alert>
    );
  }

  if (reportQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (reportQuery.isError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {reportQuery.error instanceof Error ? reportQuery.error.message : 'Failed to load RedTrack data'}
      </Alert>
    );
  }

  const data = reportQuery.data || [];

  if (data.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No data available for the last 30 days.
      </Alert>
    );
  }

  const totals = data.reduce(
    (acc, row) => ({
      cost: acc.cost + row.cost,
      conversions: acc.conversions + row.conversions,
      revenue: acc.revenue + row.revenue,
      clicks: acc.clicks + row.clicks,
      lp_clicks: acc.lp_clicks + row.lp_clicks,
    }),
    { cost: 0, conversions: 0, revenue: 0, clicks: 0, lp_clicks: 0 },
  );

  const totalRoas = totals.cost > 0 ? totals.revenue / totals.cost : 0;
  const totalRoi = totals.cost > 0 ? ((totals.revenue - totals.cost) / totals.cost) * 100 : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Total Cost</Typography>
          <Typography variant="h5">${totals.cost.toFixed(2)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Purchases</Typography>
          <Typography variant="h5">{totals.conversions}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Revenue</Typography>
          <Typography variant="h5">${totals.revenue.toFixed(2)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>ROAS</Typography>
          <Typography variant="h5">{totalRoas.toFixed(2)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>ROI</Typography>
          <Typography variant="h5">{totalRoi.toFixed(1)}%</Typography>
        </Paper>
      </Box>

      {/* Expand/Collapse Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          size="small"
          onClick={() => setShowExpanded(!showExpanded)}
          startIcon={showExpanded ? <ExpandMoreIcon /> : <AddIcon />}
        >
          {showExpanded ? 'Show Less Columns' : 'Show More Columns'}
        </Button>
      </Box>

      {/* Data Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ '& .MuiTableCell-head': { bgcolor: theme.palette.primary.main, color: '#fff' } }}>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Cost</TableCell>
              <TableCell align="right">Purchase</TableCell>
              <TableCell align="right">Revenue</TableCell>
              <TableCell align="right">ROAS</TableCell>
              <TableCell align="right">ROI</TableCell>
              {showExpanded && (
                <>
                  <TableCell align="right">CPA</TableCell>
                  <TableCell align="right">AOV</TableCell>
                  <TableCell align="right">EPC</TableCell>
                  <TableCell align="right">Clicks</TableCell>
                  <TableCell align="right">LP Clicks</TableCell>
                  <TableCell align="right">LP CTR</TableCell>
                  <TableCell align="right">CR</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={row.date || index}>
                <TableCell>{row.date || '-'}</TableCell>
                <TableCell align="right">${row.cost.toFixed(2)}</TableCell>
                <TableCell align="right">{row.conversions}</TableCell>
                <TableCell align="right">${row.revenue.toFixed(2)}</TableCell>
                <TableCell align="right">{row.roas.toFixed(2)}</TableCell>
                <TableCell align="right">{(row.roi * 100).toFixed(2)}%</TableCell>
                {showExpanded && (
                  <>
                    <TableCell align="right">${row.cpa.toFixed(2)}</TableCell>
                    <TableCell align="right">${row.aov.toFixed(2)}</TableCell>
                    <TableCell align="right">${row.epc.toFixed(4)}</TableCell>
                    <TableCell align="right">{row.clicks}</TableCell>
                    <TableCell align="right">{row.lp_clicks}</TableCell>
                    <TableCell align="right">{(row.lp_ctr * 100).toFixed(2)}%</TableCell>
                    <TableCell align="right">{(row.cr * 100).toFixed(2)}%</TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
