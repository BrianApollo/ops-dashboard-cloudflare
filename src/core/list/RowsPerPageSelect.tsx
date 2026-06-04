/**
 * RowsPerPageSelect — compact "Per page" dropdown for list/table footers.
 *
 * Drives a page-size value; pagination recalculates itself from it (and hides
 * when everything fits on one page). The big options are deliberately allowed —
 * the table isn't virtualized, so picking 2000/4000 on a large list will paint
 * that many rows and feel heavy. That's the user's explicit choice.
 */

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

const DEFAULT_OPTIONS = [25, 100, 250, 1000, 2000, 4000];

interface RowsPerPageSelectProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
  label?: string;
}

export function RowsPerPageSelect({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  label = 'Per page',
}: RowsPerPageSelectProps) {
  // Keep the current value selectable even if it isn't one of the presets.
  const opts = options.includes(value) ? options : [...options, value].sort((a, b) => a - b);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>{label}</Typography>
      <Select
        size="small"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        sx={{
          fontSize: '0.8125rem',
          '& .MuiSelect-select': { py: 0.5, pl: 1, pr: '24px !important' },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
        }}
      >
        {opts.map((o) => (
          <MenuItem key={o} value={o} sx={{ fontSize: '0.8125rem' }}>
            {o}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
