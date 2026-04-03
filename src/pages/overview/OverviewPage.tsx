/**
 * OverviewPage - Product status counts at a glance.
 * Reads from existing React Query cache — no new API calls or data layers.
 */

import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTheme } from '@mui/material/styles';
import { listProducts } from '../../features/products/data';
import { listScripts } from '../../features/scripts/data';
import { listVideos } from '../../features/videos/data';
import { listImages } from '../../features/images/data';
import { ToggleTabs } from '../../ui/ToggleTabs';
import { VideoEditorsTab } from './VideoEditorsTab';

type OverviewTab = 'overview' | 'editors';

const cellSx = { py: 1.5, px: 1.5, fontSize: '0.875rem' };

export function OverviewPage() {
  const theme = useTheme();
  const headerSx = {
    fontWeight: 600,
    fontSize: '0.75rem',
    color: '#fff !important',
    py: 1,
    px: 1.5,
    backgroundColor: `${theme.palette.primary.main} !important`,
    borderRight: '1px solid rgba(255,255,255,0.15)',
    borderBottom: `1px solid rgba(255,255,255,0.25) !important`,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  };
  const groupHeaderSx = {
    ...headerSx,
    textAlign: 'center' as const,
  };
  const [activeTab, setActiveTab] = useState<OverviewTab>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: ({ signal }) => listProducts(signal),
    staleTime: 30_000,
  });
  const scriptsQuery = useQuery({
    queryKey: ['scripts'],
    queryFn: ({ signal }) => listScripts(signal),
    staleTime: 30_000,
  });
  const videosQuery = useQuery({
    queryKey: ['videos'],
    queryFn: ({ signal }) => listVideos(signal),
    staleTime: 30_000,
  });
  const imagesQuery = useQuery({
    queryKey: ['images'],
    queryFn: ({ signal }) => listImages(signal),
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    const products = productsQuery.data ?? [];
    const scripts = scriptsQuery.data ?? [];
    const videos = videosQuery.data ?? [];
    const images = imagesQuery.data ?? [];

    return products.map((p) => {
      const pScripts = scripts.filter((s) => s.product.id === p.id);
      const pVideos = videos.filter((v) => v.product.id === p.id);
      const pImages = images.filter((i) => i.product.id === p.id);

      const assignedScriptIds = new Set(
        pVideos.map((v) => v.script?.id).filter(Boolean)
      );

      return {
        id: p.id,
        name: p.name,
        scriptsAssigned: pScripts.filter((s) => assignedScriptIds.has(s.id)).length,
        scriptsUnassigned: pScripts.filter((s) => !assignedScriptIds.has(s.id)).length,
        videosTodo: pVideos.filter((v) => v.status === 'todo').length,
        videosReview: pVideos.filter((v) => v.status === 'review').length,
        videosAvailable: pVideos.filter((v) => v.status === 'available').length,
        videosUsed: pVideos.filter((v) => v.status === 'used').length,
        imagesAvailable: pImages.filter((i) => i.usedInCampaigns.length === 0).length,
        imagesUsed: pImages.filter((i) => i.usedInCampaigns.length > 0).length,
      };
    });
  }, [productsQuery.data, scriptsQuery.data, videosQuery.data, imagesQuery.data]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        productsQuery.refetch(),
        scriptsQuery.refetch(),
        videosQuery.refetch(),
        imagesQuery.refetch(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [productsQuery, scriptsQuery, videosQuery, imagesQuery]);

  const isLoading = productsQuery.isLoading || scriptsQuery.isLoading
    || videosQuery.isLoading || imagesQuery.isLoading;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Overview</Typography>
          <ToggleTabs
            value={activeTab}
            onChange={setActiveTab}
            size="small"
            options={[
              { value: 'overview', label: 'Overview' },
              { value: 'editors', label: 'Video Editors' },
            ]}
          />
        </Box>
        {activeTab === 'overview' && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              startIcon={showMore ? <RemoveIcon /> : <AddIcon />}
              onClick={() => setShowMore((v) => !v)}
              sx={{ textTransform: 'none' }}
            >
              {showMore ? 'Show Less Columns' : 'Show More Columns'}
            </Button>
            <Tooltip title="Refresh all data">
              <IconButton onClick={handleRefresh} disabled={isRefreshing}>
                {isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {activeTab === 'overview' ? (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2} sx={{ ...headerSx, borderRight: '1px solid rgba(255,255,255,0.25)' }}>Product</TableCell>
                <TableCell colSpan={showMore ? 2 : 1} sx={groupHeaderSx}>Scripts</TableCell>
                <TableCell colSpan={showMore ? 4 : 1} sx={groupHeaderSx}>Videos</TableCell>
                <TableCell colSpan={showMore ? 2 : 1} sx={{ ...groupHeaderSx, borderRight: 'none' }}>Images</TableCell>
              </TableRow>
              <TableRow>
                {showMore && <TableCell sx={headerSx}>Assigned</TableCell>}
                <TableCell sx={headerSx}>Unassigned</TableCell>
                {showMore && <TableCell sx={headerSx}>To Do</TableCell>}
                {showMore && <TableCell sx={headerSx}>Review</TableCell>}
                <TableCell sx={headerSx}>Available</TableCell>
                {showMore && <TableCell sx={headerSx}>Used</TableCell>}
                <TableCell sx={headerSx}>Available</TableCell>
                {showMore && <TableCell sx={{ ...headerSx, borderRight: 'none' }}>Used</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{row.name}</TableCell>
                  {showMore && <TableCell sx={cellSx}>{row.scriptsAssigned}</TableCell>}
                  <TableCell sx={cellSx}>{row.scriptsUnassigned}</TableCell>
                  {showMore && <TableCell sx={cellSx}>{row.videosTodo}</TableCell>}
                  {showMore && <TableCell sx={cellSx}>{row.videosReview}</TableCell>}
                  <TableCell sx={cellSx}>{row.videosAvailable}</TableCell>
                  {showMore && <TableCell sx={cellSx}>{row.videosUsed}</TableCell>}
                  <TableCell sx={cellSx}>{row.imagesAvailable}</TableCell>
                  {showMore && <TableCell sx={cellSx}>{row.imagesUsed}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <VideoEditorsTab />
      )}
    </Box>
  );
}
