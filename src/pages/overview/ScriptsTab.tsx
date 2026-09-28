/**
 * ScriptsTab — Monthly breakdown of completed scripts by duration bucket.
 *
 * A script is "completed" when at least one of its videos is in review/available/used.
 * Script avg duration = mean of its videos' durationSeconds.
 * Script completion month = month of latest upload across its videos.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import { ToggleTabs } from '../../ui/ToggleTabs';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useTheme, alpha } from '@mui/material/styles';
import { listVideos } from '../../features/videos/data';
import { provider } from '../../data/provider';

const COMPLETED_STATUSES = new Set(['review', 'available', 'used']);
/** Editor names to leave out of the unfinished count. */
const EXCLUDED_EDITORS = new Set(['AI']);
const LONG_SCRIPT_THRESHOLD_MIN = 3;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key: string): string {
  const [yearStr, monthStr] = key.split('-');
  return `${MONTH_NAMES[parseInt(monthStr, 10) - 1]} ${yearStr}`;
}

/** ISO week key like "2026-W14" + iso week year (handles year boundaries). */
function getIsoWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  // Copy and shift to Thursday in current week (ISO: week belongs to year of its Thursday)
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (target.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const weekNum = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${target.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getWeekLabel(key: string): string {
  const [yearStr, weekPart] = key.split('-');
  const weekNum = parseInt(weekPart.slice(1), 10);
  return `Week ${weekNum}, ${yearStr}`;
}

interface MonthRow {
  key: string;
  label: string;
  shortScripts: number;
  longScripts: number;
  total: number;
  avgDurationSec: number;
}

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '—';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds - minutes * 60);
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function computeScriptMonthRows(
  videos: Array<{
    editor: { id: string; name: string };
    script?: { id: string; name: string };
    status: string;
    lastUploadAt?: string;
    videoData?: string;
  }>,
  granularity: 'monthly' | 'weekly' = 'monthly',
  editorId?: string
): MonthRow[] {
  // Group videos by script id
  const scriptMap = new Map<string, {
    durations: number[];
    latestDate: string | undefined;
  }>();

  for (const video of videos) {
    if (!COMPLETED_STATUSES.has(video.status)) continue;
    if (!video.script?.id || video.script.id === 'unknown') continue;
    if (editorId && video.editor.id !== editorId) continue;

    const parsed = parseVideoData(video.videoData);
    const uploadDate = video.lastUploadAt ?? parsed?.lastUploadedAt ?? parsed?.firstUploadedAt;
    if (!uploadDate) continue;

    if (!scriptMap.has(video.script.id)) {
      scriptMap.set(video.script.id, { durations: [], latestDate: undefined });
    }
    const entry = scriptMap.get(video.script.id)!;
    if (parsed?.durationSeconds && parsed.durationSeconds > 0) {
      entry.durations.push(parsed.durationSeconds);
    }
    if (!entry.latestDate || uploadDate > entry.latestDate) {
      entry.latestDate = uploadDate;
    }
  }

  // Bucket scripts by completion month
  const monthMap = new Map<string, MonthRow & { _durSum: number; _durCount: number }>();

  for (const [, entry] of scriptMap) {
    if (!entry.latestDate || entry.durations.length === 0) continue;
    const avgSec = entry.durations.reduce((s, n) => s + n, 0) / entry.durations.length;
    const avgMin = avgSec / 60;
    const monthKey = granularity === 'weekly'
      ? getIsoWeekKey(entry.latestDate)
      : getMonthKey(entry.latestDate);
    const label = granularity === 'weekly'
      ? getWeekLabel(monthKey)
      : getMonthLabel(monthKey);

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        key: monthKey,
        label,
        shortScripts: 0,
        longScripts: 0,
        total: 0,
        avgDurationSec: 0,
        _durSum: 0,
        _durCount: 0,
      });
    }
    const row = monthMap.get(monthKey)!;
    if (avgMin > LONG_SCRIPT_THRESHOLD_MIN) {
      row.longScripts += 1;
    } else {
      row.shortScripts += 1;
    }
    row.total += 1;
    for (const d of entry.durations) {
      row._durSum += d;
      row._durCount += 1;
    }
  }

  const finalized: MonthRow[] = Array.from(monthMap.values()).map((r) => ({
    key: r.key,
    label: r.label,
    shortScripts: r.shortScripts,
    longScripts: r.longScripts,
    total: r.total,
    avgDurationSec: r._durCount > 0 ? r._durSum / r._durCount : 0,
  }));

  // Weekly view: only show weeks from W01 of the current ISO year up to the
  // current week. Earlier years and future weeks are excluded.
  if (granularity === 'weekly') {
    const todayKey = getIsoWeekKey(new Date().toISOString());
    const [currentYearStr, currentWeekStr] = todayKey.split('-W');
    const currentYear = parseInt(currentYearStr, 10);
    const currentWeek = parseInt(currentWeekStr, 10);

    const byKey = new Map(
      finalized
        .filter((r) => {
          const [yStr, wPart] = r.key.split('-W');
          const y = parseInt(yStr, 10);
          const w = parseInt(wPart, 10);
          return y === currentYear && w <= currentWeek;
        })
        .map((r) => [r.key, r])
    );

    for (let w = 1; w <= currentWeek; w++) {
      const key = `${currentYear}-W${String(w).padStart(2, '0')}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          label: getWeekLabel(key),
          shortScripts: 0,
          longScripts: 0,
          total: 0,
          avgDurationSec: 0,
        });
      }
    }
    return Array.from(byKey.values()).sort((a, b) => b.key.localeCompare(a.key));
  }

  return finalized.sort((a, b) => b.key.localeCompare(a.key));
}

/** Assigned work still outstanding, for whoever is selected in the Editor filter. */
interface UnfinishedSummary {
  /** Unfinished script assignments (one script assigned to one editor = one). */
  scripts: number;
  /** How many editors have at least one unfinished script. */
  editors: number;
  /** Variant rows still sitting in To Do across those scripts. */
  variantsRemaining: number;
}

const EMPTY_UNFINISHED: UnfinishedSummary = { scripts: 0, editors: 0, variantsRemaining: 0 };

/**
 * Assigned-but-unfinished scripts.
 *
 * A "script" here is one editor's assignment: the variant rows of that script
 * linked to that editor. It is FINISHED once every one of those rows has a
 * video — i.e. the status has moved past To Do. Every linked row must be done,
 * so a script with 6 variants needs all 6; the expected count follows the rows
 * that actually exist rather than a fixed number.
 *
 * Rows with no editor are assigned to nobody and are skipped, as are rows with
 * no script link. Unlike computeScriptMonthRows this reads every status — To Do
 * rows are exactly what it is looking for.
 *
 * With `editorId` set the summary covers only that editor. Otherwise it totals
 * every editor, so the figure equals the sum of the per-editor counts.
 */
function computeUnfinishedScripts(
  videos: Array<{
    editor: { id: string; name: string };
    script?: { id: string; name: string };
    status: string;
  }>,
  editorId?: string
): UnfinishedSummary {
  const byEditor = new Map<string, Map<string, { total: number; done: number }>>();

  for (const video of videos) {
    if (editorId && video.editor.id !== editorId) continue;
    if (!video.editor?.id || video.editor.id === 'unknown') continue;
    if (EXCLUDED_EDITORS.has(video.editor.name)) continue;
    if (!video.script?.id || video.script.id === 'unknown') continue;

    let scripts = byEditor.get(video.editor.id);
    if (!scripts) {
      scripts = new Map();
      byEditor.set(video.editor.id, scripts);
    }

    let counts = scripts.get(video.script.id);
    if (!counts) {
      counts = { total: 0, done: 0 };
      scripts.set(video.script.id, counts);
    }

    counts.total += 1;
    if (COMPLETED_STATUSES.has(video.status)) counts.done += 1;
  }

  let scripts = 0;
  let editors = 0;
  let variantsRemaining = 0;

  for (const scriptCounts of byEditor.values()) {
    let editorHasWork = false;
    for (const { total, done } of scriptCounts.values()) {
      if (done >= total) continue;
      scripts += 1;
      variantsRemaining += total - done;
      editorHasWork = true;
    }
    if (editorHasWork) editors += 1;
  }

  return { scripts, editors, variantsRemaining };
}

/** Top-of-tab total of assigned work still outstanding. */
function UnfinishedStrip({ summary, scoped }: { summary: UnfinishedSummary; scoped: boolean }) {
  const theme = useTheme();
  const done = summary.scripts === 0;
  const tone = done ? theme.palette.success.main : theme.palette.warning.main;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        px: 2,
        py: 1.25,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        borderColor: alpha(tone, 0.4),
        bgcolor: alpha(tone, 0.06),
      }}
    >
      {done
        ? <TaskAltIcon sx={{ fontSize: 20, color: 'success.main' }} />
        : <PendingActionsIcon sx={{ fontSize: 20, color: 'warning.main' }} />}

      {done ? (
        <Typography component="span" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
          {scoped ? 'All assigned scripts are finished' : 'All assigned scripts are finished across every editor'}
        </Typography>
      ) : (
        <Typography component="span" sx={{ fontSize: '0.875rem' }}>
          <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.0625rem', mr: 0.75 }}>
            {summary.scripts}
          </Typography>
          unfinished script{summary.scripts === 1 ? '' : 's'}
          {!scoped && summary.editors > 0 && ` across ${summary.editors} editor${summary.editors === 1 ? '' : 's'}`}
        </Typography>
      )}

      {!done && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {summary.variantsRemaining} variant{summary.variantsRemaining === 1 ? '' : 's'} still to do
        </Typography>
      )}
    </Paper>
  );
}

type Granularity = 'monthly' | 'weekly';

export function ScriptsTab() {
  const theme = useTheme();
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [editorId, setEditorId] = useState<string>('all');

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

  const rows = useMemo(
    () => (videosQuery.data
      ? computeScriptMonthRows(videosQuery.data, granularity, editorId === 'all' ? undefined : editorId)
      : []),
    [videosQuery.data, granularity, editorId]
  );

  // Outstanding work for the selected editor, or every editor when "All" is picked.
  // Granularity does not apply — this is a live backlog, not a period breakdown.
  const unfinished = useMemo(
    () => (videosQuery.data
      ? computeUnfinishedScripts(videosQuery.data, editorId === 'all' ? undefined : editorId)
      : EMPTY_UNFINISHED),
    [videosQuery.data, editorId]
  );

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

  if (videosQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const editorFilter = (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, alignItems: 'center' }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="editor-filter-label">Editor</InputLabel>
        <Select
          labelId="editor-filter-label"
          label="Editor"
          value={editorId}
          onChange={(e) => setEditorId(e.target.value)}
        >
          <MenuItem value="all">All Editors</MenuItem>
          {(editorsQuery.data ?? []).map((ed) => (
            <MenuItem key={ed.id} value={ed.id}>{ed.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <ToggleTabs
        value={granularity}
        onChange={setGranularity}
        size="small"
        options={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'weekly', label: 'Weekly' },
        ]}
      />
    </Box>
  );

  if (rows.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {editorFilter}
        <UnfinishedStrip summary={unfinished} scoped={editorId !== 'all'} />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography color="text.secondary">No completed scripts found.</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {editorFilter}
      <UnfinishedStrip summary={unfinished} scoped={editorId !== 'all'} />
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={headerSx}>{granularity === 'weekly' ? 'Week' : 'Month'}</TableCell>
            <TableCell sx={headerSx} align="right">Completed Scripts &lt; 3 min</TableCell>
            <TableCell sx={headerSx} align="right">Completed Scripts &gt; 3 min</TableCell>
            <TableCell sx={headerSx} align="right">Total Completed Scripts</TableCell>
            <TableCell sx={{ ...headerSx, borderRight: 'none' }} align="right">Average Duration</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key} hover>
              <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{row.label}</TableCell>
              <TableCell sx={cellSx} align="right">{row.shortScripts}</TableCell>
              <TableCell sx={cellSx} align="right">{row.longScripts}</TableCell>
              <TableCell sx={{ ...cellSx, fontWeight: 600 }} align="right">{row.total}</TableCell>
              <TableCell sx={cellSx} align="right">{formatDuration(row.avgDurationSec)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </TableContainer>
    </Box>
  );
}
