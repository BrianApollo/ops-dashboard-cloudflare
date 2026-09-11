/**
 * ProfileSelector - header dropdown for picking a profile, in the same shape
 * as the Products page's ProductSelector: clickable name, searchable menu,
 * grouped list. Groups are In Setup / Live.
 */

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChecklistIcon from '@mui/icons-material/Checklist';
import VerifiedIcon from '@mui/icons-material/Verified';

import { StatusPill } from '../../ui';
import { matchesAllTokens } from '../../utils';
import type { HubProfile } from '../../features/profile-hub/types';
import { SOP_STAGES, stagesDone, isSetupComplete } from '../../features/profile-hub/sop';

interface ProfileSelectorProps {
  profiles: HubProfile[];
  selected: HubProfile | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

const name = (p: HubProfile) => String(p.fields['Profile Name'] ?? 'Untitled');
const status = (p: HubProfile) => String(p.fields['Profile Status'] ?? '');

export function ProfileSelector({ profiles, selected, onSelect, onCreate }: ProfileSelectorProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [query, setQuery] = useState('');

  const closeMenu = () => {
    setAnchorEl(null);
    setQuery('');
  };

  const groups = useMemo(() => {
    const visible = profiles
      .filter((p) => matchesAllTokens(query, `${name(p)} ${p.fields['Profile Email'] ?? ''} ${p.fields['Profile ID'] ?? ''}`))
      .sort((a, b) => name(a).localeCompare(name(b)));
    return [
      { label: 'In Setup', items: visible.filter((p) => !isSetupComplete(p.fields)) },
      { label: 'Live', items: visible.filter((p) => isSetupComplete(p.fields)) },
    ].filter((g) => g.items.length > 0);
  }, [profiles, query]);

  const inSetup = selected ? !isSetupComplete(selected.fields) : false;

  return (
    <Paper
      variant="outlined"
      sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, minHeight: 56, bgcolor: 'background.paper', flex: 1 }}
    >
      {selected ? (
        <>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: 'primary.50',
              border: '1px solid',
              borderColor: 'primary.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '1rem',
              flexShrink: 0,
            }}
          >
            {name(selected).charAt(0).toUpperCase()}
          </Box>

          <Box
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', '&:hover': { opacity: 0.8 }, minWidth: 0 }}
          >
            <Typography variant="h6" noWrap sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
              {name(selected)}
            </Typography>
            <KeyboardArrowDownIcon sx={{ color: 'text.secondary', fontSize: '1.25rem' }} />
          </Box>

          {inSetup ? (
            <Chip size="small" icon={<ChecklistIcon />} label={`In setup · ${stagesDone(selected.fields)}/${SOP_STAGES.length}`} color="primary" />
          ) : (
            <Chip size="small" icon={<VerifiedIcon />} label="Live" color="success" />
          )}

          <Box sx={{ flex: 1 }} />
          <StatusPill status={status(selected)} />
        </>
      ) : (
        <Button
          variant="text"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          endIcon={<KeyboardArrowDownIcon />}
          sx={{ color: 'text.primary', fontWeight: 600, fontSize: '1rem', textTransform: 'none', px: 1 }}
        >
          Select a profile
        </Button>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        autoFocus={false}
        PaperProps={{ sx: { width: 380, maxWidth: '90vw', maxHeight: 460 } }}
        MenuListProps={{ sx: { pt: 0 } }}
      >
        <Box
          sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper', px: 1.5, pt: 1.5, pb: 1 }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'ArrowDown' || e.key === 'ArrowUp') return;
            e.stopPropagation();
          }}
        >
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Search profiles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <MenuItem onClick={() => { onCreate(); closeMenu(); }} sx={{ color: 'primary.main', gap: 1, fontWeight: 500 }}>
          <AddIcon fontSize="small" />
          New Profile
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        {groups.length === 0 && (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No profiles match “{query}”
            </Typography>
          </Box>
        )}

        {groups.flatMap((group) => [
          <ListSubheader
            key={`header-${group.label}`}
            disableSticky
            sx={{ lineHeight: 2.2, fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', bgcolor: 'transparent' }}
          >
            {group.label} · {group.items.length}
          </ListSubheader>,
          ...group.items.map((p) => (
            <MenuItem
              key={p.id}
              onClick={() => { onSelect(p.id); closeMenu(); }}
              selected={selected?.id === p.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                  {name(p)}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {group.label === 'In Setup'
                    ? `${stagesDone(p.fields)}/${SOP_STAGES.length} stages done`
                    : String(p.fields['Profile Email'] ?? p.fields['Profile ID'] ?? '')}
                </Typography>
              </Box>
              <StatusPill status={status(p)} sx={{ flexShrink: 0 }} />
            </MenuItem>
          )),
        ])}
      </Menu>
    </Paper>
  );
}
