/**
 * ScriptKpiTab — Script-based daily KPI tracker for video editors.
 *
 * KPI rules:
 * - Each editor should complete 3 scripts/day if all scripts are ≤3 min avg duration
 * - If any script that day has avg duration >3 min, daily target drops to 2 scripts
 * - 1 script = all videos for that script by that editor uploaded
 * - Script completion date = latest lastUploadAt across its videos
 *
 * Calendar view: Mon–Fri grid with pass/fail per day
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LinearProgress from '@mui/material/LinearProgress';
import { useTheme, alpha } from '@mui/material/styles';
import { listVideos } from '../../features/videos/data';
import { provider } from '../../data/provider';
import { ToggleTabs } from '../../ui/ToggleTabs';

type SubView = 'calendar' | 'progress';

// =============================================================================
// CONSTANTS
// =============================================================================

const LONG_SCRIPT_THRESHOLD_MIN = 3;
const TARGET_NORMAL = 3;
const TARGET_LONG = 2;
const EXCLUDED_EDITORS = new Set(['AI']);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COMPLETED_STATUSES = new Set(['review', 'available', 'used']);

// =============================================================================
// TYPES
// =============================================================================

interface CompletedScript {
  scriptId: string;
  scriptName: string;
  avgDurationMin: number;
  videoCount: number;
}

interface DayScriptKpi {
  date: string;
  dayOfWeek: number;
  dayLabel: string;
  scripts: CompletedScript[];
  scriptsCompleted: number;
  target: number;
  passed: boolean;
  deficit: number;
}

interface WeekScriptKpi {
  weekNumber: number;
  dateRange: string;
  scriptsCompleted: number;
  target: number;
  deficit: number;
  days: DayScriptKpi[];
}

interface MonthScriptKpi {
  key: string;
  label: string;
  scriptsCompleted: number;
  target: number;
  deficit: number;
  cumulativeDeficit: number;
  weeks: WeekScriptKpi[];
}

interface EditorScriptKpi {
  editorId: string;
  editorName: string;
  currentMonth: MonthScriptKpi | null;
  cumulativeDeficit: number;
  totalScripts: number;
  months: MonthScriptKpi[];
}

// =============================================================================
// HELPERS
// =============================================================================

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthLabel(key: string): string {
  const [yearStr, monthStr] = key.split('-');
  return `${MONTH_NAMES[parseInt(monthStr, 10) - 1]} ${yearStr}`;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DAY_NAMES[d.getDay()]} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

function getSundayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const sunday = new Date(d);
  sunday.setDate(d.getDate() + diff);
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
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

interface VideoInput {
  editor: { id: string; name: string };
  script: { id: string; name: string };
  status: string;
  lastUploadAt?: string;
  videoData?: string;
}

function computeScriptKpiStats(
  videos: VideoInput[],
  editorId?: string
): EditorScriptKpi[] {
  const currentMonthKey = getCurrentMonthKey();

  // Step 1: Group videos by editor → script
  const editorScriptMap = new Map<string, {
    editorName: string;
    scripts: Map<string, {
      scriptName: string;
      videos: Array<{ lastUploadAt?: string; durationSeconds?: number }>;
    }>;
  }>();

  for (const video of videos) {
    if (editorId && video.editor.id !== editorId) continue;
    if (!COMPLETED_STATUSES.has(video.status)) continue;
    if (EXCLUDED_EDITORS.has(video.editor.name)) continue;
    if (!video.script?.id || video.script.id === 'unknown') continue;

    const eid = video.editor.id;
    if (!editorScriptMap.has(eid)) {
      editorScriptMap.set(eid, { editorName: video.editor.name, scripts: new Map() });
    }

    const editorData = editorScriptMap.get(eid)!;
    if (!editorData.scripts.has(video.script.id)) {
      editorData.scripts.set(video.script.id, { scriptName: video.script.name, videos: [] });
    }

    const parsed = parseVideoData(video.videoData);
    const resolvedUploadDate = video.lastUploadAt ?? parsed?.lastUploadedAt ?? parsed?.firstUploadedAt;
    editorData.scripts.get(video.script.id)!.videos.push({
      lastUploadAt: resolvedUploadDate,
      durationSeconds: parsed?.durationSeconds,
    });
  }

  // Step 2: For each editor, find completed scripts and compute stats
  const result: EditorScriptKpi[] = [];

  for (const [eid, editorData] of editorScriptMap) {
    const completedScripts: Array<CompletedScript & { completionDate: string }> = [];

    for (const [scriptId, scriptData] of editorData.scripts) {
      const allUploaded = scriptData.videos.every(v => v.lastUploadAt);
      if (!allUploaded) continue;

      const completionDate = scriptData.videos.reduce((latest, v) => {
        if (!latest || (v.lastUploadAt && v.lastUploadAt > latest)) return v.lastUploadAt!;
        return latest;
      }, '');

      const durations = scriptData.videos
        .filter(v => v.durationSeconds && v.durationSeconds > 0)
        .map(v => v.durationSeconds! / 60);
      const avgDurationMin = durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

      completedScripts.push({
        scriptId,
        scriptName: scriptData.scriptName,
        avgDurationMin: Math.round(avgDurationMin * 10) / 10,
        videoCount: scriptData.videos.length,
        completionDate: getDateKey(completionDate),
      });
    }

    // Step 3: Group by day
    const dayMap = new Map<string, CompletedScript[]>();
    for (const script of completedScripts) {
      if (!dayMap.has(script.completionDate)) {
        dayMap.set(script.completionDate, []);
      }
      dayMap.get(script.completionDate)!.push({
        scriptId: script.scriptId,
        scriptName: script.scriptName,
        avgDurationMin: script.avgDurationMin,
        videoCount: script.videoCount,
      });
    }

    // Step 4: Build day stats
    const dayStats: DayScriptKpi[] = [];
    for (const [date, scripts] of dayMap) {
      const d = new Date(date + 'T12:00:00');
      const dayOfWeek = d.getDay();
      const hasLongScript = scripts.some(s => s.avgDurationMin > LONG_SCRIPT_THRESHOLD_MIN);
      const target = hasLongScript ? TARGET_LONG : TARGET_NORMAL;
      const scriptsCompleted = scripts.length;

      dayStats.push({
        date,
        dayOfWeek,
        dayLabel: formatDayLabel(date),
        scripts,
        scriptsCompleted,
        target,
        passed: scriptsCompleted >= target,
        deficit: target - scriptsCompleted,
      });
    }

    // Step 5: Add missing weekdays (Mon-Fri with no work = deficit of 3)
    if (dayStats.length > 0) {
      const allDates = dayStats.map(d => d.date).sort();
      const startDate = new Date(allDates[0] + 'T12:00:00');
      const endDate = new Date(allDates[allDates.length - 1] + 'T12:00:00');
      const existingDates = new Set(dayStats.map(d => d.date));

      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        const dayOfWeek = cursor.getDay();

        if (dayOfWeek >= 1 && dayOfWeek <= 5 && !existingDates.has(dateKey)) {
          dayStats.push({
            date: dateKey,
            dayOfWeek,
            dayLabel: formatDayLabel(dateKey),
            scripts: [],
            scriptsCompleted: 0,
            target: TARGET_NORMAL,
            passed: false,
            deficit: TARGET_NORMAL,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    dayStats.sort((a, b) => a.date.localeCompare(b.date));

    // Step 6: Group into months → weeks
    const monthMap = new Map<string, DayScriptKpi[]>();
    for (const day of dayStats) {
      const mk = day.date.slice(0, 7);
      if (!monthMap.has(mk)) monthMap.set(mk, []);
      monthMap.get(mk)!.push(day);
    }

    const monthEntries = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    let cumulativeDeficit = 0;
    const months: MonthScriptKpi[] = monthEntries.map(([monthKey, days]) => {
      const weekMap = new Map<string, DayScriptKpi[]>();
      for (const day of days) {
        const monday = getMondayOfWeek(day.date);
        if (!weekMap.has(monday)) weekMap.set(monday, []);
        weekMap.get(monday)!.push(day);
      }

      const weekEntries = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      let weekNum = 1;

      const weeks: WeekScriptKpi[] = weekEntries.map(([monday, weekDays]) => {
        const friday = getSundayOfWeek(monday);
        const weekdayDays = weekDays.filter(d => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);
        const weekendWorked = weekDays.filter(d => (d.dayOfWeek === 0 || d.dayOfWeek === 6) && d.scriptsCompleted > 0);
        const scriptsCompleted = weekDays.reduce((sum, d) => sum + d.scriptsCompleted, 0);
        // Weekly target = 3 × actual weekdays, minus 1 for each with >3min scripts
        // Plus target for each weekend day worked (treated as makeup day)
        const numWeekdays = weekdayDays.length;
        const longWeekdays = weekdayDays.filter(d => d.scripts.some(s => s.avgDurationMin > LONG_SCRIPT_THRESHOLD_MIN)).length;
        const weekendTarget = weekendWorked.reduce((sum, d) => sum + d.target, 0);
        const target = (TARGET_NORMAL * numWeekdays) - longWeekdays + weekendTarget;
        const deficit = target - scriptsCompleted;

        return {
          weekNumber: weekNum++,
          dateRange: `${formatShortDate(monday)} – ${formatShortDate(friday)}`,
          scriptsCompleted,
          target,
          deficit,
          days: weekDays,
        };
      });

      const scriptsCompleted = weeks.reduce((sum, w) => sum + w.scriptsCompleted, 0);
      const target = weeks.reduce((sum, w) => sum + w.target, 0);
      const deficit = weeks.reduce((sum, w) => sum + w.deficit, 0);
      cumulativeDeficit += deficit;

      return {
        key: monthKey,
        label: getMonthLabel(monthKey),
        scriptsCompleted,
        target,
        deficit,
        cumulativeDeficit,
        weeks,
      };
    });

    months.reverse();

    const totalScripts = completedScripts.length;
    const currentMonth = months.find(m => m.key === currentMonthKey) ?? null;

    result.push({
      editorId: eid,
      editorName: editorData.editorName,
      currentMonth,
      cumulativeDeficit,
      totalScripts,
      months,
    });
  }

  result.sort((a, b) => a.editorName.localeCompare(b.editorName));
  return result;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function DeficitChip({ deficit, size = 'small' }: { deficit: number; size?: 'small' | 'medium' }) {
  if (deficit <= 0) {
    const label = deficit === 0 ? 'On Target' : `+${Math.abs(deficit)}`;
    return <Chip label={label} size={size} color="success" variant="outlined" sx={{ fontWeight: 600, minWidth: 70 }} />;
  }
  return <Chip label={`-${deficit}`} size={size} color="error" variant="outlined" sx={{ fontWeight: 600, minWidth: 70 }} />;
}

function PassFailIcon({ passed }: { passed: boolean }) {
  return passed
    ? <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18 }} />
    : <CancelIcon sx={{ color: 'error.main', fontSize: 18 }} />;
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

function ScriptList({ scripts }: { scripts: CompletedScript[] }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {scripts.map((s) => (
        <Box
          key={s.scriptId}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 1.5,
            py: 1,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            borderLeft: '3px solid',
            borderLeftColor: s.avgDurationMin > LONG_SCRIPT_THRESHOLD_MIN ? 'warning.main' : 'success.main',
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
              {s.scriptName}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {s.avgDurationMin} min avg  •  {s.videoCount} videos
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function DayPopoverContent({ day }: { day: DayScriptKpi }) {
  const theme = useTheme();
  const weekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
  return (
    <Box sx={{ p: 2.5, minWidth: 300 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>{day.dayLabel}</Typography>
        {!weekend && (
          <Chip
            label={day.passed ? 'Passed' : 'Missed'}
            size="small"
            color={day.passed ? 'success' : 'error'}
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>
      {/* Summary */}
      {!weekend && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, p: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.03), border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700 }}>{day.scriptsCompleted}</Typography>
            <Typography variant="caption" color="text.secondary">completed</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700 }}>{day.target}</Typography>
            <Typography variant="caption" color="text.secondary">target</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: day.deficit > 0 ? 'error.main' : 'success.main' }}>
              {day.deficit > 0 ? `-${day.deficit}` : day.deficit === 0 ? '0' : `+${Math.abs(day.deficit)}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">deficit</Typography>
          </Box>
        </Box>
      )}
      {/* Scripts */}
      {day.scripts.length > 0 ? (
        <ScriptList scripts={day.scripts} />
      ) : (
        <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', textAlign: 'center', py: 2 }}>
          No scripts completed
        </Typography>
      )}
    </Box>
  );
}

// =============================================================================
// CALENDAR VIEW
// =============================================================================

function DayCell({ day, onClick }: { day: DayScriptKpi | null; isWeekend?: boolean; onClick?: (e: React.MouseEvent<HTMLElement>) => void }) {
  const theme = useTheme();

  if (!day) {
    return (
      <Box sx={{ width: 80, height: 60, borderRadius: 1, bgcolor: alpha(theme.palette.action.disabled, 0.05) }} />
    );
  }

  const weekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;

  // Weekend: idle = grey empty, worked = treated as makeup day with pass/fail
  if (weekend) {
    const hasWork = day.scriptsCompleted > 0;
    if (!hasWork) {
      return (
        <Box sx={{ width: 80, height: 60, borderRadius: 1, bgcolor: alpha(theme.palette.action.disabled, 0.05) }} />
      );
    }
    // Worked weekend — same display as weekday (makeup day)
  }

  const hasLongScript = day.scripts.some(s => s.avgDurationMin > LONG_SCRIPT_THRESHOLD_MIN);

  return (
    <Box
      onClick={onClick}
      sx={{
        width: 80,
        height: 60,
        borderRadius: 1,
        border: '1px solid',
        borderColor: day.passed ? 'success.main' : 'error.main',
        bgcolor: day.passed
          ? alpha(theme.palette.success.main, 0.08)
          : day.scriptsCompleted === 0
            ? alpha(theme.palette.error.main, 0.04)
            : alpha(theme.palette.error.main, 0.08),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: day.scripts.length > 0 ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        position: 'relative',
        '&:hover': day.scripts.length > 0 ? {
          boxShadow: `0 0 0 2px ${day.passed ? theme.palette.success.main : theme.palette.error.main}`,
        } : {},
      }}
    >
      <Typography sx={{ fontSize: '0.625rem', color: 'text.secondary', position: 'absolute', top: 3, left: 6 }}>
        {day.date.slice(8)}
      </Typography>
      {hasLongScript && (
        <Typography sx={{ fontSize: '0.5625rem', color: 'warning.main', fontWeight: 700, position: 'absolute', top: 3, right: 4 }}>
          -1
        </Typography>
      )}
      <Typography sx={{ fontWeight: 700, fontSize: '1rem', mt: 0.5 }}>
        {day.scriptsCompleted}
      </Typography>
      <PassFailIcon passed={day.passed} />
    </Box>
  );
}

function MonthCalendar({ month }: { month: MonthScriptKpi }) {
  const [expanded, setExpanded] = useState(month.key === getCurrentMonthKey());
  const isCurrent = month.key === getCurrentMonthKey();
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverDay, setPopoverDay] = useState<DayScriptKpi | null>(null);

  const handleDayClick = (e: React.MouseEvent<HTMLElement>, day: DayScriptKpi) => {
    if (day.scripts.length > 0) {
      setPopoverAnchor(e.currentTarget);
      setPopoverDay(day);
    }
  };

  const weekRows = month.weeks.map(week => {
    // 7 slots: Mon(0) Tue(1) Wed(2) Thu(3) Fri(4) Sat(5) Sun(6)
    const slots: (DayScriptKpi | null)[] = [null, null, null, null, null, null, null];
    for (const day of week.days) {
      const dow = day.dayOfWeek;
      if (dow >= 1 && dow <= 5) {
        slots[dow - 1] = day; // Mon=0, Fri=4
      } else if (dow === 6) {
        slots[5] = day; // Sat
      } else {
        slots[6] = day; // Sun
      }
    }
    return { week, slots };
  });

  return (
    <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2,
          py: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <IconButton size="small" sx={{ p: 0 }}>
          {expanded ? <KeyboardArrowUpIcon sx={{ fontSize: 18 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
        </IconButton>
        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
          {month.label}
          {isCurrent && (
            <Chip label="Current" size="small" color="primary" variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.6875rem' }} />
          )}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {month.scriptsCompleted}/{month.target} Scripts
        </Typography>
        <PassFailIcon passed={month.scriptsCompleted >= month.target} />
        <Box sx={{ ml: 'auto' }}>
          <DeficitChip deficit={month.deficit} />
        </Box>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <Box key={d} sx={{ width: 80, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: (d === 'Sat' || d === 'Sun') ? 'info.main' : 'text.secondary' }}>{d}</Typography>
              </Box>
            ))}
            <Box sx={{ width: 80, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>Week</Typography>
            </Box>
          </Box>
          {weekRows.map(({ week, slots }) => (
            <Box key={week.weekNumber} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              {slots.map((day, i) => (
                <DayCell
                  key={i}
                  day={day}
                  onClick={day ? (e) => handleDayClick(e, day) : undefined}
                />
              ))}
              {(() => {
                const weekdayDays = week.days.filter(d => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);
                const weekendWorkedDays = week.days.filter(d => (d.dayOfWeek === 0 || d.dayOfWeek === 6) && d.scriptsCompleted > 0);
                const longWeekdays = weekdayDays.filter(d => d.scripts.some(s => s.avgDurationMin > LONG_SCRIPT_THRESHOLD_MIN)).length;
                const numWeekdays = weekdayDays.length;
                const baseTarget = TARGET_NORMAL * numWeekdays;
                const weekendTarget = weekendWorkedDays.reduce((sum, d) => sum + d.target, 0);
                const weekPassed = week.scriptsCompleted >= week.target;

                const targetTooltip = (
                  <Box sx={{ p: 0.5 }}>
                    <Box sx={{ fontSize: '0.8125rem', fontWeight: 700, mb: 1 }}>Weekly Target Breakdown</Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, mb: 0.5 }}>
                      <span>Base target ({numWeekdays} day{numWeekdays !== 1 ? 's' : ''})</span>
                      <strong>{baseTarget}</strong>
                    </Box>
                    {longWeekdays > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, mb: 0.5, color: '#ffb74d' }}>
                        <span>Long scripts ({longWeekdays} day{longWeekdays > 1 ? 's' : ''})</span>
                        <strong>−{longWeekdays}</strong>
                      </Box>
                    )}
                    {weekendWorkedDays.length > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, mb: 0.5, color: '#64b5f6' }}>
                        <span>Makeup days ({weekendWorkedDays.length})</span>
                        <strong>+{weekendTarget}</strong>
                      </Box>
                    )}
                    <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.2)', pt: 0.5, mt: 0.5, display: 'flex', justifyContent: 'space-between', gap: 3 }}>
                      <strong>Total target</strong>
                      <strong>{week.target}</strong>
                    </Box>
                  </Box>
                );

                const deficitTooltip = (
                  <Box sx={{ p: 0.5 }}>
                    {week.deficit > 0 ? (
                      <>
                        <Box sx={{ fontSize: '0.8125rem', fontWeight: 700, mb: 0.5 }}>Behind Target</Box>
                        <Box>Completed <strong>{week.scriptsCompleted}</strong> of <strong>{week.target}</strong> Scripts</Box>
                        <Box sx={{ mt: 0.5, color: '#ef9a9a', fontWeight: 600 }}>Short by {week.deficit} Script{week.deficit !== 1 ? 's' : ''}</Box>
                      </>
                    ) : week.deficit === 0 ? (
                      <Box sx={{ fontWeight: 600 }}>Exactly on target this week</Box>
                    ) : (
                      <>
                        <Box sx={{ fontSize: '0.8125rem', fontWeight: 700, mb: 0.5 }}>Ahead of Target</Box>
                        <Box>Completed <strong>{week.scriptsCompleted}</strong> of <strong>{week.target}</strong> Scripts</Box>
                        <Box sx={{ mt: 0.5, color: '#a5d6a7', fontWeight: 600 }}>+{Math.abs(week.deficit)} extra Script{Math.abs(week.deficit) !== 1 ? 's' : ''}</Box>
                      </>
                    )}
                  </Box>
                );

                return (
                  <Box sx={{ minWidth: 140, pl: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Tooltip title={targetTooltip} arrow>
                      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, cursor: 'help' }}>
                        {week.scriptsCompleted}/{week.target} <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 400, color: 'text.secondary' }}>Scripts</Typography>
                      </Typography>
                    </Tooltip>
                    <PassFailIcon passed={weekPassed} />
                    <Tooltip title={deficitTooltip} arrow>
                      <Box sx={{ cursor: 'help' }}><DeficitChip deficit={week.deficit} size="small" /></Box>
                    </Tooltip>
                  </Box>
                );
              })()}
            </Box>
          ))}
        </Box>
      </Collapse>
      <Popover
        open={!!popoverAnchor}
        anchorEl={popoverAnchor}
        onClose={() => { setPopoverAnchor(null); setPopoverDay(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {popoverDay && <DayPopoverContent day={popoverDay} />}
      </Popover>
    </Paper>
  );
}


// =============================================================================
// PROGRESS BARS VIEW — weekly progress bars
// =============================================================================

function ProgressWeekBar({ week }: { week: WeekScriptKpi }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverDay, setPopoverDay] = useState<DayScriptKpi | null>(null);

  const pct = week.target > 0 ? Math.min((week.scriptsCompleted / week.target) * 100, 100) : 0;
  const weekPassed = week.scriptsCompleted >= week.target;

  // Compute tooltip data
  const weekdayDays = week.days.filter(d => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);
  const weekendWorkedDays = week.days.filter(d => (d.dayOfWeek === 0 || d.dayOfWeek === 6) && d.scriptsCompleted > 0);
  const longWeekdays = weekdayDays.filter(d => d.scripts.some(s => s.avgDurationMin > LONG_SCRIPT_THRESHOLD_MIN)).length;
  const numWeekdays = weekdayDays.length;
  const baseTarget = TARGET_NORMAL * numWeekdays;
  const weekendTarget = weekendWorkedDays.reduce((sum, d) => sum + d.target, 0);

  // Target tooltip — styled JSX
  const targetTooltip = (
    <Box sx={{ p: 0.5 }}>
      <Box sx={{ fontSize: '0.8125rem', fontWeight: 700, mb: 1 }}>Weekly Target Breakdown</Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, mb: 0.5 }}>
        <span>Base target ({numWeekdays} day{numWeekdays !== 1 ? 's' : ''})</span>
        <strong>{baseTarget}</strong>
      </Box>
      {longWeekdays > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, mb: 0.5, color: '#ffb74d' }}>
          <span>Long scripts ({longWeekdays} day{longWeekdays > 1 ? 's' : ''})</span>
          <strong>−{longWeekdays}</strong>
        </Box>
      )}
      {weekendWorkedDays.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, mb: 0.5, color: '#64b5f6' }}>
          <span>Makeup days ({weekendWorkedDays.length})</span>
          <strong>+{weekendTarget}</strong>
        </Box>
      )}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.2)', pt: 0.5, mt: 0.5, display: 'flex', justifyContent: 'space-between', gap: 3 }}>
        <strong>Total target</strong>
        <strong>{week.target}</strong>
      </Box>
    </Box>
  );

  // Bar tooltip — daily breakdown
  const barTooltip = (
    <Box sx={{ p: 0.5 }}>
      <Box sx={{ fontSize: '0.8125rem', fontWeight: 700, mb: 1 }}>Daily Breakdown</Box>
      {weekdayDays.map(d => {
        const hasLong = d.scripts.some(s => s.avgDurationMin > LONG_SCRIPT_THRESHOLD_MIN);
        return (
          <Box key={d.date} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box sx={{ width: 30, fontWeight: 600 }}>{DAY_NAMES[d.dayOfWeek]}</Box>
            <Box sx={{ fontWeight: 700 }}>{d.scriptsCompleted}</Box>
            <Box sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>/ {d.target}</Box>
            {hasLong && <Box sx={{ fontSize: '0.6875rem', color: '#ffb74d' }}>long</Box>}
            <Box sx={{ ml: 'auto' }}>{d.passed ? '✓' : '✗'}</Box>
          </Box>
        );
      })}
    </Box>
  );

  // Deficit tooltip
  const deficitTooltip = (
    <Box sx={{ p: 0.5 }}>
      {week.deficit > 0 ? (
        <>
          <Box sx={{ fontSize: '0.8125rem', fontWeight: 700, mb: 0.5 }}>Behind Target</Box>
          <Box>Completed <strong>{week.scriptsCompleted}</strong> of <strong>{week.target}</strong> Scripts</Box>
          <Box sx={{ mt: 0.5, color: '#ef9a9a', fontWeight: 600 }}>Short by {week.deficit} script{week.deficit !== 1 ? 's' : ''}</Box>
        </>
      ) : week.deficit === 0 ? (
        <Box sx={{ fontWeight: 600 }}>Exactly on target this week</Box>
      ) : (
        <>
          <Box sx={{ fontSize: '0.8125rem', fontWeight: 700, mb: 0.5 }}>Ahead of Target</Box>
          <Box>Completed <strong>{week.scriptsCompleted}</strong> of <strong>{week.target}</strong> Scripts</Box>
          <Box sx={{ mt: 0.5, color: '#a5d6a7', fontWeight: 600 }}>+{Math.abs(week.deficit)} extra script{Math.abs(week.deficit) !== 1 ? 's' : ''}</Box>
        </>
      )}
    </Box>
  );

  return (
    <Box>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1, px: 1 }}
      >
        <IconButton size="small" sx={{ p: 0 }}>
          {expanded ? <KeyboardArrowUpIcon sx={{ fontSize: 16 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
        </IconButton>
        <Box sx={{ minWidth: 140 }}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>Week {week.weekNumber}</Typography>
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled' }}>{week.dateRange}</Typography>
        </Box>
        <Tooltip title={barTooltip} arrow>
          <Box sx={{ flex: 1, maxWidth: 220 }}>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 14, borderRadius: 7,
                bgcolor: alpha(theme.palette.grey[300], 0.3),
                '& .MuiLinearProgress-bar': { borderRadius: 7, bgcolor: pct >= 80 ? 'success.main' : pct >= 50 ? 'warning.main' : 'error.main' },
              }}
            />
          </Box>
        </Tooltip>
        <Tooltip title={targetTooltip} arrow>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, minWidth: 80, cursor: 'help' }}>
            {week.scriptsCompleted}/{week.target} <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 400, color: 'text.secondary' }}>Scripts</Typography>
          </Typography>
        </Tooltip>
        <PassFailIcon passed={weekPassed} />
        <Tooltip title={deficitTooltip} arrow>
          <Box sx={{ cursor: 'help' }}><DeficitChip deficit={week.deficit} size="small" /></Box>
        </Tooltip>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ display: 'flex', gap: 1, px: 4, py: 1, flexWrap: 'wrap' }}>
          {week.days.map(day => {
            const weekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
            const idleWeekend = weekend && day.scriptsCompleted === 0;
            // Weekend worked days are treated as makeup days with pass/fail
            return idleWeekend ? null : (
              <Box
                key={day.date}
                onClick={(e) => { e.stopPropagation(); setPopoverAnchor(e.currentTarget); setPopoverDay(day); }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  bgcolor: day.passed ? alpha(theme.palette.success.main, 0.08) : alpha(theme.palette.error.main, 0.08),
                  border: '1px solid',
                  borderColor: day.passed ? 'success.main' : 'error.main',
                  '&:hover': {
                    boxShadow: `0 0 0 2px ${day.passed ? theme.palette.success.main : theme.palette.error.main}`,
                  },
                }}
              >
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{DAY_NAMES[day.dayOfWeek]}</Typography>
                <Typography sx={{ fontSize: '0.75rem' }}>{day.scriptsCompleted} script{day.scriptsCompleted !== 1 ? 's' : ''}</Typography>
                <PassFailIcon passed={day.passed} />
              </Box>
            );
          })}
        </Box>
      </Collapse>
      <Popover
        open={!!popoverAnchor}
        anchorEl={popoverAnchor}
        onClose={() => { setPopoverAnchor(null); setPopoverDay(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {popoverDay && <DayPopoverContent day={popoverDay} />}
      </Popover>
    </Box>
  );
}

function ProgressBarsMonth({ month }: { month: MonthScriptKpi }) {
  const [expanded, setExpanded] = useState(month.key === getCurrentMonthKey());
  const isCurrent = month.key === getCurrentMonthKey();

  return (
    <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
      >
        <IconButton size="small" sx={{ p: 0 }}>
          {expanded ? <KeyboardArrowUpIcon sx={{ fontSize: 18 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
        </IconButton>
        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
          {month.label}
          {isCurrent && <Chip label="Current" size="small" color="primary" variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.6875rem' }} />}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {month.scriptsCompleted}/{month.target} Scripts
        </Typography>
        <PassFailIcon passed={month.scriptsCompleted >= month.target} />
        <Box sx={{ ml: 'auto' }}><DeficitChip deficit={month.deficit} /></Box>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ px: 1, pb: 2 }}>
          {month.weeks.map(week => (
            <ProgressWeekBar key={week.weekNumber} week={week} month={month} />
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
}

// =============================================================================
// EDITOR CARD WRAPPER
// =============================================================================

function EditorCardWrapper({ editor, children }: { editor: EditorScriptKpi; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  const currentScripts = editor.currentMonth?.scriptsCompleted ?? 0;
  const currentTarget = editor.currentMonth?.target ?? 0;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
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

        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flex: 1 }}>
          <StatBox label="This Month" value={`${currentScripts}/${currentTarget}`} sub="Scripts" />
          <DeficitChip deficit={editor.currentMonth?.deficit ?? 0} />
        </Box>

        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <StatBox label="Total Scripts" value={editor.totalScripts} />
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">Cumulative Deficit</Typography>
            <Box><DeficitChip deficit={editor.cumulativeDeficit} /></Box>
          </Box>
        </Box>
      </Box>

      <Collapse in={expanded}>
        {children}
      </Collapse>
    </Paper>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface ScriptKpiTabProps {
  editorId?: string;
}

export function ScriptKpiTab({ editorId }: ScriptKpiTabProps) {
  const [subView, setSubView] = useState<SubView>('calendar');

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

  const editorIds = useMemo(() => {
    if (!editorsQuery.data) return null;
    return new Set(editorsQuery.data.map(e => e.id));
  }, [editorsQuery.data]);

  const kpiStats = useMemo(() => {
    if (!videosQuery.data || !editorIds) return [];
    const filtered = editorId
      ? videosQuery.data
      : videosQuery.data.filter(v => editorIds.has(v.editor.id));
    return computeScriptKpiStats(filtered, editorId);
  }, [videosQuery.data, editorIds, editorId]);

  if (videosQuery.isLoading || editorsQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (kpiStats.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Typography color="text.secondary">No script data found.</Typography>
      </Box>
    );
  }

  const MonthComponent = subView === 'calendar' ? MonthCalendar : ProgressBarsMonth;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ToggleTabs
          value={subView}
          onChange={setSubView}
          size="small"
          options={[
            { value: 'calendar', label: 'Calendar' },
            { value: 'progress', label: 'Progress Bars' },
          ]}
        />
      </Box>
      {kpiStats.map(editor => (
        <EditorCardWrapper key={editor.editorId} editor={editor}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2, pt: 0 }}>
            {editor.months.map(month => (
              <MonthComponent key={month.key} month={month} />
            ))}
          </Box>
        </EditorCardWrapper>
      ))}
    </Box>
  );
}
