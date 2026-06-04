/**
 * Video Editor Page
 *
 * This page is pure composition + configuration.
 * All logic lives in useVideosController.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import { AppDialog } from '../../core/dialog';
import {
  ListToolbar,
  ListPagination,
  RowsPerPageSelect,
} from '../../core/list';
import { EmptyState } from '../../core/state';
import { BulkActionBar } from '../../core/bulk';
import type { BulkAction } from '../../core/bulk';
import { useToast } from '../../core/toast';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import LayersIcon from '@mui/icons-material/Layers';
import { StatusPill, getStatusColors } from '../../ui';
import {
  VideoDetailPanel,
  VideoTable,
  ScriptProductionGrid,
  useVideosController,
  defaultVideoColumns,
  STATUS_LABELS,
} from '../../features/videos';
import { ScriptGroupedTable } from '../../components/videos/ScriptGroupedTable';
import { EditorToDoBanner } from './EditorToDoBanner';
import { getScriptCounts } from '../../features/videos/data';
import type { VideoAsset, VideoFormat, TextVersion } from '../../features/videos';
import { VideoEditorsTab } from '../overview/VideoEditorsTab';
import { useQuery } from '@tanstack/react-query';
import { EditorMonthlyStats } from './EditorMonthlyStats';

/**
 * Solid-fill style for the currently selected status pill.
 * Unselected pills keep their light tint, so the selected one clearly stands out.
 */
const solidFillSx = (accent: string) => ({
  bgcolor: accent,
  color: '#fff',
  fontWeight: 700,
  boxShadow: 'none',
  '&:hover': { bgcolor: accent },
});

export function EditorPortalPage() {
  // Local UI state only
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [groupByScripts, setGroupByScripts] = useState(false);

  // True per-script done/total counts (from the Video Scripts table rollups) for
  // the grouped view's "x/y uploaded" chip. Counts ALL videos, not the filtered
  // page. Only fetched while the grouped view is active.
  const { data: scriptCounts } = useQuery({
    queryKey: ['scriptCounts'],
    queryFn: ({ signal }) => getScriptCounts(signal),
    staleTime: 60_000,
    enabled: groupByScripts,
  });
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
  const [moreFiltersAnchor, setMoreFiltersAnchor] = useState<HTMLElement | null>(null);
  // Per-row upload state: tracks ALL currently uploading video IDs (supports concurrent uploads)
  const [uploadingVideoIds, setUploadingVideoIds] = useState<Set<string>>(new Set());
  const toast = useToast();

  // Helper to check if a specific video is uploading
  const isVideoUploading = useCallback((videoId: string) => uploadingVideoIds.has(videoId), [uploadingVideoIds]);

  // Helper to add a video to the uploading set
  const startUpload = useCallback((videoId: string) => {
    setUploadingVideoIds((prev) => new Set(prev).add(videoId));
  }, []);

  // Helper to remove a video from the uploading set
  const endUpload = useCallback((videoId: string) => {
    setUploadingVideoIds((prev) => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
  }, []);

  // All logic comes from the controller
  // NOTE: We do NOT use the global isUploading from the controller - we track per-video upload state locally
  const {
    list,
    editorOptions,
    productOptions,
    selectedVideos,
    activeStatus,
    bulkActions,
    handleStatusCardClick,
    handleEditorChange,
    handleProductChange,
    handleVideoSave,
    handleClearFilters,
    uploadCreative,
    canUploadToVideo,
    user, // Destructure user context to check role
  } = useVideosController();

  // Editor whose monthly-stats card is shown: the selected editor in the filter,
  // falling back to the logged-in user. Keeps the card visible (and per-editor)
  // for ops/admins too, not just when an editor views their own data.
  const statsEditorId = list.filters.editorId ?? user.userId;

  // Default the status filter to "Todo" on first mount.
  // This is page-local: the shared controller default is "all" (no status filter),
  // which other consumers (campaign launch, products) rely on — so we don't touch it.
  const hasSetDefaultStatus = useRef(false);
  useEffect(() => {
    if (!hasSetDefaultStatus.current) {
      hasSetDefaultStatus.current = true;
      if (list.filters.status.length === 0) {
        list.setFilters({ ...list.filters, status: ['todo'] });
      }
    }
  }, [list]);

  // Format and TextVersion filter handlers
  const handleFormatChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newFormats: VideoFormat[]) => {
      list.setFilters({ ...list.filters, format: newFormats });
    },
    [list]
  );

  const handleTextVersionChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newTextVersions: TextVersion[]) => {
      list.setFilters({ ...list.filters, textVersion: newTextVersions });
    },
    [list]
  );

  // Count of active "more filters"
  const moreFiltersCount = list.filters.format.length + list.filters.textVersion.length;

  // Derive selected video from list
  const selectedVideo = useMemo(
    () => list.allRecords.find((v) => v.id === selectedVideoId) ?? null,
    [list.allRecords, selectedVideoId]
  );

  // UI event handlers (thin wrappers)
  const handleVideoClick = (video: VideoAsset) => setSelectedVideoId(video.id);
  const handlePanelClose = () => setSelectedVideoId(null);

  // Open script in a dialog
  const handleViewScript = useCallback(() => {
    if (!selectedVideo) return;
    setScriptDialogOpen(true);
  }, [selectedVideo]);

  // Handle video upload — shows toast on success/failure ONLY (no toast on start)
  // Uses Airtable record name in all toasts, never filenames
  // Manages per-video upload state (spinner) for both table rows and sidebar
  const handleUpload = useCallback(
    async (
      videoId: string,
      file: File,
      onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
    ) => {
      // Get video record name for toast (MUST use Airtable name, never filename)
      const video = list.allRecords.find((v) => v.id === videoId);
      const videoName = video?.name ?? 'Video';

      // Start per-video upload state (enables spinner for this row/sidebar)
      startUpload(videoId);

      try {
        await uploadCreative({ videoId, file, onProgress });
        // SUCCESS TOAST: Video record name + final status
        toast.success(`"${videoName}" uploaded. Status: Review`);
      } catch (error) {
        // FAILURE TOAST: Video record name + error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Upload failed for "${videoName}": ${errorMessage}`);
        throw error; // Re-throw to maintain error visibility
      } finally {
        // End per-video upload state (removes spinner)
        endUpload(videoId);
      }
    },
    [uploadCreative, toast, list.allRecords, startUpload, endUpload]
  );

  // Table upload handler (for VideoTable drag-drop)
  const handleTableUpload = useCallback(async (videoId: string, file: File) => {
    await handleUpload(videoId, file);
  }, [handleUpload]);

  // Decorate bulk actions with icons (UI concern lives in page)
  const actionIcons: Record<string, React.ReactNode> = {
    approve: <CheckCircleIcon fontSize="small" />,
    archive: <ArchiveIcon fontSize="small" />,
    delete: <DeleteIcon fontSize="small" />,
  };

  const decoratedActions = useMemo(
    () =>
      bulkActions.getVisibleActions(selectedVideos).map((action): BulkAction<VideoAsset> => ({
        ...action,
        icon: actionIcons[action.id],
      })),
    [bulkActions, selectedVideos]
  );

  // Derive empty state config (presentation only — no logic)
  const emptyStateConfig = useMemo(() => {
    // No videos exist at all
    if (list.totalCount === 0) {
      return {
        variant: 'default' as const,
        title: 'No videos yet',
        message: 'Videos will appear here once they are added to the system.',
        showAction: false,
      };
    }

    // Search active
    if (list.searchTerm) {
      return {
        variant: 'search' as const,
        title: 'No matching videos',
        message: `No videos match "${list.searchTerm}". Try a different search term.`,
        showAction: true,
      };
    }

    // Editor filter active
    if (list.filters.editorId) {
      const editorName = editorOptions.find(e => e.value === list.filters.editorId)?.label ?? 'this editor';
      return {
        variant: 'filter' as const,
        title: 'No videos for this editor',
        message: `${editorName} has no videos matching the current filters.`,
        showAction: true,
      };
    }

    // Product filter active
    if (list.filters.productId) {
      const productName = productOptions.find(p => p.value === list.filters.productId)?.label ?? 'this product';
      return {
        variant: 'filter' as const,
        title: 'No videos for this product',
        message: `${productName} has no videos matching the current filters.`,
        showAction: true,
      };
    }

    // Status filter active
    if (list.filters.status.length > 0) {
      const statusLabel = list.filters.status.length === 1
        ? STATUS_LABELS[list.filters.status[0]]
        : 'selected statuses';
      return {
        variant: 'filter' as const,
        title: `No ${statusLabel.toLowerCase()} videos`,
        message: `There are no videos with ${statusLabel.toLowerCase()} status.`,
        showAction: true,
      };
    }

    // Default filter case
    return {
      variant: 'filter' as const,
      title: 'No matching videos',
      message: 'No videos match the current filters.',
      showAction: true,
    };
  }, [list.totalCount, list.searchTerm, list.filters, editorOptions, productOptions]);

  return (
    <Box data-component="video-editor-page" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Page Header */}
      <Box
        component="header"
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignSelf: 'stretch' }}>
          <Box>
            {/* Title row with Ops badge */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Video Editor Portal
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Manage and track video production across all products
            </Typography>
          </Box>

          {/* Status filter pills — sit directly under the title to fill the header */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <StatusPill
              status="all"
              label="All"
              active={activeStatus === null}
              onClick={() => list.setFilters({ ...list.filters, status: [] })}
              sx={activeStatus === null ? solidFillSx('#475569') : undefined}
            />
            <StatusPill
              status="todo"
              label={STATUS_LABELS.todo}
              active={activeStatus === 'todo'}
              onClick={() => handleStatusCardClick('todo')}
              sx={activeStatus === 'todo' ? solidFillSx(getStatusColors('todo').text) : undefined}
            />
            <StatusPill
              status="review"
              label={STATUS_LABELS.review}
              active={activeStatus === 'review'}
              onClick={() => handleStatusCardClick('review')}
              sx={activeStatus === 'review' ? solidFillSx(getStatusColors('review').text) : undefined}
            />
            <StatusPill
              status="available"
              label={STATUS_LABELS.available}
              active={activeStatus === 'available'}
              onClick={() => handleStatusCardClick('available')}
              sx={activeStatus === 'available' ? solidFillSx(getStatusColors('available').text) : undefined}
            />
            <StatusPill
              status="used"
              label={STATUS_LABELS.used}
              active={activeStatus === 'used'}
              onClick={() => handleStatusCardClick('used')}
              sx={activeStatus === 'used' ? solidFillSx(getStatusColors('used').text) : undefined}
            />
          </Box>

          {/* "Scripts left to do" backlog — personal to one editor, so only shown when a
              specific editor is selected. Hidden on "All Editors" (where a personal count
              would contradict the all-editors table). Pinned to the bottom of the space. */}
          {list.filters.editorId && (
            <Box sx={{ mt: 'auto' }}>
              <EditorToDoBanner
                editorId={list.filters.editorId}
                onClick={() => list.setFilters({ ...list.filters, status: ['todo'] })}
              />
            </Box>
          )}
        </Box>

        {/* Monthly stats module (top-right) — shows the selected/logged-in editor's data */}
        {statsEditorId && <EditorMonthlyStats editorId={statsEditorId} />}
      </Box>

      {/* Editor performance summary — shows only their own data */}
      {user.role === 'editor' && user.userId && (
        <VideoEditorsTab editorId={user.userId} />
      )}

      {/* Toolbar Section */}
      <Paper component="section" variant="outlined" sx={{ overflow: 'hidden', px: 1.5, py: 0.25 }}>
        <ListToolbar
          editorOptions={editorOptions}
          selectedEditor={list.filters.editorId}
          onEditorChange={handleEditorChange}

          productOptions={productOptions}
          selectedProduct={list.filters.productId}
          onProductChange={handleProductChange}
          searchTerm={list.searchTerm}
          onSearchChange={list.setSearchTerm}
          searchPlaceholder="Search videos..."
          hasSelection={list.hasSelection}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          bulkActions={
            list.hasSelection ? (
              <Chip
                label={`${list.selection.size} selected`}
                size="small"
                onDelete={list.clearSelection}
              />
            ) : undefined
          }
          filters={
            viewMode === 'table' ? (
              <>
                <Tooltip title="More filters">
                  <Badge
                    badgeContent={moreFiltersCount}
                    color="primary"
                    invisible={moreFiltersCount === 0}
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => setMoreFiltersAnchor(e.currentTarget)}
                      sx={{
                        bgcolor: moreFiltersCount > 0 ? 'primary.50' : 'grey.100',
                        borderRadius: 1,
                        '&:hover': { bgcolor: moreFiltersCount > 0 ? 'primary.100' : 'grey.200' },
                      }}
                    >
                      <FilterListIcon fontSize="small" />
                    </IconButton>
                  </Badge>
                </Tooltip>

                {/* Group by scripts toggle — folds variant rows into one row per script */}
                <Tooltip title="Group by scripts">
                  <Button
                    size="small"
                    onClick={() => setGroupByScripts((v) => !v)}
                    startIcon={<LayersIcon fontSize="small" />}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 1,
                      color: groupByScripts ? 'primary.main' : 'text.secondary',
                      bgcolor: groupByScripts ? 'primary.50' : 'grey.100',
                      '&:hover': { bgcolor: groupByScripts ? 'primary.100' : 'grey.200' },
                    }}
                  >
                    Group by scripts
                  </Button>
                </Tooltip>

                {/* More Filters Popover */}
                <Popover
                  open={Boolean(moreFiltersAnchor)}
                  anchorEl={moreFiltersAnchor}
                  onClose={() => setMoreFiltersAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  slotProps={{
                    paper: {
                      sx: { p: 2.5, minWidth: 280 },
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      More Filters
                    </Typography>
                    <IconButton size="small" onClick={() => setMoreFiltersAnchor(null)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Format Filter */}
                  <FormControl component="fieldset" sx={{ mb: 2.5, display: 'block' }}>
                    <FormLabel
                      component="legend"
                      sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary' }}
                    >
                      Format
                    </FormLabel>
                    <ToggleButtonGroup
                      value={list.filters.format}
                      onChange={handleFormatChange}
                      size="small"
                      sx={{ flexWrap: 'wrap', gap: 0.5 }}
                    >
                      <ToggleButton value="square" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
                        Square
                      </ToggleButton>
                      <ToggleButton value="vertical" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
                        Vertical
                      </ToggleButton>
                      <ToggleButton value="youtube" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
                        YouTube
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </FormControl>

                  {/* Text Version Filter */}
                  <FormControl component="fieldset" sx={{ display: 'block' }}>
                    <FormLabel
                      component="legend"
                      sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 1, color: 'text.secondary' }}
                    >
                      Text Version
                    </FormLabel>
                    <ToggleButtonGroup
                      value={list.filters.textVersion}
                      onChange={handleTextVersionChange}
                      size="small"
                      sx={{ flexWrap: 'wrap', gap: 0.5 }}
                    >
                      <ToggleButton value="text" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
                        Text
                      </ToggleButton>
                      <ToggleButton value="no-text" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
                        No Text
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </FormControl>

                  {/* Clear button */}
                  {moreFiltersCount > 0 && (
                    <Button
                      size="small"
                      onClick={() => {
                        list.setFilters({ ...list.filters, format: [], textVersion: [] });
                      }}
                      sx={{ mt: 2, fontSize: '0.75rem' }}
                    >
                      Clear these filters
                    </Button>
                  )}
                </Popover>
              </>
            ) : undefined
          }
        />
      </Paper>

      {/* Content Area */}
      <Box component="main">
        {list.visibleRecords.length === 0 ? (
          <EmptyState
            variant={emptyStateConfig.variant}
            title={emptyStateConfig.title}
            message={emptyStateConfig.message}
            action={emptyStateConfig.showAction ? {
              label: 'Clear All Filters',
              onClick: handleClearFilters,
            } : undefined}
          />
        ) : viewMode === 'table' ? (
          groupByScripts ? (
            <ScriptGroupedTable
              videos={list.filteredRecords}
              columns={defaultVideoColumns}
              onVideoClick={handleVideoClick}
              scriptCounts={scriptCounts}
            />
          ) : (
            <VideoTable
              videos={list.visibleRecords}
              columns={defaultVideoColumns}
              onVideoClick={handleVideoClick}
              selection={{
                selected: list.selection,
                isSelected: list.isSelected,
                toggleSelection: list.toggleSelection,
                selectAll: list.selectAll,
                clearSelection: list.clearSelection,
                hasSelection: list.hasSelection,
              }}
              sort={list.sort}
              onSort={list.handleSort}
              canUpload={canUploadToVideo}
              onUpload={handleTableUpload}
              uploadingIds={uploadingVideoIds}
            />
          )
        ) : (
          <ScriptProductionGrid
            videos={list.allRecords}
            onVideoClick={handleVideoClick}
            onUpload={handleUpload}
            canUploadToVideo={canUploadToVideo}
            activeStatus={activeStatus}
            editorId={list.filters.editorId}
            productId={list.filters.productId}
            searchTerm={list.searchTerm}
          />
        )}
      </Box>

      {/* Results Count & Pagination Footer (flat table only — grid and grouped views paginate themselves) */}
      {viewMode === 'table' && !groupByScripts && (
        <Box
          component="footer"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {list.filteredCount === 0
                ? 'No videos'
                : `Showing ${list.pageIndex * list.pageSize + 1}–${list.pageIndex * list.pageSize + list.visibleRecords.length} of ${list.filteredCount} videos`}
            </Typography>
            <RowsPerPageSelect
              value={list.pageSize}
              onChange={(n) => {
                list.setPageIndex(0); // reset to first page so the slice stays valid
                list.setPageSize(n);
              }}
            />
          </Box>
          <ListPagination
            pageIndex={list.pageIndex}
            totalPages={list.totalPages}
            onPageChange={list.setPageIndex}
          />
        </Box>
      )}

      {/* Video Detail Panel */}
      <VideoDetailPanel
        video={selectedVideo}
        open={selectedVideoId !== null}
        onClose={handlePanelClose}
        onSave={handleVideoSave}
        onUpload={handleUpload}
        isUploading={selectedVideoId ? isVideoUploading(selectedVideoId) : false}
        editorOptions={editorOptions.filter((o): o is { value: string; label: string } => o.value !== null)}
        productOptions={productOptions.filter((o): o is { value: string; label: string } => o.value !== null)}
        onViewScript={handleViewScript}
        canUpload={selectedVideo ? canUploadToVideo(selectedVideo) : false}
      />

      {/* Script View Dialog */}
      <AppDialog
        open={scriptDialogOpen}
        onClose={() => setScriptDialogOpen(false)}
        title={selectedVideo?.script.name ?? 'Script'}
        size="md"
        actions={
          <Button onClick={() => setScriptDialogOpen(false)} variant="outlined" color="inherit">
            Close
          </Button>
        }
      >
        <Typography
          component="pre"
          sx={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            lineHeight: 1.7,
            m: 0,
            color: 'text.primary',
          }}
        >
          {selectedVideo?.scriptContent || 'No script content available'}
        </Typography>
      </AppDialog>

      {/* Bulk Action Bar - Hidden for editors */}
      {user.role !== 'editor' && (
        <BulkActionBar
          selectedCount={list.selection.size}
          selectedItems={selectedVideos}
          actions={decoratedActions}
          onClearSelection={list.clearSelection}
          isExecuting={bulkActions.isExecuting}
          executingActionId={bulkActions.executingActionId}
          onExecuteAction={bulkActions.executeAction}
          isActionDisabled={bulkActions.isActionDisabled}
          countLabel={(count) => `${count} video${count !== 1 ? 's' : ''} selected`}
        />
      )}
    </Box>
  );
}
