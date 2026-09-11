/**
 * QuickAddDialog - paste a supplier "FULL" line and fill Box 1 from it.
 * Shows what was parsed (and any doubts) before anything is saved.
 */

import { useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { ORIGINAL_DATA_KEYS, parseSupplierLine, type SupplierParse } from '../../features/profile-hub/original';

interface QuickAddDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the parsed line; resolves when saved. */
  onFill: (parsed: SupplierParse, copyToProfile: boolean) => Promise<void>;
}

export function QuickAddDialog({ open, onClose, onFill }: QuickAddDialogProps) {
  const [text, setText] = useState('');
  const [copyToProfile, setCopyToProfile] = useState(true);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => (text.trim() ? parseSupplierLine(text) : null), [text]);

  const handleFill = async () => {
    if (!parsed) return;
    setBusy(true);
    try {
      await onFill(parsed, copyToProfile);
      setText('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Quick add from supplier line</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Paste the line exactly as the supplier sent it:{' '}
          <Box component="code" sx={{ fontSize: '0.8em' }}>
            uid | password | 2FA key | email | email password | recovery email | cookies
          </Box>
        </Typography>

        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          maxRows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="61577754981939|SLXgq5AwhCZH|LVGX…|name@hotmail.com|S438I7DRta|xxxx@cvlmail.net|sb=…;c_user=…;"
          InputProps={{ sx: { fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' } }}
        />

        {text.trim() && !parsed && (
          <Alert severity="error" sx={{ mt: 1.5, py: 0.25 }}>
            Not recognised — expected at least 7 columns separated by “|”.
          </Alert>
        )}

        {parsed && (
          <Box sx={{ mt: 2 }}>
            {parsed.warnings.map((w) => (
              <Alert key={w} severity="warning" sx={{ mb: 1, py: 0.25 }}>
                {w}
              </Alert>
            ))}
            {parsed.extras.length > 0 && (
              <Alert severity="info" sx={{ mb: 1, py: 0.25 }}>
                Extra value{parsed.extras.length > 1 ? 's' : ''} after the cookies will go into Extra notes:{' '}
                {parsed.extras.join(' · ')}
              </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
              {ORIGINAL_DATA_KEYS.map(({ key, label }) => {
                const v = parsed.data[key] ?? '';
                const secret = key === 'password' || key === 'emailPassword' || key === 'twoFaKey';
                const display = key === 'cookies' ? `${v.length} chars` : secret ? '•'.repeat(Math.min(v.length, 14)) : v;
                return (
                  <Box key={key} sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography variant="body2" noWrap title={secret ? undefined : v} sx={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>
                      {display || '—'}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            <FormControlLabel
              sx={{ mt: 1.5 }}
              control={<Checkbox size="small" checked={copyToProfile} onChange={(e) => setCopyToProfile(e.target.checked)} />}
              label={
                <Typography variant="body2">
                  Also copy into the live profile fields (UID, passwords, 2FA, emails)
                </Typography>
              }
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!parsed || busy}
          onClick={handleFill}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {busy ? 'Saving…' : 'Fill & save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
