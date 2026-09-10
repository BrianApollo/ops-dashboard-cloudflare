/**
 * VerifyDialog - the SOP's Final Verification Checklist.
 * Confirming all nine checks marks the profile Setup Complete.
 */

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import { FINAL_VERIFICATION } from '../../features/profile-hub/sop';

interface VerifyDialogProps {
  open: boolean;
  profileName: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function VerifyDialog({ open, profileName, busy, onClose, onConfirm }: VerifyDialogProps) {
  const [checked, setChecked] = useState<boolean[]>(() => FINAL_VERIFICATION.map(() => false));
  const allChecked = checked.every(Boolean);

  const toggle = (i: number) =>
    setChecked((c) => c.map((v, idx) => (idx === i ? !v : v)));

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Final verification — {profileName}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Confirm each check before marking this profile complete. Airtable must match the live
          setup.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {FINAL_VERIFICATION.map((item, i) => (
            <FormControlLabel
              key={item}
              control={<Checkbox size="small" checked={checked[i]} onChange={() => toggle(i)} />}
              label={<Typography variant="body2">{item}</Typography>}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" color="success" disabled={!allChecked || busy} onClick={onConfirm}>
          {busy ? 'Saving...' : 'Mark setup complete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
