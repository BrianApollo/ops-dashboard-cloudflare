/**
 * EditorMonthlyStats — Monthly snapshot card for the Video Editor Portal header.
 *
 * Shown only to a logged-in editor viewing their own data. Renders, for the
 * selected month (dropdown, defaults to the current month):
 *   - Working days     = count of Mon–Fri in that month   (hover: mini calendar)
 *   - Expected scripts = working days × 3                  (hover: the calc)
 *   - Completed scripts = distinct scripts (for this editor) where EVERY variant
 *                         is "done" (status not To Do), counted in the month of
 *                         the latest upload                (hover: the names)
 * A faint average video length (of those completed scripts' videos) sits in the
 * top-right, deliberately low-key.
 *
 * Data comes from the already-cached listVideos() query (queryKey ['videos']),
 * the same source VideoEditorsTab uses — no extra fetch, no Airtable key in the
 * browser. The stored upload timestamps are already GMT+7, so a script's month
 * is read straight from its date — no timezone math.
 */

import { forwardRef, useMemo, useState, type HTMLAttributes } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import { useTheme, alpha } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { listVideos } from '../../features/videos/data';
import type { VideoAsset } from '../../features/videos/types';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Everything here is in GMT+7, independent of the viewer's timezone.
 *
 * - Video dates: Airtable's lastUploadedAt is already stored as GMT+7 wall-clock
 *   (the trailing "Z" is nominal), so a video's month comes straight from the
 *   written 'YYYY-MM' — no math.
 * - "Now": Date.now() is a universal instant (same number in every timezone). We
 *   add 7h and read it back via toISOString() (which is always UTC), pinning the
 *   current month to GMT+7 for everyone.
 */
const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;

/** 'YYYY-MM' of a universal instant, pinned to GMT+7 (viewer-timezone agnostic). */
function gmt7MonthKey(ms: number): string {
  return new Date(ms + GMT7_OFFSET_MS).toISOString().slice(0, 7);
}

/** Human label for a 'YYYY-MM' key, e.g. "June 2026". */
function labelFromKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Count Monday–Friday days in the given month (month is 0-based). */
function countWeekdays(year: number, month0: number): number {
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month0, day).getDay(); // 0 = Sun … 6 = Sat
    if (dow >= 1 && dow <= 5) count += 1;
  }
  return count;
}

/** Seconds → "m:ss". */
function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Per-month aggregate of completed scripts: their names + all variant durations. */
interface MonthAgg {
  names: string[];
  durations: number[];
}

/**
 * Completed scripts per month for one editor.
 *
 * A "script" = one script.id (Airtable Video Scripts record, already per actor).
 * For this editor, a script is COMPLETE only when EVERY one of its variant rows
 * is "done" (status not To Do) — 5/6 is not complete, 6/6 is; works for any
 * variant count (e.g. 20/20). A complete script is counted in the month of its
 * LATEST variant upload (lastUploadedAt). For each month we also keep the script
 * names and the durationSeconds of those scripts' videos (for the average).
 */
function completedScriptsByMonth(videos: VideoAsset[], editorId: string): Map<string, MonthAgg> {
  // Per script.id (this editor only): name, total variants, how many are "done"
  // (status not To Do), the month of the latest upload, and variant durations.
  const byScript = new Map<
    string,
    { name: string; total: number; done: number; maxMs: number; maxKey: string | null; durations: number[] }
  >();
  for (const v of videos) {
    if (v.editor.id !== editorId) continue;

    let acc = byScript.get(v.script.id);
    if (!acc) {
      acc = { name: v.script.name, total: 0, done: 0, maxMs: 0, maxKey: null, durations: [] };
      byScript.set(v.script.id, acc);
    }
    acc.total += 1;

    // "Done" = status is not To Do (matches the Videos table status).
    if (v.status !== 'todo') acc.done += 1;

    // Read the Video Data JSON once: completion timestamp + duration.
    let when: unknown;
    let dur: unknown;
    if (v.videoData) {
      try {
        const j = JSON.parse(v.videoData);
        when = j.lastUploadedAt;
        dur = j.durationSeconds;
      } catch {
        /* ignore malformed JSON */
      }
    }
    // Completion date = latest upload; month comes straight from the (GMT+7) string.
    if (typeof when === 'string' && when) {
      const ms = Date.parse(when);
      if (!Number.isNaN(ms) && ms > acc.maxMs) {
        acc.maxMs = ms;
        acc.maxKey = when.slice(0, 7);
      }
    }
    if (typeof dur === 'number' && dur > 0) acc.durations.push(dur);
  }

  // Keep only fully-done scripts, bucketed at the month of their latest upload.
  // (A done script with no upload timestamp can't be dated, so it's skipped.)
  const byMonth = new Map<string, MonthAgg>();
  for (const acc of byScript.values()) {
    if (acc.total > 0 && acc.done === acc.total && acc.maxKey) {
      let m = byMonth.get(acc.maxKey);
      if (!m) {
        m = { names: [], durations: [] };
        byMonth.set(acc.maxKey, m);
      }
      m.names.push(acc.name);
      m.durations.push(...acc.durations);
    }
  }
  return byMonth;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * One label/value row. forwardRef + prop spread so a Tooltip can attach its
 * hover/focus handlers (MUI injects them onto the child — the child must forward
 * both the ref and the rest props, or the tooltip never fires).
 */
const StatRow = forwardRef<
  HTMLDivElement,
  { label: string; value: string | number } & HTMLAttributes<HTMLDivElement>
>(function StatRow({ label, value, ...rest }, ref) {
    return (
      <Box
        ref={ref}
        {...rest}
        sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, cursor: 'default' }}
      >
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
          {value}
        </Typography>
      </Box>
    );
  }
);

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Mini month calendar with the Mon–Fri columns highlighted. */
function WeekdayCalendar({ year, month0, workingDays }: { year: number; month0: number; workingDays: number }) {
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const firstDow = new Date(year, month0, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Box sx={{ p: 0.25 }}>
      <Typography sx={{ fontSize: '0.65rem', mb: 0.5, opacity: 0.85 }}>
        {workingDays} working days (Mon–Fri)
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 18px)', gap: '2px' }}>
        {WEEKDAY_LABELS.map((d, i) => (
          <Box
            key={`h${i}`}
            sx={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, opacity: i >= 1 && i <= 5 ? 1 : 0.4 }}
          >
            {d}
          </Box>
        ))}
        {cells.map((d, i) => {
          const isWeekday = i % 7 >= 1 && i % 7 <= 5;
          return (
            <Box
              key={i}
              sx={{
                height: 18,
                lineHeight: '18px',
                textAlign: 'center',
                fontSize: '0.6rem',
                borderRadius: 0.5,
                bgcolor: d && isWeekday ? 'primary.main' : 'transparent',
                color: d ? (isWeekday ? 'common.white' : 'rgba(255,255,255,0.45)') : 'transparent',
              }}
            >
              {d ?? ''}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/** Scrollable list of completed script names (used inside an interactive tooltip). */
function CompletedList({ names }: { names: string[] }) {
  if (names.length === 0) {
    return <Box sx={{ px: 1.25, py: 1, fontSize: '0.72rem' }}>No completed scripts this month</Box>;
  }
  return (
    <Box sx={{ maxHeight: 300, overflowY: 'auto', px: 1.25, py: 1 }}>
      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, mb: 0.5, opacity: 0.85 }}>
        {names.length} completed
      </Typography>
      {names.map((n, i) => (
        <Box key={i} sx={{ fontSize: '0.72rem', lineHeight: 1.6, whiteSpace: 'nowrap' }}>
          {i + 1}. {n}
        </Box>
      ))}
    </Box>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface EditorMonthlyStatsProps {
  /** The editor whose completed-scripts are counted (the logged-in user). */
  editorId: string;
}

export function EditorMonthlyStats({ editorId }: EditorMonthlyStatsProps) {
  const theme = useTheme();

  const { data: videos = [] } = useQuery({
    queryKey: ['videos'],
    queryFn: ({ signal }) => listVideos(signal),
    staleTime: 30_000,
  });

  const byMonth = useMemo(
    () => completedScriptsByMonth(videos, editorId),
    [videos, editorId]
  );

  const currentKey = useMemo(() => gmt7MonthKey(new Date().getTime()), []);

  // Months with activity + the current month, newest first — lets the editor
  // step back through their history.
  const availableMonths = useMemo(() => {
    const keys = new Set(byMonth.keys());
    keys.add(currentKey);
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [byMonth, currentKey]);

  const [selectedKey, setSelectedKey] = useState(currentKey);

  const [year, month1] = selectedKey.split('-').map(Number);
  const month0 = month1 - 1;
  const workingDays = countWeekdays(year, month0);
  const expectedScripts = workingDays * 3;

  const monthAgg = byMonth.get(selectedKey);
  const completedNames = useMemo(
    () => (monthAgg ? [...monthAgg.names].sort((a, b) => a.localeCompare(b)) : []),
    [monthAgg]
  );
  const completedScripts = completedNames.length;
  const avgLengthSec = monthAgg && monthAgg.durations.length
    ? monthAgg.durations.reduce((sum, d) => sum + d, 0) / monthAgg.durations.length
    : null;

  const progressPct = expectedScripts > 0
    ? Math.min((completedScripts / expectedScripts) * 100, 100)
    : 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        width: 360,
        maxWidth: '100%',
        p: 1.75,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
      }}
    >
      {/* Top row: month selector (heading) + faint average video length */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <FormControl size="small">
          <Select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '& .MuiSelect-select': {
                py: 0,
                pl: 0,
                pr: '20px !important',
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              },
              '& .MuiSvgIcon-root': { color: 'text.secondary', right: -2 },
            }}
          >
            {availableMonths.map((k) => (
              <MenuItem key={k} value={k} sx={{ fontSize: '0.8125rem' }}>
                {labelFromKey(k)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {avgLengthSec != null && (
          <Tooltip arrow placement="right" title="Average length of the videos in this month's completed scripts">
            <Typography
              sx={{
                fontSize: '0.6rem',
                color: 'text.disabled',
                opacity: 0.55,
                letterSpacing: '0.02em',
                cursor: 'default',
              }}
            >
              avg {formatDuration(avgLengthSec)}
            </Typography>
          </Tooltip>
        )}
      </Box>

      <Tooltip
        arrow
        placement="right"
        title={<WeekdayCalendar year={year} month0={month0} workingDays={workingDays} />}
      >
        <StatRow label="Working days" value={workingDays} />
      </Tooltip>

      <Tooltip arrow placement="right" title={`${workingDays} working days × 3`}>
        <StatRow label="Expected scripts" value={expectedScripts} />
      </Tooltip>

      <Tooltip
        arrow
        placement="right-start"
        leaveDelay={300}
        title={<CompletedList names={completedNames} />}
        slotProps={{ tooltip: { sx: { maxWidth: 'none', p: 0 } } }}
      >
        <StatRow label="Completed scripts" value={completedScripts} />
      </Tooltip>

      <Box sx={{ mt: 0.25 }}>
        <LinearProgress
          variant="determinate"
          value={progressPct}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              bgcolor: progressPct >= 100 ? 'success.main' : 'primary.main',
            },
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}>
          {completedScripts} / {expectedScripts} scripts ({Math.round(progressPct)}%)
        </Typography>
      </Box>
    </Paper>
  );
}
