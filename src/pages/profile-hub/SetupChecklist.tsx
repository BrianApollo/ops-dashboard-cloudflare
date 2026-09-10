/**
 * SetupChecklist - the nine SOP stages as rows, each carrying the fields that
 * stage edits. Staff do the step, update the value in the row, tick it.
 * Ticks and edits go into the page's draft; the page owns saving.
 */

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { ProfileField } from './ProfileField';
import { SOP_STAGES, type SopStage } from '../../features/profile-hub/sop';
import { FIELD_INDEX } from '../../features/profile-hub/types';

interface SetupChecklistProps {
  draft: Record<string, unknown>;
  dirtyFields: Set<string>;
  linkedNames: Record<string, string>;
  onChange: (field: string, value: unknown) => void;
  onUpload: (field: string, file: File) => Promise<void>;
  onHelp: (stage: SopStage) => void;
}

export function SetupChecklist({
  draft,
  dirtyFields,
  linkedNames,
  onChange,
  onUpload,
  onHelp,
}: SetupChecklistProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {SOP_STAGES.map((stage) => {
        const done = Boolean(draft[stage.doneField]);
        const dirty = dirtyFields.has(stage.doneField);
        return (
          <Paper
            key={stage.number}
            variant="outlined"
            sx={{
              borderRadius: 2,
              p: 2,
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              borderColor: dirty ? 'warning.main' : done ? 'success.main' : 'divider',
              bgcolor: done ? alpha(theme.palette.success.main, isDark ? 0.08 : 0.04) : 'background.paper',
              transition: 'background-color 0.15s ease',
            }}
          >
            {/* Stage number / tick */}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: done ? '#fff' : 'text.secondary',
                bgcolor: done ? 'success.main' : alpha(theme.palette.text.primary, 0.06),
              }}
            >
              {done ? <CheckIcon fontSize="small" /> : stage.number}
            </Box>

            {/* Title + fields */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    textDecoration: done ? 'line-through' : 'none',
                    color: done ? 'text.secondary' : 'text.primary',
                  }}
                >
                  {stage.title}
                </Typography>
                <Chip size="small" variant="outlined" label={stage.timing} sx={{ height: 20 }} />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {stage.summary}
              </Typography>

              {stage.fields.length > 0 && (
                <Box
                  sx={{
                    mt: 1.5,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: 1.5,
                  }}
                >
                  {stage.fields.map((name) => {
                    const def = FIELD_INDEX[name];
                    if (!def) return null;
                    return (
                      <Box key={name} sx={{ gridColumn: def.wide ? '1 / -1' : 'auto' }}>
                        <ProfileField
                          def={def}
                          value={draft[name]}
                          dirty={dirtyFields.has(name)}
                          linkedNames={linkedNames}
                          onChange={(value) => onChange(name, value)}
                          onUpload={
                            def.kind === 'attachments' ? (file) => onUpload(name, file) : undefined
                          }
                        />
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>

            {/* Done + help */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Done
                </Typography>
                <Checkbox
                  checked={done}
                  color="success"
                  onChange={(e) => onChange(stage.doneField, e.target.checked)}
                />
              </Box>
              <Button
                size="small"
                startIcon={<HelpOutlineIcon />}
                onClick={() => onHelp(stage)}
                sx={{ textTransform: 'none' }}
              >
                How do I?
              </Button>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
