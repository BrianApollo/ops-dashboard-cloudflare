/**
 * DetailPills - Pill row component for detail panel headers.
 * Matches the Video Editor Portal visual style.
 */

import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { basePillSx, NEUTRAL_PILL } from '../../ui';

// Larger pill style for sidebar (matches Video Editor Portal)
const largePillSx: SxProps<Theme> = {
  ...basePillSx as object,
  fontSize: 11,
  fontWeight: 500,
  px: 1.25,
  py: '5px',
  borderRadius: '6px',
};

export interface PillConfig {
  label: string;
  backgroundColor?: string;
  color?: string;
  /** Optional dot color (shows a colored dot before the label) */
  dotColor?: string;
}

interface DetailPillsProps {
  pills: PillConfig[];
}

export function DetailPills({ pills }: DetailPillsProps) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {pills.map((pill, index) => (
        <Box
          key={index}
          component="span"
          sx={{
            ...largePillSx as object,
            bgcolor: pill.backgroundColor || NEUTRAL_PILL.bg,
            color: pill.color || NEUTRAL_PILL.text,
          }}
        >
          {pill.dotColor && (
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: pill.dotColor,
                mr: 1,
                verticalAlign: 'middle',
              }}
            />
          )}
          {pill.label}
        </Box>
      ))}
    </Box>
  );
}

/**
 * Single pill component for custom layouts.
 */
interface DetailPillProps {
  children: ReactNode;
  backgroundColor?: string;
  color?: string;
}

export function DetailPill({ children, backgroundColor, color }: DetailPillProps) {
  return (
    <Box
      component="span"
      sx={{
        ...largePillSx as object,
        bgcolor: backgroundColor || NEUTRAL_PILL.bg,
        color: color || NEUTRAL_PILL.text,
      }}
    >
      {children}
    </Box>
  );
}
