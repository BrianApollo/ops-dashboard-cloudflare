/**
 * CompactValue - the read-only, one-line rendering of a field, used when a
 * section is complete and collapsed. Secrets stay masked with reveal/copy.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AttachFileIcon from '@mui/icons-material/AttachFile';

import type { ProfileFieldDef } from '../../features/profile-hub/types';

interface CompactValueProps {
  def: ProfileFieldDef;
  value: unknown;
  linkedNames?: Record<string, string>;
}

/** True when a field holds something worth showing. */
export function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return true;
  return String(value).trim() !== '';
}

function formatDate(value: unknown, withTime: boolean): string {
  if (typeof value !== 'string' || !value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return withTime ? d.toLocaleString() : d.toLocaleDateString();
}

export function CompactValue({ def, value, linkedNames }: CompactValueProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = value == null ? '' : String(value);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  let body: React.ReactNode;

  switch (def.kind) {
    case 'checkbox':
      body = <Typography variant="body2">{value ? 'Yes' : 'No'}</Typography>;
      break;
    case 'links': {
      const items = Array.isArray(value) ? value : [];
      body = (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {items.map((id) => (
            <Chip key={String(id)} size="small" variant="outlined" label={linkedNames?.[String(id)] ?? String(id)} sx={{ height: 22 }} />
          ))}
        </Box>
      );
      break;
    }
    case 'attachments': {
      const files = Array.isArray(value) ? (value as Array<{ id: string; url: string; filename: string }>) : [];
      body = (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {files.map((f) => (
            <Chip key={f.id} size="small" variant="outlined" icon={<AttachFileIcon />} label={f.filename} component="a" href={f.url} target="_blank" rel="noreferrer" clickable sx={{ height: 22 }} />
          ))}
        </Box>
      );
      break;
    }
    case 'date':
      body = <Typography variant="body2">{formatDate(value, false)}</Typography>;
      break;
    case 'datetime':
      body = <Typography variant="body2">{formatDate(value, true)}</Typography>;
      break;
    case 'textarea':
      body = (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {text}
        </Typography>
      );
      break;
    case 'secret':
      body = (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', minWidth: 0 }}>
            {revealed ? text : '•'.repeat(Math.min(text.length, 14))}
          </Typography>
          <IconButton size="small" onClick={() => setRevealed((r) => !r)} sx={{ p: 0.25 }}>
            {revealed ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
          </IconButton>
          <Tooltip title={copied ? 'Copied' : 'Copy'}>
            <IconButton size="small" onClick={copy} sx={{ p: 0.25 }}>
              {copied ? <CheckIcon sx={{ fontSize: 16 }} color="success" /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
        </Box>
      );
      break;
    default:
      body = (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0 }}>
          <Typography variant="body2" noWrap title={text} sx={{ minWidth: 0 }}>
            {text}
          </Typography>
          {def.kind === 'url' && (
            <IconButton size="small" href={text} target="_blank" rel="noreferrer" sx={{ p: 0.25 }}>
              <OpenInNewIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
          <Tooltip title={copied ? 'Copied' : 'Copy'}>
            <IconButton size="small" onClick={copy} sx={{ p: 0.25 }}>
              {copied ? <CheckIcon sx={{ fontSize: 16 }} color="success" /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
        </Box>
      );
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      {def.label && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
          {def.label}
        </Typography>
      )}
      {body}
    </Box>
  );
}

/** Grid wrapper for a row of compact values. */
export function CompactGrid({ children, columns = 4 }: { children: React.ReactNode; columns?: number }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: `repeat(${Math.min(columns, 3)}, 1fr)`, lg: `repeat(${columns}, 1fr)` },
        columnGap: 3,
        rowGap: 1.25,
      }}
    >
      {children}
    </Box>
  );
}
