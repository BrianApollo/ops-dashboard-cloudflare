/**
 * ProfileSelector - Dropdown to pick which Airtable profile's
 * Facebook access token to use for campaign fetching.
 */

import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import type { Profile } from '../../features/profiles/types';

interface ProfileSelectorProps {
  profiles: Profile[];
  selectedProfile: Profile | null;
  onSelect: (profileId: string) => void;
  isLoading: boolean;
}

export function ProfileSelector({
  profiles,
  selectedProfile,
  onSelect,
  isLoading,
}: ProfileSelectorProps) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading profiles...
        </Typography>
      </Box>
    );
  }

  if (profiles.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No active profiles
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <PersonOutlineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        Profile:
      </Typography>
      <FormControl size="small">
        <Select
          value={selectedProfile?.id ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          displayEmpty
          sx={{
            minWidth: 180,
            fontSize: '0.8125rem',
            '& .MuiSelect-select': {
              py: 0.75,
              px: 1.5,
            },
          }}
        >
          {profiles.map((profile) => (
            <MenuItem key={profile.id} value={profile.id}>
              {profile.profileName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
