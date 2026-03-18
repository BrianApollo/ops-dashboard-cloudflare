/**
 * DetailPanel - Main container for detail sidebars.
 * Uses the Video Editor Portal visual style.
 * Wraps SlideInPanel with consistent width and structure.
 */

import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { SlideInPanel } from './SlideInPanel';
import { SlideInPanelBody } from './SlideInPanelBody';

interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}

export function DetailPanel({
  open,
  onClose,
  width = 520,
  children,
}: DetailPanelProps) {
  return (
    <SlideInPanel open={open} onClose={onClose} width={width}>
      {children}
    </SlideInPanel>
  );
}

interface DetailPanelBodyProps {
  children: ReactNode;
  /** Add extra bottom padding for sticky action buttons */
  hasActions?: boolean;
}

export function DetailPanelBody({ children, hasActions = false }: DetailPanelBodyProps) {
  return (
    <SlideInPanelBody noPadding>
      <Box sx={{ p: 2.5, pb: hasActions ? 12.5 : 2.5 }}>
        {children}
      </Box>
    </SlideInPanelBody>
  );
}
