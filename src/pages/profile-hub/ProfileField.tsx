/**
 * ProfileField - renders one Airtable field as a form control, in the same
 * label-above / grey-until-Edit style as the Products Setup tab.
 * Purely presentational; the owning section holds the draft.
 */

import { useState, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AttachFileIcon from '@mui/icons-material/AttachFile';

import { formLabelSx, textFieldEditModeSx, textFieldViewModeSx } from '../../components/products/composition/styles';
import { PROFILE_STATUSES, type ProfileFieldDef } from '../../features/profile-hub/types';
import { ORIGINAL_DATA_KEYS, parseOriginalData } from '../../features/profile-hub/original';

interface ProfileFieldProps {
  def: ProfileFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  /** View mode: greyed and not editable until the section's Edit is pressed. */
  disabled?: boolean;
  /** Airtable record id -> display name, for linked-record chips. */
  linkedNames?: Record<string, string>;
  /** For 'attachments' fields: upload handler. Omitted = read-only list. */
  onUpload?: (file: File) => Promise<void>;
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

function Label({ def }: { def: ProfileFieldDef }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={formLabelSx}>
      {def.label}
    </Typography>
  );
}

export function ProfileField({
  def,
  value,
  onChange,
  disabled = false,
  linkedNames,
  onUpload,
}: ProfileFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);

  const text = value == null ? '' : String(value);
  const modeSx = disabled ? textFieldViewModeSx : textFieldEditModeSx;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  // ---- checkbox -------------------------------------------------------------
  if (def.kind === 'checkbox') {
    return (
      <Box>
        <Label def={def} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 40 }}>
          <Switch
            size="small"
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <Typography variant="body2" color={value ? 'text.primary' : 'text.secondary'}>
            {value ? 'Yes' : 'No'}
          </Typography>
        </Box>
      </Box>
    );
  }

  // ---- linked records (read-only chips) -------------------------------------
  if (def.kind === 'links') {
    const items = Array.isArray(value) ? value : [];
    return (
      <Box>
        <Label def={def} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
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

  // ---- attachments ----------------------------------------------------------
  if (def.kind === 'attachments') {
    const files = Array.isArray(value)
      ? (value as Array<{ id: string; url: string; filename: string }>)
      : [];
    const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !onUpload) return;
      setUploading(true);
      try {
        await onUpload(file);
      } finally {
        setUploading(false);
      }
    };
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Label def={def} />
          {onUpload && !disabled && (
            <Button
              component="label"
              size="small"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              disabled={uploading}
              sx={{ mb: 0.5 }}
            >
              {uploading ? 'Uploading...' : 'Upload'}
              <input type="file" hidden onChange={handleFile} />
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {files.length === 0 ? (
            <Typography variant="body2" color="text.disabled">
              {def.hint ? `None yet — ${def.hint}` : 'None yet'}
            </Typography>
          ) : (
            files.map((f) => (
              <Chip
                key={f.id}
                size="small"
                variant="outlined"
                icon={<AttachFileIcon />}
                label={f.filename}
                component="a"
                href={f.url}
                target="_blank"
                rel="noreferrer"
                clickable
              />
            ))
          )}
        </Box>
      </Box>
    );
  }

  // ---- json (read-only key/value view) --------------------------------------
  if (def.kind === 'json') {
    const entries = Object.entries(parseOriginalData(value)).filter(([, v]) => v && String(v).trim());
    return (
      <Box>
        <Label def={def} />
        {entries.length === 0 ? (
          <Typography variant="body2" color="text.disabled">
            Not recorded
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
              gap: 1,
            }}
          >
            {entries.map(([k, v]) => {
              const meta = ORIGINAL_DATA_KEYS.find((o) => o.key === k);
              return (
                <Box key={k} sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">
                    {meta?.label ?? k}
                  </Typography>
                  <Typography
                    variant="body2"
                    noWrap
                    title={String(v)}
                    sx={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}
                  >
                    {String(v)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    );
  }

  // ---- read-only display ----------------------------------------------------
  if (def.readOnly) {
    return (
      <Box>
        <Label def={def} />
        <Typography variant="body2">
          {def.kind === 'datetime' ? formatDateTime(value) : text || '—'}
        </Typography>
      </Box>
    );
  }

  // ---- textarea -------------------------------------------------------------
  if (def.kind === 'textarea') {
    return (
      <Box>
        <Label def={def} />
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          value={text}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          helperText={disabled ? undefined : def.hint}
          sx={modeSx}
        />
      </Box>
    );
  }

  // ---- status ---------------------------------------------------------------
  if (def.kind === 'status') {
    return (
      <Box>
        <Label def={def} />
        <TextField
          select
          fullWidth
          size="small"
          value={text || 'Active'}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          sx={modeSx}
        >
          {PROFILE_STATUSES.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    );
  }

  // ---- date -----------------------------------------------------------------
  if (def.kind === 'date') {
    return (
      <Box>
        <Label def={def} />
        <TextField
          fullWidth
          size="small"
          type="date"
          value={toDateInput(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || null)}
          helperText={disabled ? undefined : def.hint}
          sx={modeSx}
        />
      </Box>
    );
  }

  // ---- text / secret / email / url ------------------------------------------
  const isSecret = def.kind === 'secret';

  return (
    <Box>
      <Label def={def} />
      <TextField
        fullWidth
        size="small"
        value={text}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        type={isSecret && !revealed ? 'password' : 'text'}
        placeholder={disabled ? '—' : def.hint}
        helperText={disabled ? undefined : def.hint}
        sx={modeSx}
        InputProps={{
          sx: isSecret ? { fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem' } : undefined,
          endAdornment: (
            <InputAdornment position="end">
              {isSecret && text && (
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
      />
    </Box>
  );
}
