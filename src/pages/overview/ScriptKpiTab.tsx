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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useTheme, alpha } from '@mui/material/styles';
import { listVideos } from '../../features/videos/data';
import { provider } from '../../data/provider';

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

function getFridayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = (day === 0 ? -2 : 5) - day;
  const friday = new Date(d);
  friday.setDate(d.getDate() + diff);
  return `${friday.getFullYear()}-${String(friday.getMonth() + 1).padStart(2, '0')}-${String(friday.getDate()).padStart(2, '0')}`;
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
        const friday = getFridayOfWeek(monday);
        const scriptsCompleted = weekDays.reduce((sum, d) => sum + d.scriptsCompleted, 0);
        const target = weekDays.reduce((sum, d) => sum + d.target, 0);
        const deficit = weekDays.reduce((sum, d) => sum + d.deficit, 0);

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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {scripts.map((s) => (
        <Box
          key={s.scriptId}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 1.5,
            py: 0.75,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            fontSize: '0.8125rem',
          }}
        >
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, flex: 1 }}>
            {s.scriptName}
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            avg {s.avgDurationMin} min
          </Typography>
          <Chip
            label={s.avgDurationMin > LONG_SCRIPT_THRESHOLD_MIN ? '>3 min' : '≤3 min'}
            size="small"
            color={s.avgDurationMin > LONG_SCRIPT_THRESHOLD_MIN ? 'warning' : 'default'}
            sx={{ height: 20, fontSize: '0.6875rem' }}
          />
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            {s.videoCount} videos
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// =============================================================================
// CALENDAR VIEW
// =============================================================================

function DayCell({ day, onClick }: { day: DayScriptKpi | null; onClick?: (e: React.MouseEvent<HTMLElement>) => void }) {
  const theme = useTheme();

  if (!day) {
    return (
      <Box sx={{ width: 80, height: 60, borderRadius: 1, bgcolor: alpha(theme.palette.action.disabled, 0.05) }} />
    );
  }

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
        '&:hover': day.scripts.length > 0 ? {
          boxShadow: `0 0 0 2px ${day.passed ? theme.palette.success.main : theme.palette.error.main}`,
        } : {},
      }}
    >
      <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
        {day.date.slice(8)}
      </Typography>
      <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
        {day.scriptsCompleted}/{day.target}
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
    const slots: (DayScriptKpi | null)[] = [null, null, null, null, null];
    for (const day of week.days) {
      const dow = day.dayOfWeek;
      if (dow >= 1 && dow <= 5) {
        slots[dow - 1] = day;
      }
    }
    const weekendDays = week.days.filter(d => d.dayOfWeek === 0 || d.dayOfWeek === 6);
    return { week, slots, weekendDays };
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
          {month.scriptsCompleted}/{month.target} scripts
        </Typography>
        <Box sx={{ ml: 'auto' }}>
          <DeficitChip deficit={month.deficit} />
        </Box>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
              <Box key={d} sx={{ width: 80, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>{d}</Typography>
              </Box>
            ))}
            <Box sx={{ width: 80, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>Week</Typography>
            </Box>
          </Box>
          {weekRows.map(({ week, slots, weekendDays }) => (
            <Box key={week.weekNumber} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              {slots.map((day, i) => (
                <DayCell
                  key={i}
                  day={day}
                  onClick={day ? (e) => handleDayClick(e, day) : undefined}
                />
              ))}
              <Box sx={{ width: 80, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  {week.scriptsCompleted}/{week.target}
                </Typography>
                <DeficitChip deficit={week.deficit} size="small" />
              </Box>
              {weekendDays.map(day => (
                <DayCell key={day.date} day={day} onClick={(e) => handleDayClick(e, day)} />
              ))}
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
        {popoverDay && (
          <Box sx={{ p: 2, minWidth: 280 }}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>
              {popoverDay.dayLabel} — {popoverDay.scriptsCompleted}/{popoverDay.target}
              {popoverDay.passed ? ' ✓' : ' ✗'}
            </Typography>
            <ScriptList scripts={popoverDay.scripts} />
          </Box>
        )}
      </Popover>
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
          <StatBox label="This Month" value={`${currentScripts}/${currentTarget}`} sub="scripts" />
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {kpiStats.map(editor => (
        <EditorCardWrapper key={editor.editorId} editor={editor}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2, pt: 0 }}>
            {editor.months.map(month => (
              <MonthCalendar key={month.key} month={month} />
            ))}
          </Box>
        </EditorCardWrapper>
      ))}
    </Box>
  );
}
