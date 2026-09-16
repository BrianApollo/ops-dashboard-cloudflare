/**
 * CampaignAssetsBar - Shows the Facebook Page and Pixel a launched campaign runs on.
 *
 * IDs come live from Facebook (ad creatives -> page, ad sets -> pixel), with
 * names resolved via the Graph API. Falls back to the launch snapshot and the
 * Airtable "Page Used" / "Pixel Used" fields when live data is unavailable.
 */

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import { useTheme, alpha } from '@mui/material/styles';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { getFbObjectNames } from '../../features/campaigns';
import type { Campaign, FbAdSet, FbAd } from '../../features/campaigns';
import type { LaunchSnapshot } from '../../features/campaigns/launch/types';

// =============================================================================
// DATA
// =============================================================================

const unique = (values: (string | undefined)[]) =>
  [...new Set(values.filter((v): v is string => !!v))];

function parseSnapshotFacebook(launchedData?: string): LaunchSnapshot['facebook'] | null {
  if (!launchedData) return null;
  try {
    return (JSON.parse(launchedData) as LaunchSnapshot).facebook ?? null;
  } catch {
    return null;
  }
}

/** Resolve names for one object type; a permission error yields no names rather than failing. */
function useObjectNames(kind: 'page' | 'pixel', ids: string[], accessToken?: string) {
  return useQuery({
    queryKey: ['fb-object-names', kind, ids.join(',')],
    queryFn: () => getFbObjectNames(ids, accessToken!).catch(() => ({} as Record<string, string>)),
    enabled: !!accessToken && ids.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

interface CampaignAssetsBarProps {
  campaign: Campaign;
  adSets: FbAdSet[];
  ads: FbAd[];
  accessToken?: string;
}

export function CampaignAssetsBar({ campaign, adSets, ads, accessToken }: CampaignAssetsBarProps) {
  const snapshot = parseSnapshotFacebook(campaign.launchedData);

  const livePageIds = unique(ads.map((ad) => ad.creative?.actor_id || ad.creative?.object_story_spec?.page_id));
  const livePixelIds = unique(adSets.map((adSet) => adSet.promoted_object?.pixel_id));

  const pageIds = livePageIds.length ? livePageIds : unique([snapshot?.page?.id, campaign.pageUsed]);
  const pixelIds = livePixelIds.length ? livePixelIds : unique([snapshot?.pixel?.id, campaign.pixelUsed]);

  const pageNames = useObjectNames('page', pageIds, accessToken);
  const pixelNames = useObjectNames('pixel', pixelIds, accessToken);

  const nameFor = (id: string, fetched: Record<string, string> | undefined, saved?: { id: string; name: string }) =>
    fetched?.[id] || (saved?.id === id ? saved.name : undefined);

  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.5,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 1.5,
        borderTop: '1px dashed',
        borderColor: 'divider',
      }}
    >
      <AssetTile
        label="Facebook Page"
        icon={<FlagOutlinedIcon sx={{ fontSize: 18 }} />}
        color="info"
        ids={pageIds}
        loading={pageNames.isLoading}
        getName={(id) => nameFor(id, pageNames.data, snapshot?.page)}
        fromLaunchData={livePageIds.length === 0}
      />
      <AssetTile
        label="Pixel"
        icon={<TrackChangesIcon sx={{ fontSize: 18 }} />}
        color="secondary"
        ids={pixelIds}
        loading={pixelNames.isLoading}
        getName={(id) => nameFor(id, pixelNames.data, snapshot?.pixel)}
        fromLaunchData={livePixelIds.length === 0}
      />
    </Box>
  );
}

// =============================================================================
// TILE
// =============================================================================

interface AssetTileProps {
  label: string;
  icon: ReactNode;
  color: 'info' | 'secondary';
  ids: string[];
  loading: boolean;
  getName: (id: string) => string | undefined;
  fromLaunchData: boolean;
}

function AssetTile({ label, icon, color, ids, loading, getName, fromLaunchData }: AssetTileProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const accent = theme.palette[color].main;
  const [copied, setCopied] = useState(false);

  const [primaryId, ...otherIds] = ids;
  const name = primaryId ? getName(primaryId) : undefined;

  const handleCopy = async () => {
    if (!primaryId) return;
    try {
      await navigator.clipboard.writeText(primaryId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (insecure context) — nothing to do
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minWidth: 0,
        px: 1.5,
        py: 1,
        borderRadius: 1.5,
        bgcolor: isDark ? alpha(theme.palette.common.white, 0.03) : 'grey.50',
        border: '1px solid',
        borderColor: isDark ? alpha(theme.palette.common.white, 0.08) : 'divider',
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1.5,
          color: accent,
          bgcolor: alpha(accent, isDark ? 0.18 : 0.1),
        }}
      >
        {icon}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            {label}
          </Typography>
          {fromLaunchData && primaryId && (
            <Tooltip title="Not readable from Facebook — showing launch data">
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                · saved
              </Typography>
            </Tooltip>
          )}
        </Box>

        {!primaryId ? (
          <Typography variant="body2" color="text.disabled">Not available</Typography>
        ) : (
          <>
            {loading ? (
              <Skeleton variant="text" width="60%" sx={{ fontSize: '0.875rem' }} />
            ) : (
              <Typography variant="body2" noWrap title={name} sx={{ fontWeight: 600 }}>
                {name || 'Unnamed'}
              </Typography>
            )}
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.7rem' }}
            >
              {primaryId}
            </Typography>
          </>
        )}
      </Box>

      {otherIds.length > 0 && (
        <Tooltip
          title={
            <Box>
              {otherIds.map((id) => (
                <Box key={id}>{getName(id) || 'Unnamed'} · {id}</Box>
              ))}
            </Box>
          }
        >
          <Chip
            label={`+${otherIds.length}`}
            size="small"
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, color: accent, bgcolor: alpha(accent, 0.12) }}
          />
        </Tooltip>
      )}

      {primaryId && (
        <Tooltip title={copied ? 'Copied' : 'Copy ID'}>
          <IconButton size="small" onClick={handleCopy} sx={{ color: copied ? 'success.main' : 'text.secondary' }}>
            {copied ? <CheckIcon sx={{ fontSize: 16 }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
