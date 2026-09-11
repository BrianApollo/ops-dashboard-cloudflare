/**
 * StageSection - a generic SOP stage box (stages 2-9): the stage's fields in
 * an EditableSection, with the Done tick and "How do I?" in the header.
 */

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { EditableSection } from './EditableSection';
import { FIELD_INDEX } from '../../features/profile-hub/types';
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
  const fields = stage.fields.map((name) => FIELD_INDEX[name]).filter(Boolean);
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
    />
  );
}
