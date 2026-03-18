/**
 * Styles for ScriptProductionGrid and related components.
 * Theme-aware styles using MUI sx props.
 */

import type { SxProps, Theme } from '@mui/material/styles';

// =============================================================================
// GRID LAYOUT
// =============================================================================

export const gridEmptyStateSx: SxProps<Theme> = {
  p: 4,
  textAlign: 'center',
  color: 'text.disabled',
  fontSize: 13,
};

export const gridContainerSx: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
  gap: 2,
  p: 2,
};

// =============================================================================
// PAGINATION
// =============================================================================

export const gridPaginationSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: 2,
  py: 1.5,
  borderTop: '1px solid',
  borderColor: 'divider',
};

export const gridPaginationInfoSx: SxProps<Theme> = {
  fontSize: 13,
  color: 'text.secondary',
};

export const gridPaginationButtonsSx: SxProps<Theme> = {
  display: 'flex',
  gap: 1,
};

export const getGridPaginationButtonSx = (disabled: boolean): SxProps<Theme> => ({
  px: 1.5,
  py: 0.75,
  fontSize: 13,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '6px',
  bgcolor: disabled ? 'action.disabledBackground' : 'background.paper',
  color: disabled ? 'text.disabled' : 'text.primary',
  cursor: disabled ? 'not-allowed' : 'pointer',
  '&:hover': disabled ? {} : {
    bgcolor: 'action.hover',
  },
});

export const gridPaginationCounterSx: SxProps<Theme> = {
  px: 1.5,
  py: 0.75,
  fontSize: 13,
  color: 'text.secondary',
};

// =============================================================================
// CARD
// =============================================================================

export const gridCardSx: SxProps<Theme> = {
  bgcolor: 'background.paper',
  borderRadius: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  overflow: 'hidden',
};

export const gridCardHeaderSx: SxProps<Theme> = {
  px: 2,
  pt: 1.75,
  pb: 1.5,
  borderBottom: '1px solid',
  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 1.5,
};

export const gridCardTitleSx: SxProps<Theme> = {
  fontWeight: 700,
  fontSize: 14,
  color: 'text.primary',
  lineHeight: 1.3,
  flex: 1,
  minWidth: 0,
};

// =============================================================================
// PILLS (within cards)
// =============================================================================

export const gridPillContainerSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
  flexShrink: 0,
};

export const gridProductPillSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: 10,
  fontWeight: 500,
  px: 1,
  py: '3px',
  borderRadius: '6px',
};

export const gridProductDotSx: SxProps<Theme> = {
  width: 6,
  height: 6,
  borderRadius: '50%',
};

export const gridEditorPillSx: SxProps<Theme> = {
  fontSize: 10,
  fontWeight: 500,
  px: 1,
  py: '3px',
  borderRadius: '6px',
};

// =============================================================================
// SLOT GRID
// =============================================================================

export const gridSlotAreaSx: SxProps<Theme> = {
  px: 1.5,
  pt: 1.5,
  pb: 1.75,
};

export const gridSlotRowSx: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 1,
};

export const gridSlotRowWithMarginSx: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 1,
  mb: 1,
};

export const gridColHeaderSx: SxProps<Theme> = {
  fontSize: 9,
  fontWeight: 600,
  color: 'text.disabled',
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

// =============================================================================
// SLOT TILE
// =============================================================================

export const getSlotTileSx = (params: {
  isDragOver: boolean;
  canDrop: boolean;
  isUploading: boolean;
  isEmphasized: boolean;
  isFaded: boolean;
}): SxProps<Theme> => ({
  borderRadius: 1,
  border: params.isDragOver && params.canDrop ? '2px dashed' : '1px solid',
  borderColor: params.isDragOver && params.canDrop ? '#f59e0b' : 'divider',
  height: 68,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: params.isUploading ? 'wait' : 'pointer',
  transition: 'all 0.15s ease-in-out',
  position: 'relative',
  opacity: params.isFaded ? 0.5 : 1,
  bgcolor: params.isDragOver && params.canDrop
    ? '#fef3c7'
    : params.isUploading
      ? (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f3f6'
      : params.isEmphasized
        ? (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8f9fb'
        : (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f1f3f6',
  ...(!params.isUploading && !params.isDragOver ? {
    '&:hover': {
      bgcolor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8f9fb',
      transform: 'translateY(-1px)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
    },
    '&:active': {
      bgcolor: (theme: Theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e8eaee',
      transform: 'none',
      boxShadow: 'none',
    },
  } : {}),
});

export const slotRowLabelSx: SxProps<Theme> = {
  position: 'absolute',
  top: 4,
  left: 6,
  fontSize: 8,
  fontWeight: 500,
  color: 'text.disabled',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
};

// =============================================================================
// UPLOAD PROGRESS
// =============================================================================

export const slotProgressContainerSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 0.5,
  mt: 0.5,
  width: '80%',
};

export const slotProgressBarBgSx: SxProps<Theme> = {
  width: '100%',
  height: 4,
  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
  borderRadius: 0.25,
  overflow: 'hidden',
};

export const getSlotProgressBarFillSx = (progress: number): SxProps<Theme> => ({
  width: `${progress}%`,
  height: '100%',
  bgcolor: 'primary.main',
  borderRadius: 0.25,
  transition: 'width 0.2s ease-out',
});

export const slotProgressTextContainerSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
};

export const slotProgressTextSx: SxProps<Theme> = {
  fontSize: 9,
  color: 'text.secondary',
};

// =============================================================================
// ERROR & STATUS
// =============================================================================

export const slotErrorContainerSx: SxProps<Theme> = {
  textAlign: 'center',
  mt: 0.5,
};

export const slotErrorMessageSx: SxProps<Theme> = {
  fontSize: 7,
  color: 'error.main',
  mt: '3px',
  maxWidth: 80,
  lineHeight: 1.2,
};
