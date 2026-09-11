/**
 * EditableSection - one box on the Profile Hub page, working like a section
 * on the Products Setup tab: fields sit greyed-out until Edit is pressed,
 * then Cancel / Save. Each section owns its own draft and saves on its own.
 *
 * Once every non-optional field is filled the box is "complete": it collapses
 * to a compact read-out with a green tick, and Edit expands it again.
 */

import { useEffect, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { alpha } from '@mui/material/styles';

import { sectionLabelSx } from '../../components/products/composition/styles';
import { ProfileField } from './ProfileField';
import { CompactValue, CompactGrid, isFilled } from './CompactValue';
import type { ProfileFieldDef } from '../../features/profile-hub/types';

export interface SectionEditContext {
  editing: boolean;
  saving: boolean;
  /** Complete and not editing: render the compact read-out. */
  compact: boolean;
  draft: Record<string, unknown>;
  setField: (field: string, value: unknown) => void;
}

interface EditableSectionProps {
  title: string;
  subtitle?: string;
  /** Left accent bar colour. */
  accent?: string;
  /** Rendered at the right of the header, before the Edit button. */
  headerExtra?: ReactNode;
  /** Fields rendered in the standard grid. May be empty when `children` draws the body. */
  fields?: ProfileFieldDef[];
  /** Grid columns on large screens. */
  columns?: 2 | 4;
  /** Saved values for the whole profile (the draft is seeded from these). */
  values: Record<string, unknown>;
  /** Called with only the fields that changed. */
  onSave: (changed: Record<string, unknown>) => Promise<void>;
  linkedNames?: Record<string, string>;
  onUpload?: (field: string, file: File) => Promise<void>;
  /**
   * Override the completeness rule (default: every field that is neither
   * optional nor read-only has a value). Custom-body sections set this.
   */
  complete?: boolean;
  /** Custom body, rendered under the field grid. */
  children?: (ctx: SectionEditContext) => ReactNode;
}

export function EditableSection({
  title,
  subtitle,
  accent,
  headerExtra,
  fields = [],
  columns = 2,
  values,
  onSave,
  linkedNames,
  onUpload,
  complete: completeOverride,
  children,
}: EditableSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>(values);

  // Re-seed whenever the saved record changes (new profile, or a save elsewhere).
  useEffect(() => {
    setDraft(values);
    setEditing(false);
  }, [values]);

  const setField = (field: string, value: unknown) =>
    setDraft((d) => ({ ...d, [field]: value }));

  const changed: Record<string, unknown> = {};
  for (const key of Object.keys(draft)) {
    if (JSON.stringify(draft[key] ?? '') !== JSON.stringify(values[key] ?? '')) {
      changed[key] = draft[key];
    }
  }
  const dirty = Object.keys(changed).length > 0;

  const editable = fields.some((f) => !f.readOnly) || Boolean(children);

  const required = fields.filter((f) => !f.optional && !f.readOnly);
  const complete =
    completeOverride ?? (required.length > 0 && required.every((f) => isFilled(values[f.name])));
  const compact = complete && !editing;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(changed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(values);
    setEditing(false);
  };

  // In compact mode only show fields that hold something (optional empties are noise).
  const shown = compact ? fields.filter((f) => isFilled(values[f.name])) : fields;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 1.5 : 2,
        borderLeft: '3px solid',
        borderLeftColor: compact ? 'success.main' : (accent ?? 'divider'),
        bgcolor: editing && accent ? alpha(accent, 0.03) : 'background.paper',
        transition: 'padding 0.15s ease',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: compact ? 1 : 1.5 }}>
        <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
          {complete && <CheckCircleIcon color="success" sx={{ fontSize: 18, mt: '1px' }} />}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ ...sectionLabelSx, mb: subtitle && !compact ? 0.25 : 0 }}>
              {title}
            </Typography>
            {subtitle && !compact && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
          {headerExtra}
          {editable &&
            (editing ? (
              <>
                <Button size="small" variant="outlined" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving || !dirty}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button size="small" variant={compact ? 'text' : 'outlined'} startIcon={<EditIcon />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            ))}
        </Box>
      </Box>

      {/* Body: compact read-out or the editable grid */}
      {shown.length > 0 &&
        (compact ? (
          <CompactGrid columns={columns === 4 ? 4 : 3}>
            {shown.map((def) => (
              <Box key={def.name} sx={{ gridColumn: def.kind === 'textarea' || def.kind === 'attachments' ? '1 / -1' : 'auto', minWidth: 0 }}>
                <CompactValue def={def} value={values[def.name]} linkedNames={linkedNames} />
              </Box>
            ))}
          </CompactGrid>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns:
                columns === 4
                  ? { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }
                  : { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            {fields.map((def) => (
              <Box key={def.name} sx={{ gridColumn: def.wide ? '1 / -1' : 'auto' }}>
                <ProfileField
                  def={def}
                  value={draft[def.name]}
                  disabled={!editing || saving}
                  linkedNames={linkedNames}
                  onChange={(value) => setField(def.name, value)}
                  onUpload={
                    def.kind === 'attachments' && onUpload ? (file) => onUpload(def.name, file) : undefined
                  }
                />
              </Box>
            ))}
          </Box>
        ))}

      {children?.({ editing, saving, compact, draft, setField })}
    </Paper>
  );
}
