/**
 * CreativesColumn - LEFT column for Campaign Launch.
 * Videos/Images tabs with checkbox selection.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import FormControlLabel from '@mui/material/FormControlLabel';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import { StatusPill } from '../../ui';
import { EmptyState } from '../../core/state';
import { textMd, textSm } from '../../theme/typography';
import type { SelectableVideo, SelectableImage, CreativeTab, VideoUploadStatus } from '../../features/campaigns/launch/types';

const QUICK_SELECT_OPTIONS = [10, 15, 20, 25, 30, 50];

interface PrelaunchUploaderProps {
  checkLibrary: () => Promise<void>;
  uploadVideos: (videoNames: string[]) => Promise<void>;
  uploadAllNotInLibrary: () => Promise<void>;
  isChecking: boolean;
  isUploading: boolean;
  isPolling: boolean;
  error: string | null;
  processingCount: number;
  readyCount: number;
  failedCount: number;
}

interface CreativesColumnProps {
  videos: SelectableVideo[];
  images: SelectableImage[];
  selectedVideoIds: Set<string>;
  selectedImageIds: Set<string>;
  onToggleVideo: (id: string) => void;
  onToggleImage: (id: string) => void;
  onSelectRandomVideos?: (count: number) => void;
  onSelectRandomImages?: (count: number) => void;
  onUnselectAllVideos?: () => void;
  onUnselectAllImages?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  reuseCreatives?: boolean;
  onToggleReuseCreatives?: () => void;
  // Prelaunch uploader
  prelaunchUploader?: PrelaunchUploaderProps;
  canCheckLibrary?: boolean;
  videosNotInLibraryCount?: number;
  selectedNotInLibraryCount?: number;
  /** Map of angleId → angle name, used to label groups when grouping by angle. */
  anglesById?: Record<string, string>;
  /** Permanently delete an image (record + R2 file). Shows a ✕ per image row. */
  onDeleteImage?: (id: string) => void;
}

export function CreativesColumn({
  videos,
  images,
  selectedVideoIds,
  selectedImageIds,
  onToggleVideo,
  onToggleImage,
  onSelectRandomVideos,
  onSelectRandomImages,
  onUnselectAllVideos,
  onUnselectAllImages,
  collapsed = false,
  onToggleCollapse,
  reuseCreatives = false,
  onToggleReuseCreatives,
  prelaunchUploader,
  canCheckLibrary = false,
  videosNotInLibraryCount = 0,
  selectedNotInLibraryCount = 0,
  anglesById = {},
  onDeleteImage,
}: CreativesColumnProps) {
  const [activeTab, setActiveTab] = useState<CreativeTab>('videos');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [groupByAngle, setGroupByAngle] = useState(false);

  // Only offer angle grouping when at least one media item has an angle assigned.
  const hasAngles = videos.some((v) => !!v.angleId) || images.some((i) => !!i.angleId);

  const handleQuickSelect = (count: number) => {
    if (activeTab === 'videos' && onSelectRandomVideos) {
      onSelectRandomVideos(count);
    } else if (activeTab === 'images' && onSelectRandomImages) {
      onSelectRandomImages(count);
    }
    setMenuAnchor(null);
  };

  const handleUnselectAll = () => {
    if (activeTab === 'videos' && onUnselectAllVideos) {
      onUnselectAllVideos();
    } else if (activeTab === 'images' && onUnselectAllImages) {
      onUnselectAllImages();
    }
    setMenuAnchor(null);
  };

  const currentList = activeTab === 'videos' ? videos : images;
  const currentSelectedCount = activeTab === 'videos' ? selectedVideoIds.size : selectedImageIds.size;
  const totalSelected = selectedVideoIds.size + selectedImageIds.size;

  // Collapsed view - just show icon and count
  if (collapsed) {
    return (
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 2,
          height: '100%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <IconButton onClick={onToggleCollapse} size="small" sx={{ mb: 1 }}>
          <ChevronRightIcon />
        </IconButton>
        <VideoLibraryIcon sx={{ fontSize: 20, color: 'text.secondary', mb: 0.5 }} />
        <Typography variant="caption" sx={{ fontWeight: 600, writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          {totalSelected} selected
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Header with Tabs */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <VideoLibraryIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography sx={textMd}>
            Media Sources
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            disabled={currentList.length === 0}
            sx={{ p: 0.5 }}
          >
            <ShuffleIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            {currentSelectedCount > 0 && (
              <MenuItem onClick={handleUnselectAll}>
                <Typography variant="body2">Unselect all</Typography>
              </MenuItem>
            )}
            {QUICK_SELECT_OPTIONS.map((count) => (
              <MenuItem
                key={count}
                onClick={() => handleQuickSelect(count)}
                disabled={count > currentList.length}
              >
                <Typography variant="body2">Select {count}</Typography>
              </MenuItem>
            ))}
          </Menu>
          {/* Check Video Library Button */}
          {activeTab === 'videos' && prelaunchUploader && (
            <Tooltip title={!canCheckLibrary ? "Select an ad account first" : "Check if videos exist in FB library"}>
              <span>
                <IconButton
                  size="small"
                  onClick={prelaunchUploader.checkLibrary}
                  disabled={!canCheckLibrary || prelaunchUploader.isChecking}
                  sx={{ p: 0.5 }}
                >
                  {prelaunchUploader.isChecking ? (
                    <CircularProgress size={16} />
                  ) : (
                    <CloudSyncIcon sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}
          {/* Upload Videos Button */}
          {activeTab === 'videos' && prelaunchUploader && videosNotInLibraryCount > 0 && (
            <Tooltip title={
              selectedVideoIds.size === 0
                ? `Upload all ${videosNotInLibraryCount} videos not in library`
                : `Upload ${selectedNotInLibraryCount} selected videos`
            }>
              <span>
                <IconButton
                  size="small"
                  onClick={() => {
                    if (selectedVideoIds.size === 0) {
                      prelaunchUploader.uploadAllNotInLibrary();
                    } else {
                      const selectedNames = videos
                        .filter(v => selectedVideoIds.has(v.id) && !v.inLibrary)
                        .map(v => v.name);
                      prelaunchUploader.uploadVideos(selectedNames);
                    }
                  }}
                  disabled={!canCheckLibrary || prelaunchUploader.isUploading || (selectedVideoIds.size > 0 && selectedNotInLibraryCount === 0)}
                  sx={{ p: 0.5 }}
                >
                  {prelaunchUploader.isUploading ? (
                    <CircularProgress size={16} />
                  ) : (
                    <CloudUploadIcon sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}
          {/* Processing/Polling indicator */}
          {activeTab === 'videos' && prelaunchUploader && prelaunchUploader.isPolling && (
            <Tooltip title={`${prelaunchUploader.processingCount} video(s) processing on Facebook`}>
              <Chip
                label={`${prelaunchUploader.processingCount} processing`}
                size="small"
                color="info"
                sx={{ height: 22, fontSize: '0.7rem' }}
              />
            </Tooltip>
          )}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              minHeight: 32,
              '& .MuiTab-root': {
                minHeight: 32,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.75rem',
                px: 1.5,
                py: 0.5,
              },
              '& .MuiTabs-indicator': {
                height: 2,
              },
            }}
          >
            <Tab
              icon={<VideoLibraryIcon sx={{ fontSize: 14 }} />}
              iconPosition="start"
              label={`Videos (${videos.length})`}
              value="videos"
            />
            <Tab
              icon={<ImageIcon sx={{ fontSize: 14 }} />}
              iconPosition="start"
              label={`Images (${images.length})`}
              value="images"
            />
          </Tabs>
          <IconButton
            size="small"
            onClick={onToggleCollapse}
            sx={{ p: 0.5 }}
          >
            <ChevronLeftIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Group by angle toggle */}
      {hasAngles && (
        <Box
          sx={{
            px: 2,
            py: 0.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={groupByAngle}
                onChange={() => setGroupByAngle((v) => !v)}
                size="small"
                sx={{ py: 0 }}
              />
            }
            label={
              <Typography variant="caption" color="text.secondary">
                Group by angle
              </Typography>
            }
            sx={{ m: 0 }}
          />
        </Box>
      )}

      {/* Reuse Creatives Option */}
      {onToggleReuseCreatives && (
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={reuseCreatives}
                onChange={onToggleReuseCreatives}
                size="small"
                sx={{ py: 0 }}
              />
            }
            label={
              <Typography variant="caption" color="text.secondary">
                Use existing creatives if already in ad account
              </Typography>
            }
            sx={{ m: 0 }}
          />
        </Box>
      )}
      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {activeTab === 'videos' && (
          <VideosList
            videos={videos}
            selectedIds={selectedVideoIds}
            onToggle={onToggleVideo}
            groupByAngle={groupByAngle}
            anglesById={anglesById}
          />
        )}
        {activeTab === 'images' && (
          <ImagesList
            images={images}
            selectedIds={selectedImageIds}
            onToggle={onToggleImage}
            groupByAngle={groupByAngle}
            anglesById={anglesById}
            onDelete={onDeleteImage}
          />
        )}
      </Box>
    </Paper>
  );
}

// =============================================================================
// ANGLE GROUPING HELPERS
// =============================================================================

const DEFAULT_GROUP_KEY = '__default__';

interface MediaGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/**
 * Group media by their angle. Items whose angle is missing or unresolved fall
 * into a single "Default" group, which is always rendered last.
 */
function groupByAngleId<T extends { angleId?: string }>(
  items: T[],
  anglesById: Record<string, string>,
): MediaGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.angleId && anglesById[item.angleId] ? item.angleId : DEFAULT_GROUP_KEY;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const named = [...groups.entries()]
    .filter(([key]) => key !== DEFAULT_GROUP_KEY)
    .map(([key, groupItems]) => ({ key, label: anglesById[key], items: groupItems }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const defaultItems = groups.get(DEFAULT_GROUP_KEY);
  if (defaultItems) {
    named.push({ key: DEFAULT_GROUP_KEY, label: 'Default', items: defaultItems });
  }

  return named;
}

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, mb: 0.5, px: 0.5, '&:first-of-type': { mt: 0 } }}>
      <Typography
        sx={{
          ...textSm,
          fontWeight: 700,
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
      <Chip label={count} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
    </Box>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface VideosListProps {
  videos: SelectableVideo[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  groupByAngle?: boolean;
  anglesById?: Record<string, string>;
}

function VideosList({ videos, selectedIds, onToggle, groupByAngle = false, anglesById = {} }: VideosListProps) {
  if (videos.length === 0) {
    return <EmptyState variant="filter" />;
  }

  if (groupByAngle) {
    const groups = groupByAngleId(videos, anglesById);
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {groups.map((group) => (
          <Box key={group.key}>
            <GroupHeader label={group.label} count={group.items.length} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {group.items.map((video) => (
                <VideoRow key={video.id} video={video} selected={selectedIds.has(video.id)} onToggle={onToggle} />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {videos.map((video) => (
        <VideoRow key={video.id} video={video} selected={selectedIds.has(video.id)} onToggle={onToggle} />
      ))}
    </Box>
  );
}

function VideoHoverPreview({ video }: { video: SelectableVideo }) {
  // No source → nothing to preview. Still show an icon placeholder for alignment.
  const trigger = video.fbThumbnailUrl ? (
    <Box
      component="img"
      src={video.fbThumbnailUrl}
      alt={video.name}
      sx={{ width: 32, height: 32, borderRadius: 0.5, objectFit: 'cover', cursor: video.creativeLink ? 'zoom-in' : 'default', flexShrink: 0 }}
    />
  ) : (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: 0.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'action.hover',
        cursor: video.creativeLink ? 'zoom-in' : 'default',
        flexShrink: 0,
      }}
    >
      <VideoLibraryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
    </Box>
  );

  if (!video.creativeLink) return trigger;

  return (
    <Tooltip
      placement="right"
      arrow
      enterDelay={300}
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: 'background.paper',
            p: 0.5,
            maxWidth: 'none',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            '& .MuiTooltip-arrow': { color: 'background.paper' },
          },
        },
      }}
      title={
        <Box
          component="video"
          src={video.creativeLink}
          poster={video.fbThumbnailUrl}
          autoPlay
          muted
          loop
          playsInline
          sx={{ width: 280, height: 280, objectFit: 'cover', borderRadius: 1, display: 'block', bgcolor: 'black' }}
        />
      }
    >
      {trigger}
    </Tooltip>
  );
}

function VideoRow({ video, selected, onToggle }: { video: SelectableVideo; selected: boolean; onToggle: (id: string) => void }) {
  return (
    <Box
      onClick={() => onToggle(video.id)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: 1,
        border: selected ? '2px solid' : '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        cursor: 'pointer',
        transition: 'all 0.15s',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      <Checkbox checked={selected} size="small" sx={{ p: 0 }} />
      <VideoHoverPreview video={video} />
      <Typography
        sx={{
          ...textSm,
          flex: 1,
          minWidth: 0,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {video.name}
      </Typography>
      {/* Upload Status Pills */}
      {video.uploadStatus === 'queued' && (
        <Chip
          label="Queued"
          size="small"
          sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 500, mr: 0.5 }}
        />
      )}
      {video.uploadStatus === 'uploading' && (
        <Chip
          label="Uploading..."
          size="small"
          icon={<CircularProgress size={10} sx={{ color: '#1d4ed8 !important' }} />}
          sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 500, mr: 0.5, '& .MuiChip-icon': { ml: 0.5 } }}
        />
      )}
      {video.uploadStatus === 'processing' && (
        <Chip
          label="Processing..."
          size="small"
          icon={<CircularProgress size={10} sx={{ color: '#c2410c !important' }} />}
          sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 500, mr: 0.5, '& .MuiChip-icon': { ml: 0.5 } }}
        />
      )}
      {video.uploadStatus === 'failed' && (
        <Tooltip title={video.uploadError || 'Upload failed'}>
          <Chip
            label="Failed"
            size="small"
            sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 500, mr: 0.5 }}
          />
        </Tooltip>
      )}
      {(video.inLibrary || video.uploadStatus === 'ready') && (
        <Chip
          label="In Library"
          size="small"
          sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#d1fae5', color: '#065f46', fontWeight: 500, mr: 0.5 }}
        />
      )}
      <StatusPill status={video.status} />
    </Box>
  );
}

interface ImagesListProps {
  images: SelectableImage[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  groupByAngle?: boolean;
  anglesById?: Record<string, string>;
  onDelete?: (id: string) => void;
}

function ImagesList({ images, selectedIds, onToggle, groupByAngle = false, anglesById = {}, onDelete }: ImagesListProps) {
  if (images.length === 0) {
    return <EmptyState variant="filter" />;
  }

  if (groupByAngle) {
    const groups = groupByAngleId(images, anglesById);
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {groups.map((group) => (
          <Box key={group.key}>
            <GroupHeader label={group.label} count={group.items.length} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {group.items.map((image) => (
                <ImageRow key={image.id} image={image} selected={selectedIds.has(image.id)} onToggle={onToggle} onDelete={onDelete} />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {images.map((image) => (
        <ImageRow key={image.id} image={image} selected={selectedIds.has(image.id)} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </Box>
  );
}

function ImageRow({ image, selected, onToggle, onDelete }: { image: SelectableImage; selected: boolean; onToggle: (id: string) => void; onDelete?: (id: string) => void }) {
  return (
    <Box
      onClick={() => onToggle(image.id)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: 1,
        border: selected ? '2px solid' : '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        cursor: 'pointer',
        transition: 'all 0.15s',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      <Checkbox checked={selected} size="small" sx={{ p: 0 }} />
      {image.thumbnailUrl && (
        <Tooltip
          title={
            <Box
              component="img"
              src={image.thumbnailUrl}
              alt={image.name}
              sx={{ width: 280, height: 280, objectFit: 'cover', borderRadius: 1, display: 'block' }}
            />
          }
          placement="right"
          arrow
          slotProps={{
            tooltip: {
              sx: {
                bgcolor: 'background.paper',
                p: 0.5,
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                '& .MuiTooltip-arrow': { color: 'background.paper' },
              },
            },
          }}
        >
          <Box
            component="img"
            src={image.thumbnailUrl}
            alt={image.name}
            sx={{ width: 32, height: 32, borderRadius: 0.5, objectFit: 'cover', cursor: 'zoom-in' }}
          />
        </Tooltip>
      )}
      <Typography
        sx={{
          ...textSm,
          flex: 1,
          minWidth: 0,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {image.name}
      </Typography>
      {onDelete && (
        <Tooltip title="Delete image (record + file)">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(image.id);
            }}
            sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
