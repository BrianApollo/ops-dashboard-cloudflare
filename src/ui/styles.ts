/**
 * Shared Style Constants
 *
 * Cross-cutting style constants for native HTML elements
 * that cannot use MUI's sx prop (<input>, <svg>, etc.).
 */

import type { CSSProperties } from 'react';

/** Hidden input - for file inputs triggered by button clicks. */
export const hiddenInputStyle: CSSProperties = { display: 'none' };

/** Transparent native date input (inside MUI containers). */
export const nativeDateInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  padding: '8px 12px',
  fontSize: '0.75rem',
  fontFamily: 'inherit',
  background: 'transparent',
  color: 'inherit',
};

/** Transparent native time input (inside MUI containers). */
export const nativeTimeInputStyle: CSSProperties = {
  width: '90px',
  border: 'none',
  outline: 'none',
  padding: '8px 12px',
  fontSize: '0.75rem',
  fontFamily: 'inherit',
  background: 'transparent',
  color: 'inherit',
};
