/**
 * Color Helpers
 *
 * Presentation layer helpers that use constants.
 * Re-exports constants for backward compatibility.
 * Also includes pill style helpers (merged from pills.ts).
 */

import type { CSSProperties } from 'react';
import type { SxProps, Theme } from '@mui/material';

// Re-export all constants for backward compatibility
export {
  STATUS_COLORS,
  STATUS_LABELS,
  NEUTRAL_PILL,
  PRODUCT_FALLBACK_PALETTE,
  EDITOR_FALLBACK_PALETTE,
  type StatusKey,
  type StatusColorSet,
  type ProductColorSet,
  type EditorColorSet,
} from '../constants';

// Import for internal use
import {
  STATUS_COLORS,
  PRODUCT_OVERRIDES,
  PRODUCT_COLOR_PALETTE,
  EDITOR_OVERRIDES,
  EDITOR_COLOR_PALETTE,
  NEUTRAL_PILL,
  hashString,
  type StatusKey,
  type StatusColorSet,
  type ProductColorSet,
  type EditorColorSet,
} from '../constants';

// =============================================================================
// COLOR GETTERS
// =============================================================================

/**
 * Get status colors by status key.
 */
export function getStatusColors(status: StatusKey): StatusColorSet {
  return STATUS_COLORS[status];
}

/**
 * Get product colors by product ID.
 * 1. If explicit override exists → use it
 * 2. Else → compute deterministic fallback from hash
 */
export function getProductColors(productId: string): ProductColorSet {
  // Check for explicit override first
  if (productId in PRODUCT_OVERRIDES) {
    return PRODUCT_OVERRIDES[productId];
  }
  // Fallback to deterministic hash-based color
  const index = hashString(productId) % PRODUCT_COLOR_PALETTE.length;
  return PRODUCT_COLOR_PALETTE[index];
}

/**
 * Get product dot color only (for backward compatibility).
 */
export function getProductDotColor(productId: string): string {
  return getProductColors(productId).dot;
}

/**
 * Get editor colors by editor ID.
 * 1. If explicit override exists → use it
 * 2. Else → compute deterministic fallback from hash
 */
export function getEditorColors(editorId: string): EditorColorSet {
  // Check for explicit override first
  if (editorId in EDITOR_OVERRIDES) {
    return EDITOR_OVERRIDES[editorId];
  }
  // Fallback to deterministic hash-based color
  const index = hashString(editorId) % EDITOR_COLOR_PALETTE.length;
  return EDITOR_COLOR_PALETTE[index];
}

// =============================================================================
// PILL STYLE TYPES (merged from pills.ts)
// =============================================================================

export interface PillStyle {
  backgroundColor: string;
  color: string;
  border?: string;
}

// =============================================================================
// BASE PILL STYLES (merged from pills.ts)
// =============================================================================

/**
 * Base CSS properties for all pills (React inline styles).
 */
export const basePillStyle: CSSProperties = {
  display: 'inline-block',
  fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.01em',
  padding: '4px 8px',
  borderRadius: 5,
  lineHeight: 1,
};

/**
 * Base MUI sx props for Chip components.
 */
export const baseChipSx: SxProps<Theme> = {
  fontWeight: 600,
  fontSize: '0.7rem',
  letterSpacing: '0.02em',
  border: 'none',
};

// =============================================================================
// STATUS PILL STYLES (merged from pills.ts)
// =============================================================================

/**
 * Get inline style for a status pill (React CSSProperties).
 */
export function getStatusPillStyle(status: StatusKey): PillStyle {
  const colors = getStatusColors(status);
  return {
    backgroundColor: colors.bg,
    color: colors.text,
  };
}

/**
 * Get MUI sx props for a status Chip component.
 */
export function getStatusChipSx(status: StatusKey): SxProps<Theme> {
  const colors = getStatusColors(status);
  return {
    ...baseChipSx,
    bgcolor: colors.bg,
    color: colors.text,
  };
}

// =============================================================================
// PRODUCT PILL STYLES (merged from pills.ts)
// =============================================================================

/**
 * Get inline style for a product pill (React CSSProperties).
 * Includes dot color for rendering a colored circle.
 */
export function getProductPillStyle(productId: string): PillStyle & { dotColor: string } {
  const colors = getProductColors(productId);
  return {
    backgroundColor: NEUTRAL_PILL.bg,
    color: NEUTRAL_PILL.text,
    dotColor: colors.dot,
  };
}

/**
 * Get MUI sx props for a product Chip component.
 */
export function getProductChipSx(_productId: string): SxProps<Theme> {
  return {
    ...baseChipSx,
    fontWeight: 500,
    bgcolor: NEUTRAL_PILL.bg,
    color: NEUTRAL_PILL.text,
  };
}

// =============================================================================
// EDITOR PILL STYLES (merged from pills.ts)
// =============================================================================

/**
 * Get inline style for an editor pill (React CSSProperties).
 */
export function getEditorPillStyle(editorId: string): PillStyle {
  const colors = getEditorColors(editorId);
  return {
    backgroundColor: colors.pillBg,
    color: colors.text,
  };
}

/**
 * Get MUI sx props for an editor Chip component.
 */
export function getEditorChipSx(editorId: string): SxProps<Theme> {
  const colors = getEditorColors(editorId);
  return {
    ...baseChipSx,
    fontWeight: 500,
    bgcolor: colors.pillBg,
    color: colors.text,
  };
}
