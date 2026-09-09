/**
 * ProfileField - renders one Airtable field as an editable control.
 * Purely presentational; the page owns the draft state.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import InputAdornment from '@mui/material/InputAdornment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import type { ProfileFieldDef } from '../../features/profile-hub/types';

interface ProfileFieldProps {
  def: ProfileFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  dirty: boolean;
  /** Airtable record id -> display name, for linked-record chips. */
  linkedNames?: Record<string, string>;
}

/** Airtable date values come back as ISO strings; <input type="date"> wants YYYY-MM-DD. */
function toDateInput(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  return value.slice(0, 10);
}

function formatDateTime(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export function ProfileField({ def, value, onChange, dirty, linkedNames }: ProfileFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = value == null ? '' : String(value);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  // ---- checkbox -------------------------------------------------------------
  if (def.kind === 'checkbox') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 1.5,
          py: 0.75,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: dirty ? 'warning.main' : 'divider',
          bgcolor: 'background.paper',
          minHeight: 56,
        }}
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {def.label}
          </Typography>
          {def.hint && (
            <Typography variant="caption" color="text.secondary">
              {def.hint}
            </Typography>
          )}
        </Box>
        <Switch
          size="small"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      </Box>
    );
  }

  // ---- linked records (read-only chips) -------------------------------------
  if (def.kind === 'links') {
    const items = Array.isArray(value) ? value : [];
    return (
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {def.label}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
          {items.length === 0 ? (
            <Typography variant="body2" color="text.disabled">
              None linked
            </Typography>
          ) : (
            items.map((item) => {
              const id = String(item);
              return (
                <Chip key={id} size="small" label={linkedNames?.[id] ?? id} variant="outlined" />
              );
            })
          )}
        </Box>
      </Box>
    );
  }

  // ---- read-only display ----------------------------------------------------
  if (def.readOnly) {
    return (
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {def.label}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {def.kind === 'datetime' ? formatDateTime(value) : text || '—'}
        </Typography>
      </Box>
    );
  }

  // ---- status ---------------------------------------------------------------
  if (def.kind === 'status') {
    return (
      <TextField
        select
        fullWidth
        size="small"
        label={def.label}
        value={text || 'Active'}
        onChange={(e) => onChange(e.target.value)}
        sx={dirty ? { '& .MuiOutlinedInput-root': { bgcolor: 'warning.light' } } : undefined}
      >
        {['Active', 'Inactive', 'Banned', 'Restricted'].map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  // ---- date -----------------------------------------------------------------
  if (def.kind === 'date') {
    return (
      <TextField
        fullWidth
        size="small"
        type="date"
        label={def.label}
        value={toDateInput(value)}
        onChange={(e) => onChange(e.target.value || null)}
        InputLabelProps={{ shrink: true }}
        helperText={def.hint}
      />
    );
  }

  // ---- text / secret / email / url ------------------------------------------
  const isSecret = def.kind === 'secret';

  return (
    <TextField
      fullWidth
      size="small"
      label={def.label}
      value={text}
      onChange={(e) => onChange(e.target.value)}
      type={isSecret && !revealed ? 'password' : 'text'}
      helperText={def.hint}
      InputProps={{
        sx: isSecret ? { fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem' } : undefined,
        endAdornment: (
          <InputAdornment position="end">
            {isSecret && (
              <IconButton size="small" edge="end" onClick={() => setRevealed((r) => !r)}>
                {revealed ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            )}
            {def.kind === 'url' && text && (
              <IconButton size="small" edge="end" href={text} target="_blank" rel="noreferrer">
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            )}
            {text && (
              <Tooltip title={copied ? 'Copied' : 'Copy'}>
                <IconButton size="small" edge="end" onClick={handleCopy}>
                  {copied ? (
                    <CheckIcon fontSize="small" color="success" />
                  ) : (
                    <ContentCopyIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}
          </InputAdornment>
        ),
      }}
      sx={
        dirty
          ? { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'warning.main', borderWidth: 2 } }
          : undefined
      }
    />
  );
}
