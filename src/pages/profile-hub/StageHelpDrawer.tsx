/**
 * StageHelpDrawer - the "How do I?" panel for one SOP stage.
 * Shows the SOP's own step list, plus any video / screenshots for the stage.
 */

import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';

import type { SopStage } from '../../features/profile-hub/sop';

interface StageHelpDrawerProps {
  stage: SopStage | null;
  onClose: () => void;
}

export function StageHelpDrawer({ stage, onClose }: StageHelpDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={Boolean(stage)}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}
    >
      {stage && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Chip size="small" label={`Stage ${stage.number}`} color="primary" sx={{ mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                {stage.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {stage.timing} · {stage.summary}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Divider />

          {stage.video && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Watch
              </Typography>
              <Box
                component="video"
                src={stage.video}
                controls
                sx={{ width: '100%', borderRadius: 1.5, bgcolor: 'black' }}
              />
            </Box>
          )}

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Steps
            </Typography>
            <Box component="ol" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {stage.steps.map((step) => (
                <Typography key={step} component="li" variant="body2">
                  {step}
                </Typography>
              ))}
            </Box>
          </Box>

          {stage.screenshots && stage.screenshots.length > 0 ? (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Screenshots
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {stage.screenshots.map((src) => (
                  <Box
                    key={src}
                    component="img"
                    src={src}
                    alt=""
                    sx={{ width: '100%', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}
                  />
                ))}
              </Box>
            </Box>
          ) : (
            <Typography variant="caption" color="text.disabled">
              Screenshots and video for this stage haven't been added yet.
            </Typography>
          )}
        </Box>
      )}
    </Drawer>
  );
}
