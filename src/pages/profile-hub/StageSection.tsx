/**
 * StageSection - a generic SOP stage box (stages 2-9): the stage's fields in
 * an EditableSection, with the Done tick and "How do I?" in the header.
 *
 * Stages that rotate a credential (`stage.compare`) also show the value the
 * profile was delivered with (Box 1) and whether the live value has changed.
 */

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import { EditableSection } from './EditableSection';
import { CompactValue } from './CompactValue';
import { formLabelSx } from '../../components/products/composition/styles';
import { FIELD_INDEX, type ProfileFieldDef } from '../../features/profile-hub/types';
import { FIELD_ORIGINAL_DATA, ORIGINAL_DATA_KEYS, parseOriginalData } from '../../features/profile-hub/original';
import type { SopStage } from '../../features/profile-hub/sop';

interface StageHeaderProps {
  stage: SopStage;
  done: boolean;
  onToggleDone: (done: boolean) => void;
  onHelp: (stage: SopStage) => void;
}

/** Done tick + help button. Shared by the generic stage box and the AdsPower box. */
export function StageHeaderExtra({ stage, done, onToggleDone, onHelp }: StageHeaderProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Button size="small" startIcon={<HelpOutlineIcon />} onClick={() => onHelp(stage)} sx={{ textTransform: 'none' }}>
        How do I?
      </Button>
      <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Done
        </Typography>
        <Checkbox size="small" checked={done} color="success" onChange={(e) => onToggleDone(e.target.checked)} />
      </Box>
    </Box>
  );
}

interface StageSectionProps extends StageHeaderProps {
  /** Box number shown in the title (stage 1 is split into boxes 1 and 2). */
  boxNumber: number;
  values: Record<string, unknown>;
  onSave: (changed: Record<string, unknown>) => Promise<void>;
  linkedNames: Record<string, string>;
  onUpload: (field: string, file: File) => Promise<void>;
}

export function StageSection({ stage, boxNumber, done, onToggleDone, onHelp, values, onSave, linkedNames, onUpload }: StageSectionProps) {
  // Apply any per-stage label overrides (e.g. "Backup Email" in the mailbox stage).
  const fields: ProfileFieldDef[] = stage.fields
    .map((name) => FIELD_INDEX[name])
    .filter(Boolean)
    .map((def) => (stage.labels?.[def.name] ? { ...def, label: stage.labels[def.name] } : def));

  const original = parseOriginalData(values[FIELD_ORIGINAL_DATA]);

  return (
    <EditableSection
      title={`${boxNumber} · ${stage.title}`}
      subtitle={`${stage.timing} · ${stage.summary}`}
      accent={done ? '#16a34a' : '#94a3b8'}
      values={values}
      onSave={onSave}
      fields={fields}
      // A stage is complete when it's ticked done — the tick is the staff's word.
      complete={done}
      linkedNames={linkedNames}
      onUpload={onUpload}
      headerExtra={<StageHeaderExtra stage={stage} done={done} onToggleDone={onToggleDone} onHelp={onHelp} />}
    >
      {({ draft, compact }) =>
        stage.compare && stage.compare.length > 0 ? (
          <Box sx={{ mt: compact ? 1.25 : 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {stage.compare.map(({ field, originalKey }) => {
              const delivered = (original[originalKey] ?? '').trim();
              const live = String(draft[field] ?? '').trim();
              const meta = ORIGINAL_DATA_KEYS.find((k) => k.key === originalKey);
              const def = FIELD_INDEX[field];
              // No delivered value recorded: nothing to compare against.
              if (!delivered) {
                return (
                  <Typography key={field} variant="caption" color="text.disabled">
                    No delivered {meta?.label.toLowerCase() ?? originalKey} recorded in Box 1 to compare against.
                  </Typography>
                );
              }
              const changed = Boolean(live) && live !== delivered;
              return (
                <Box key={field}>
                  {!compact && (
                    <Typography variant="caption" color="text.secondary" sx={formLabelSx}>
                      Delivered {meta?.label.toLowerCase() ?? originalKey}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <CompactValue
                      def={{ name: originalKey, label: compact ? `Delivered ${meta?.label.toLowerCase() ?? ''}` : '', kind: def?.kind === 'secret' ? 'secret' : 'text' }}
                      value={delivered}
                    />
                    {changed ? (
                      <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Changed from delivered" sx={{ height: 22 }} />
                    ) : (
                      <Chip size="small" color="warning" icon={<CancelIcon />} label={live ? 'Still the delivered value' : 'Live value empty'} sx={{ height: 22 }} />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : null
      }
    </EditableSection>
  );
}
