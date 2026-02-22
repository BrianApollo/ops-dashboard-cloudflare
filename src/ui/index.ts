/**
 * UI Module
 *
 * Centralized styling system for the application.
 */

// Colors (includes pill style helpers)
export {
  STATUS_COLORS,
  STATUS_LABELS,
  NEUTRAL_PILL,
  getStatusColors,
  getProductColors,
  getProductDotColor,
  getEditorColors,
  type StatusKey,
  type StatusColorSet,
  type ProductColorSet,
  type EditorColorSet,
  basePillStyle,
  baseChipSx,
  getStatusPillStyle,
  getStatusChipSx,
  getProductPillStyle,
  getProductChipSx,
  getEditorPillStyle,
  getEditorChipSx,
  type PillStyle,
} from './colors';

// Components
export { StatusPill } from './StatusPill';
export { ToggleTabs, type ToggleTabsProps, type ToggleTabOption } from './ToggleTabs';
