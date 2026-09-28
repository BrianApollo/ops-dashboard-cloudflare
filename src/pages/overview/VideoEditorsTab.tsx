/**
 * VideoEditorsTab — Script-based daily KPI breakdown per video editor.
 *
 * Thin wrapper around ScriptKpiTab, which owns its own data fetching,
 * loading/empty states and its Calendar / Progress Bars sub-view toggle.
 *
 * Props:
 * - editorId: optional — when set, shows only that editor (for editor portal)
 */

import { ScriptKpiTab } from './ScriptKpiTab';

interface VideoEditorsTabProps {
  /** When set, shows only this editor's data (for editor portal view) */
  editorId?: string;
}

export function VideoEditorsTab({ editorId }: VideoEditorsTabProps) {
  return <ScriptKpiTab editorId={editorId} />;
}
