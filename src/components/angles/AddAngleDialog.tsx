/**
 * AddAngleDialog - Dialog for creating a new angle.
 * Simple form: just name input, product is preselected.
 * New angles default to Is_Active = true.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { AppDialog } from '../../core/dialog';

interface AddAngleDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, productId: string) => Promise<void>;
  isSubmitting: boolean;
  productId: string;
  productName: string;
}

export function AddAngleDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  productId,
  productName,
}: AddAngleDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && !isSubmitting;

  const resetForm = () => {
    setName('');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter an angle name');
      return;
    }

    setError(null);
    try {
      await onSubmit(name.trim(), productId);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create angle');
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit) {
      handleSubmit();
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      title="Add Angle"
      size="sm"
      actions={
        <>
          <Button onClick={handleClose} variant="outlined" color="inherit" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!canSubmit}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 0.5,
              color: 'text.secondary',
              fontWeight: 500,
              textTransform: 'uppercase',
              fontSize: '0.7rem',
              letterSpacing: '0.05em',
            }}
          >
            Product
          </Typography>
          <Box
            sx={{
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {productName}
            </Typography>
          </Box>
        </Box>

        <TextField
          label="Angle Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          fullWidth
          autoFocus
          disabled={isSubmitting}
          error={!!error}
          placeholder="Enter angle name..."
        />

        <Typography variant="caption" color="text.secondary">
          Angle will be created as Active by default.
        </Typography>

        {error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
      </Box>
    </AppDialog>
  );
}
