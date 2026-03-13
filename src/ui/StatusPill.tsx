/**
 * StatusPill - Shared status display component.
 * Uses centralized color system from colors.ts.
 */

import Chip from '@mui/material/Chip';
import type { SxProps, Theme } from '@mui/material/styles';
import { getStatusChipSx, baseChipSx } from './colors';
import { STATUS_COLORS, NEUTRAL_PILL, type StatusKey } from './colors';

interface StatusPillProps {
  status: string;
  label?: string;
  active?: boolean;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}

/**
 * StatusPill - Generic status display.
 * Works with any status key defined in colors.ts.
 * Falls back to neutral gray for unknown statuses.
 */
export function StatusPill({ status, label, active = false, onClick, sx: sxOverride }: StatusPillProps) {
  // Normalize to lowercase for lookup (Airtable values may be capitalized)
  const normalizedStatus = status.toLowerCase();
  const isKnownStatus = normalizedStatus in STATUS_COLORS;
  const colors = isKnownStatus ? STATUS_COLORS[normalizedStatus as StatusKey] : null;
  const baseSx = isKnownStatus
    ? getStatusChipSx(normalizedStatus as StatusKey)
    : { ...baseChipSx, bgcolor: NEUTRAL_PILL.bg, color: NEUTRAL_PILL.text };

  const activeSx: SxProps<Theme> = active && colors
    ? {
        boxShadow: `0 0 0 2px ${colors.text}`,
        fontWeight: 700,
      }
    : {};

  return (
    <Chip
      label={label ?? status}
      size="small"
      onClick={onClick}
      sx={[
        baseSx,
        { textTransform: 'capitalize' as const },
        activeSx,
        ...(Array.isArray(sxOverride) ? sxOverride : sxOverride ? [sxOverride] : []),
      ]}
    />
  );
}
