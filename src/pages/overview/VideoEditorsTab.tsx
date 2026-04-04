/**
 * VideoEditorsTab — Monthly performance breakdown per video editor.
 *
 * Data comes from the existing listVideos() query.
 * Groups videos by editor + month using firstUploadedAt from Video Data JSON.
 *
 * Props:
 * - editorId: optional — when set, shows only that editor (for editor portal)
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Collapse from '@mui/material/Collapse';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTheme, alpha } from '@mui/material/styles';
import { listVideos } from '../../features/videos/data';
import { provider } from '../../data/provider';
import { ToggleTabs } from '../../ui/ToggleTabs';
import { ScriptKpiTab } from './ScriptKpiTab';

type EditorSubTab = 'view1' | 'view2';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default monthly target in minutes per editor */
const DEFAULT_TARGET_MINUTES = 1080;

/** Editor names to exclude from the list */
const EXCLUDED_EDITORS = new Set(['AI']);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// =============================================================================
// TYPES
// =============================================================================

interface MonthStats {
  key: string;
  label: string;
  minutes: number;
  videos: number;
  missingData: number;
  target: number;
  debt: number;
  cumulativeDebt: number;
}

interface EditorStats {
  editorId: string;
  editorName: string;
  currentMonth: MonthStats;
  allTimeMinutes: number;
  allTimeVideos: number;
  cumulativeDebt: number;
  totalMissingData: number;
  months: MonthStats[];
}

// =============================================================================
// HELPERS
// =============================================================================

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key: string): string {
  const [yearStr, monthStr] = key.split('-');
  return `${MONTH_NAMES[parseInt(monthStr, 10) - 1]} ${yearStr}`;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface ParsedVideoData {
  firstUploadedAt?: string;
  lastUploadedAt?: string;
  durationSeconds?: number;
}

function parseVideoData(videoData: string | undefined): ParsedVideoData | null {
  if (!videoData) return null;
  try {
    return JSON.parse(videoData);
  } catch {
    return null;
  }
}

// =============================================================================
// DATA COMPUTATION
// =============================================================================

const COMPLETED_STATUSES = new Set(['review', 'available', 'used']);

function computeEditorStats(
  videos: Array<{
    editor: { id: string; name: string };
    status: string;
    lastUploadAt?: string;
    videoData?: string;
  }>,
  editorId?: string
): EditorStats[] {
  const currentMonthKey = getCurrentMonthKey();

  const editorMap = new Map<string, {
    name: string;
    months: Map<string, { minutes: number; videos: number; missingData: number }>;
  }>();

  for (const video of videos) {
    if (editorId && video.editor.id !== editorId) continue;
    if (!COMPLETED_STATUSES.has(video.status)) continue;

    // Exclude hardcoded editor names
    if (EXCLUDED_EDITORS.has(video.editor.name)) continue;

    const parsed = parseVideoData(video.videoData);
    const uploadDate = video.lastUploadAt ?? parsed?.firstUploadedAt;
    if (!uploadDate) continue;

    const eid = video.editor.id;
    const ename = video.editor.name;
    const monthKey = getMonthKey(uploadDate);

    if (!editorMap.has(eid)) {
      editorMap.set(eid, { name: ename, months: new Map() });
    }

    const editor = editorMap.get(eid)!;
    if (!editor.months.has(monthKey)) {
      editor.months.set(monthKey, { minutes: 0, videos: 0, missingData: 0 });
    }

    const month = editor.months.get(monthKey)!;
    month.videos += 1;

    if (parsed?.durationSeconds && parsed.durationSeconds > 0) {
      month.minutes += parsed.durationSeconds / 60;
    } else {
      month.missingData += 1;
    }
  }

  const result: EditorStats[] = [];

  for (const [eid, data] of editorMap) {
    // Exclude hardcoded editor names (double check at editor level)
    if (EXCLUDED_EDITORS.has(data.name)) continue;

    const monthEntries = Array.from(data.months.entries())
      .sort((a, b) => b[0].localeCompare(a[0]));

    // Build months with cumulative debt (oldest to newest, then reverse)
    const monthsChronological = [...monthEntries].reverse();
    let runningDebt = 0;
    const monthsWithCumulative: MonthStats[] = monthsChronological.map(([key, stats]) => {
      const minutes = Math.round(stats.minutes);
      const debt = DEFAULT_TARGET_MINUTES - minutes;
      runningDebt += debt;
      return {
        key,
        label: getMonthLabel(key),
        minutes,
        videos: stats.videos,
        missingData: stats.missingData,
        target: DEFAULT_TARGET_MINUTES,
        debt,
        cumulativeDebt: runningDebt,
      };
    });

    // Reverse back to most recent first
    const months = monthsWithCumulative.reverse();

    const allTimeMinutes = months.reduce((sum, m) => sum + m.minutes, 0);
    const allTimeVideos = months.reduce((sum, m) => sum + m.videos, 0);
    const totalMissingData = months.reduce((sum, m) => sum + m.missingData, 0);
    const cumulativeDebt = runningDebt;

    const currentMonth = months.find(m => m.key === currentMonthKey) ?? {
      key: currentMonthKey,
      label: getMonthLabel(currentMonthKey),
      minutes: 0,
      videos: 0,
      missingData: 0,
      target: DEFAULT_TARGET_MINUTES,
      debt: DEFAULT_TARGET_MINUTES,
      cumulativeDebt: cumulativeDebt + DEFAULT_TARGET_MINUTES,
    };

    result.push({
      editorId: eid,
      editorName: data.name,
      currentMonth,
      allTimeMinutes,
      allTimeVideos,
      cumulativeDebt,
      totalMissingData,
      months,
    });
  }

  result.sort((a, b) => a.editorName.localeCompare(b.editorName));
  return result;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function DebtChip({ debt, size = 'small' }: { debt: number; size?: 'small' | 'medium' }) {
  if (debt <= 0) {
    const label = debt === 0 ? 'On Target' : `+${Math.abs(debt)} min`;
    return <Chip label={label} size={size} color="success" variant="outlined" sx={{ fontWeight: 600, minWidth: 80 }} />;
  }
  return <Chip label={`-${debt} min`} size={size} color="error" variant="outlined" sx={{ fontWeight: 600, minWidth: 80 }} />;
}

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', lineHeight: 1.3 }}>
        {value}
        {sub && <Typography component="span" variant="caption" color="text.secondary"> {sub}</Typography>}
      </Typography>
    </Box>
  );
}

function EditorCard({ editor, defaultExpanded }: { editor: EditorStats; defaultExpanded?: boolean }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);

  const progressPct = Math.min((editor.currentMonth.minutes / editor.currentMonth.target) * 100, 100);

  const headerSx = {
    fontWeight: 600,
    fontSize: '0.75rem',
    color: '#fff !important',
    py: 1,
    px: 1.5,
    backgroundColor: `${theme.palette.primary.main} !important`,
    borderRight: '1px solid rgba(255,255,255,0.15)',
    borderBottom: '1px solid rgba(255,255,255,0.25) !important',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  };
  const cellSx = { py: 1.5, px: 1.5, fontSize: '0.875rem' };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      {/* Summary row — clickable */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2.5,
          py: 2,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
          transition: 'background-color 0.15s ease',
        }}
      >
        <IconButton size="small" sx={{ p: 0 }}>
          {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>

        <Typography sx={{ fontWeight: 700, fontSize: '1.0625rem', minWidth: 100 }}>
          {editor.editorName}
        </Typography>

        {/* Current month progress */}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flex: 1 }}>
          <Box sx={{ minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">This Month</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                {editor.currentMonth.minutes}
                <Typography component="span" variant="caption" color="text.secondary"> / {editor.currentMonth.target} min</Typography>
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPct}
              sx={{
                mt: 0.5,
                height: 4,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                  bgcolor: progressPct >= 100 ? 'success.main' : 'primary.main',
                },
              }}
            />
          </Box>
          <StatBox label="Uploaded Videos" value={editor.currentMonth.videos} />
          <DebtChip debt={editor.currentMonth.debt} />
        </Box>

        {/* Right side stats */}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <StatBox label="All Time" value={editor.allTimeMinutes.toLocaleString()} sub="min" />
          <StatBox label="Total Videos" value={editor.allTimeVideos.toLocaleString()} />
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">Cumulative Debt</Typography>
            <Box><DebtChip debt={editor.cumulativeDebt} /></Box>
          </Box>
        </Box>
      </Box>

      {/* Missing data warning banner */}
      {editor.totalMissingData > 0 && (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2.5,
          py: 1,
          bgcolor: 'error.main',
          color: '#fff',
        }}>
          <WarningAmberIcon sx={{ fontSize: 18 }} />
          <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
            {editor.totalMissingData} video{editor.totalMissingData > 1 ? 's' : ''} missing duration data — minutes may be inaccurate
          </Typography>
        </Box>
      )}

      {/* Expanded monthly breakdown */}
      <Collapse in={expanded}>
        <TableContainer sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>Month</TableCell>
                <TableCell sx={headerSx} align="right">Uploaded Videos</TableCell>
                <TableCell sx={headerSx} align="right">Minutes Completed</TableCell>
                <TableCell sx={headerSx} align="right">Target</TableCell>
                <TableCell sx={headerSx} align="center">Monthly Debt</TableCell>
                <TableCell sx={{ ...headerSx, borderRight: 'none' }} align="center">Cumulative Debt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {editor.months.map((month) => {
                const isCurrent = month.key === getCurrentMonthKey();
                return (
                  <TableRow key={month.key} hover sx={isCurrent ? { bgcolor: 'action.hover' } : undefined}>
                    <TableCell sx={{ ...cellSx, fontWeight: isCurrent ? 700 : 400 }}>
                      {month.label}
                      {isCurrent && (
                        <Chip label="Current" size="small" color="primary" variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.6875rem' }} />
                      )}
                    </TableCell>
                    <TableCell sx={cellSx} align="right">{month.videos}</TableCell>
                    <TableCell sx={cellSx} align="right">
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                        {month.minutes}
                        {month.missingData > 0 && (
                          <Chip
                            icon={<WarningAmberIcon sx={{ fontSize: '14px !important' }} />}
                            label={`${month.missingData} missing`}
                            size="small"
                            color="error"
                            sx={{ fontWeight: 600, fontSize: '0.6875rem', height: 22 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={cellSx} align="right">{month.target}</TableCell>
                    <TableCell sx={cellSx} align="center">
                      <DebtChip debt={month.debt} />
                    </TableCell>
                    <TableCell sx={cellSx} align="center">
                      <DebtChip debt={month.cumulativeDebt} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Paper>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface VideoEditorsTabProps {
  /** When set, shows only this editor's data (for editor portal view) */
  editorId?: string;
}

export function VideoEditorsTab({ editorId }: VideoEditorsTabProps) {
  const [subTab, setSubTab] = useState<EditorSubTab>('view1');

  const videosQuery = useQuery({
    queryKey: ['videos'],
    queryFn: ({ signal }) => listVideos(signal),
    staleTime: 30_000,
  });

  const editorsQuery = useQuery({
    queryKey: ['editors'],
    queryFn: () => provider.users.getEditors(),
    staleTime: 30_000,
  });

  // Only include editors that have the "Video Editor" role
  const editorIds = useMemo(() => {
    if (!editorsQuery.data) return null;
    return new Set(editorsQuery.data.map(e => e.id));
  }, [editorsQuery.data]);

  const editorStats = useMemo(() => {
    if (!videosQuery.data || !editorIds) return [];
    const filtered = editorId
      ? videosQuery.data
      : videosQuery.data.filter(v => editorIds.has(v.editor.id));
    return computeEditorStats(filtered, editorId);
  }, [videosQuery.data, editorIds, editorId]);

  if (videosQuery.isLoading || editorsQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (editorStats.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Typography color="text.secondary">No video data found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ToggleTabs
        value={subTab}
        onChange={setSubTab}
        size="small"
        options={[
          { value: 'view1', label: 'View 1' },
          { value: 'view2', label: 'View 2' },
        ]}
      />

      {subTab === 'view1' ? (
        editorStats.map((editor) => (
          <EditorCard
            key={editor.editorId}
            editor={editor}
            defaultExpanded={!!editorId || editorStats.length === 1}
          />
        ))
      ) : (
        <ScriptKpiTab editorId={editorId} />
      )}
    </Box>
  );
}
