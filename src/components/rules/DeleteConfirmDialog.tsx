/**
 * DeleteConfirmDialog - Simple confirmation before deleting a rule.
 */

import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { AppDialog } from '../../core/dialog/AppDialog';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  ruleName: string;
  saving: boolean;
}

export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  ruleName,
  saving,
}: DeleteConfirmDialogProps) {
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Delete Rule"
      size="xs"
      actions={
        <>
          <Button onClick={onClose} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={onConfirm}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {saving ? 'Deleting...' : 'Delete'}
          </Button>
        </>
      }
    >
      <Typography variant="body2" sx={{ pt: 1 }}>
        Are you sure you want to delete <strong>{ruleName}</strong>? This action cannot be undone.
      </Typography>
    </AppDialog>
  );
}
