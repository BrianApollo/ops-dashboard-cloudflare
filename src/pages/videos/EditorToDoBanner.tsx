/**
 * EditorToDoBanner — "work remaining" strip for the Video Editor Portal.
 *
 * Shows how many scripts the editor still has in their To Do list (any script
 * with ≥1 To Do video), with a rough "days worth" (≈ 3 scripts/day, matching the
 * Expected = working days × 3 target) and the remaining video count.
 *
 * Subtle single line by default; becomes a bold red callout once fewer than
 * LOW_THRESHOLD scripts remain. Clicking it applies the To Do filter.
 *
 * Reuses the cached listVideos() query — no extra fetch.
 */

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTheme, alpha } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { listVideos } from '../../features/videos/data';

const LOW_THRESHOLD = 10; // fewer than this many scripts left → bold red callout
const SCRIPTS_PER_DAY = 3; // matches Expected = working days × 3

interface EditorToDoBannerProps {
  /** Editor whose To Do backlog is shown (selected/logged-in editor). */
  editorId: string;
  /** Optional click handler — wired to apply the To Do filter. */
  onClick?: () => void;
}

export function EditorToDoBanner({ editorId, onClick }: EditorToDoBannerProps) {
  const theme = useTheme();

  const { data: videos, isPending } = useQuery({
    queryKey: ['videos'],
    queryFn: ({ signal }) => listVideos(signal),
    staleTime: 30_000,
  });

  // Wait for the video data before rendering anything — otherwise an empty list
  // would briefly read as "nothing left to do" and confuse the editor.
  if (isPending || !videos) return null;

  // Current backlog for this editor (not month-scoped): videos still To Do, and
  // the distinct scripts they belong to.
  const todo = videos.filter((v) => v.editor.id === editorId && v.status === 'todo');
  const videosLeft = todo.length;
  const scriptsLeft = new Set(todo.map((v) => v.script.id)).size;
  const daysLeft = Math.ceil(scriptsLeft / SCRIPTS_PER_DAY);

  const clickSx = onClick ? { cursor: 'pointer', '&:hover': { opacity: 0.9 } } : {};
  const sub = `≈ ${daysLeft} working day${daysLeft !== 1 ? 's' : ''} · ${videosLeft} video${videosLeft !== 1 ? 's' : ''}`;

  // Running low (includes 0) → bold red callout.
  if (scriptsLeft < LOW_THRESHOLD) {
    return (
      <Box
        onClick={onClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.25,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.error.main, 0.1),
          border: `1px solid ${alpha(theme.palette.error.main, 0.45)}`,
          color: 'error.dark',
          ...clickSx,
        }}
      >
        <WarningAmberIcon sx={{ color: 'error.main' }} />
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.25 }}>
            Only {scriptsLeft} script{scriptsLeft !== 1 ? 's' : ''} left in your To Do list
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', opacity: 0.85 }}>{sub}</Typography>
        </Box>
      </Box>
    );
  }

  // Default — subtle inline strip.
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', ...clickSx }} onClick={onClick}>
      <FormatListBulletedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
      <Typography sx={{ fontSize: '0.875rem' }}>
        You have{' '}
        <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {scriptsLeft}
        </Box>{' '}
        scripts left to do
      </Typography>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.disabled' }}>· {sub}</Typography>
    </Box>
  );
}
