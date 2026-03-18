/**
 * Script Production Grid Component
 *
 * Displays videos grouped by (Script × Editor) with 6 deterministic slots per card.
 *
 * Layout: 2 rows × 3 columns
 *   Columns: Square | Vertical | YouTube
 *   Rows: Text | No Text
 *
 * Slot Behavior (normalized - all 6 slots behave identically):
 * - All slots are always interactive (pointer cursor)
 * - CLICK: Opens sidebar for that video (if exists)
 * - DRAG & DROP: Triggers upload immediately (does NOT open sidebar)
 * - Only 1 video per slot
 *
 * Slot State Display:
 * - Pills show ONLY state: "To Do", "Review", "Available", "Used"
 * - NO action labels (Upload, View, Replace)
 *
 * Slot Background:
 * - Binary: Highlighted (matches active tab) or Neutral
 * - NOT color-coded by state
 *
 * Upload permissions (implicit, not displayed):
 * - To Do: Can upload (new file)
 * - Review: Can upload (replace existing file)
 * - Available/Used: No upload allowed
 */

import { useMemo, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import type { VideoAsset, VideoFormat, VideoStatus } from '../../features/videos/types';
import type { UploadProgress } from '../../features/videos/drive';
import { STATUS_LABELS } from '../../features/videos/status';
import {
  getStatusPillStyle,
  getEditorPillStyle,
  getProductPillStyle,
  basePillSx,
  NEUTRAL_PILL,
  type StatusKey,
} from '../../ui';
import {
  gridEmptyStateSx,
  gridContainerSx,
  gridPaginationSx,
  gridPaginationInfoSx,
  gridPaginationButtonsSx,
  getGridPaginationButtonSx,
  gridPaginationCounterSx,
  gridCardSx,
  gridCardHeaderSx,
  gridCardTitleSx,
  gridPillContainerSx,
  gridProductPillSx,
  gridProductDotSx,
  gridEditorPillSx,
  gridSlotAreaSx,
  gridSlotRowSx,
  gridSlotRowWithMarginSx,
  gridColHeaderSx,
  getSlotTileSx,
  slotRowLabelSx,
  slotProgressContainerSx,
  slotProgressBarBgSx,
  getSlotProgressBarFillSx,
  slotProgressTextContainerSx,
  slotProgressTextSx,
  slotErrorContainerSx,
  slotErrorMessageSx,
} from './styles';

// =============================================================================
// GRID DATA MODEL
// =============================================================================

export type SlotKey =
  | 'square-text'
  | 'square-notext'
  | 'vertical-text'
  | 'vertical-notext'
  | 'youtube-text'
  | 'youtube-notext';

export const SLOT_DEFINITIONS: {
  key: SlotKey;
  format: VideoFormat;
  hasText: boolean;
  label: string;
  columnLabel: string;
  rowLabel: string;
}[] = [
    { key: 'square-text', format: 'square', hasText: true, label: 'Square + Text', columnLabel: 'Square', rowLabel: 'Text' },
    { key: 'vertical-text', format: 'vertical', hasText: true, label: 'Vertical + Text', columnLabel: 'Vertical', rowLabel: 'Text' },
    { key: 'youtube-text', format: 'youtube', hasText: true, label: 'YouTube + Text', columnLabel: 'YouTube', rowLabel: 'Text' },
    { key: 'square-notext', format: 'square', hasText: false, label: 'Square + No Text', columnLabel: 'Square', rowLabel: 'No Text' },
    { key: 'vertical-notext', format: 'vertical', hasText: false, label: 'Vertical + No Text', columnLabel: 'Vertical', rowLabel: 'No Text' },
    { key: 'youtube-notext', format: 'youtube', hasText: false, label: 'YouTube + No Text', columnLabel: 'YouTube', rowLabel: 'No Text' },
  ];

export interface SlotState {
  slot: typeof SLOT_DEFINITIONS[number];
  videos: VideoAsset[];
  hasError: boolean;
}

export interface GridCard {
  scriptId: string;
  scriptName: string;
  editorId: string;
  editorName: string;
  productId: string;
  productName: string;
  slots: SlotState[];
  totalFilled: number;
  hasErrors: boolean;
  allUsed: boolean;
}

// =============================================================================
// GRID LOGIC
// =============================================================================

function getSlotKey(format: VideoFormat, hasText: boolean): SlotKey {
  return `${format}-${hasText ? 'text' : 'notext'}` as SlotKey;
}

function getSlotStatus(slotState: SlotState): VideoStatus {
  if (slotState.videos.length === 0) {
    return 'todo';
  }
  return slotState.videos[0].status;
}

/**
 * Check if upload/replace is allowed for a given status.
 * - To Do: Can upload (new file)
 * - Review: Can replace (existing file)
 * - Available/Used: No upload allowed
 */
function canUploadForStatus(status: VideoStatus): boolean {
  return status === 'todo' || status === 'review';
}

export function buildGridCards(videos: VideoAsset[]): GridCard[] {
  const cardMap = new Map<string, {
    videos: VideoAsset[];
    script: { id: string; name: string };
    editor: { id: string; name: string };
    product: { id: string; name: string }
  }>();

  for (const video of videos) {
    const key = `${video.script.id}::${video.editor.id}`;
    if (!cardMap.has(key)) {
      cardMap.set(key, {
        videos: [],
        script: video.script,
        editor: video.editor,
        product: video.product,
      });
    }
    cardMap.get(key)!.videos.push(video);
  }

  const cards: GridCard[] = [];

  for (const [, group] of cardMap) {
    const slotMap = new Map<SlotKey, VideoAsset[]>();
    for (const slotDef of SLOT_DEFINITIONS) {
      slotMap.set(slotDef.key, []);
    }

    for (const video of group.videos) {
      const slotKey = getSlotKey(video.format, video.hasText);
      slotMap.get(slotKey)?.push(video);
    }

    const slots: SlotState[] = SLOT_DEFINITIONS.map((slotDef) => {
      const videosInSlot = slotMap.get(slotDef.key) ?? [];
      return {
        slot: slotDef,
        videos: videosInSlot,
        hasError: videosInSlot.length > 1,
      };
    });

    const totalFilled = slots.filter((s) => s.videos.length > 0).length;
    const hasErrors = slots.some((s) => s.hasError);
    const allUsed = slots.every((s) => getSlotStatus(s) === 'used');

    cards.push({
      scriptId: group.script.id,
      scriptName: group.script.name,
      editorId: group.editor.id,
      editorName: group.editor.name,
      productId: group.product.id,
      productName: group.product.name,
      slots,
      totalFilled,
      hasErrors,
      allUsed,
    });
  }

  cards.sort((a, b) => {
    const scriptCompare = a.scriptName.localeCompare(b.scriptName);
    if (scriptCompare !== 0) return scriptCompare;
    return a.editorName.localeCompare(b.editorName);
  });

  return cards;
}

// =============================================================================
// COMPONENT
// =============================================================================

const CARDS_PER_PAGE = 12;

interface ScriptProductionGridProps {
  /** ALL videos (grid handles its own filtering) */
  videos: VideoAsset[];
  onVideoClick?: (video: VideoAsset) => void;
  /** Upload handler - accepts progress callback for real-time progress updates */
  onUpload?: (
    videoId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ) => Promise<void>;
  /** Permission check: Can current user upload to this video? */
  canUploadToVideo?: (video: VideoAsset) => boolean;
  /** Active status tab - cards with ANY slot matching this status are shown */
  activeStatus?: VideoStatus | null;
  /** Filter by editor ID */
  editorId?: string | null;
  /** Filter by product ID */
  productId?: string | null;
  /** Search term */
  searchTerm?: string;
}

/**
 * Check if a card has ANY slot matching the given status.
 * Used to determine card placement in status tabs.
 */
function cardHasStatus(card: GridCard, status: VideoStatus): boolean {
  return card.slots.some((slot) => getSlotStatus(slot) === status);
}

export function ScriptProductionGrid({
  videos,
  onVideoClick,
  onUpload,
  canUploadToVideo,
  activeStatus = null,
  editorId = null,
  productId = null,
  searchTerm = '',
}: ScriptProductionGridProps) {
  // Build ALL cards from ALL videos
  const allCards = useMemo(() => buildGridCards(videos), [videos]);

  // Card pagination state
  const [cardPageIndex, setCardPageIndex] = useState(0);

  // Filter cards based on:
  // 1. Editor filter (matches card's editor)
  // 2. Product filter (matches card's product)
  // 3. Search term (matches script name, editor name, or product name)
  // 4. Active status (card has ANY slot with this status)
  const filteredCards = useMemo(() => {
    let result = allCards;

    // Editor filter
    if (editorId) {
      result = result.filter((card) => card.editorId === editorId);
    }

    // Product filter
    if (productId) {
      result = result.filter((card) => card.productId === productId);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (card) =>
          card.scriptName.toLowerCase().includes(term) ||
          card.editorName.toLowerCase().includes(term) ||
          card.productName.toLowerCase().includes(term)
      );
    }

    // Status filter - card appears if ANY slot has the active status
    if (activeStatus) {
      result = result.filter((card) => cardHasStatus(card, activeStatus));
    }

    return result;
  }, [allCards, editorId, productId, searchTerm, activeStatus]);

  // Reset pagination when filters change
  useMemo(() => {
    setCardPageIndex(0);
  }, [editorId, productId, searchTerm, activeStatus]);

  // Paginate filtered cards
  const totalCards = filteredCards.length;
  const totalPages = Math.ceil(totalCards / CARDS_PER_PAGE);
  const paginatedCards = useMemo(() => {
    const start = cardPageIndex * CARDS_PER_PAGE;
    return filteredCards.slice(start, start + CARDS_PER_PAGE);
  }, [filteredCards, cardPageIndex]);

  // Track uploading slots
  const [uploadingSlots, setUploadingSlots] = useState<Set<string>>(new Set());
  // Track upload progress per slot (percentage 0-100)
  const [slotProgress, setSlotProgress] = useState<Map<string, number>>(new Map());
  // Track error messages
  const [slotErrors, setSlotErrors] = useState<Map<string, string>>(new Map());

  const handleSlotUpload = useCallback(
    async (video: VideoAsset, file: File, slotUniqueKey: string) => {
      if (!onUpload) return;

      // Set uploading state and clear any previous errors/progress
      setUploadingSlots((prev) => new Set(prev).add(slotUniqueKey));
      setSlotProgress((prev) => {
        const next = new Map(prev);
        next.set(slotUniqueKey, 0);
        return next;
      });
      setSlotErrors((prev) => {
        const next = new Map(prev);
        next.delete(slotUniqueKey);
        return next;
      });

      // Progress callback for real-time updates
      const handleProgress = (progress: UploadProgress) => {
        setSlotProgress((prev) => {
          const next = new Map(prev);
          next.set(slotUniqueKey, progress.percentage);
          return next;
        });
      };

      try {
        await onUpload(video.id, file, handleProgress);
        // Success: uploading state cleared, UI updates when videos prop changes
      } catch (error) {
        // Failure: show error
        setSlotErrors((prev) => {
          const next = new Map(prev);
          next.set(slotUniqueKey, error instanceof Error ? error.message : 'Upload failed');
          return next;
        });
      } finally {
        setUploadingSlots((prev) => {
          const next = new Set(prev);
          next.delete(slotUniqueKey);
          return next;
        });
        setSlotProgress((prev) => {
          const next = new Map(prev);
          next.delete(slotUniqueKey);
          return next;
        });
      }
    },
    [onUpload]
  );

  if (paginatedCards.length === 0) {
    return (
      <Box sx={gridEmptyStateSx}>
        No scripts to display.
      </Box>
    );
  }

  return (
    <Box>
      {/* Card Grid */}
      <Box sx={gridContainerSx}>
        {paginatedCards.map((card) => (
          <GridCardComponent
            key={`${card.scriptId}::${card.editorId}`}
            card={card}
            onVideoClick={onVideoClick}
            onSlotUpload={onUpload ? handleSlotUpload : undefined}
            canUploadToVideo={canUploadToVideo}
            uploadingSlots={uploadingSlots}
            slotProgress={slotProgress}
            slotErrors={slotErrors}
            activeStatus={activeStatus}
          />
        ))}
      </Box>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <Box sx={gridPaginationSx}>
          <Box component="span" sx={gridPaginationInfoSx}>
            Showing {paginatedCards.length} of {totalCards} scripts
          </Box>
          <Box sx={gridPaginationButtonsSx}>
            <Box
              component="button"
              onClick={() => setCardPageIndex((p) => Math.max(0, p - 1))}
              disabled={cardPageIndex === 0}
              sx={getGridPaginationButtonSx(cardPageIndex === 0)}
            >
              Previous
            </Box>
            <Box component="span" sx={gridPaginationCounterSx}>
              {cardPageIndex + 1} / {totalPages}
            </Box>
            <Box
              component="button"
              onClick={() => setCardPageIndex((p) => Math.min(totalPages - 1, p + 1))}
              disabled={cardPageIndex >= totalPages - 1}
              sx={getGridPaginationButtonSx(cardPageIndex >= totalPages - 1)}
            >
              Next
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// =============================================================================
// GRID CARD COMPONENT
// =============================================================================

interface GridCardComponentProps {
  card: GridCard;
  onVideoClick?: (video: VideoAsset) => void;
  onSlotUpload?: (video: VideoAsset, file: File, slotUniqueKey: string) => void;
  canUploadToVideo?: (video: VideoAsset) => boolean;
  uploadingSlots: Set<string>;
  slotProgress: Map<string, number>;
  slotErrors: Map<string, string>;
  activeStatus: VideoStatus | null;
}

function GridCardComponent({
  card,
  onVideoClick,
  onSlotUpload,
  canUploadToVideo,
  uploadingSlots,
  slotProgress,
  slotErrors,
  activeStatus,
}: GridCardComponentProps) {
  const cardKey = `${card.scriptId}::${card.editorId}`;

  // Get pill styles from shared UI system
  const productPillStyle = getProductPillStyle(card.productId);
  const editorPillStyle = getEditorPillStyle(card.editorId);

  return (
    <Box sx={gridCardSx}>
      {/* Header: Title left, Pills right */}
      <Box sx={gridCardHeaderSx}>
        {/* Title - left */}
        <Box sx={gridCardTitleSx}>
          {card.scriptName}
        </Box>
        {/* Pills - right */}
        <Box sx={gridPillContainerSx}>
          {/* Product pill with colored dot */}
          <Box
            component="span"
            sx={{
              ...gridProductPillSx as object,
              bgcolor: productPillStyle.backgroundColor,
              color: productPillStyle.color,
            }}
          >
            <Box
              component="span"
              sx={{
                ...gridProductDotSx as object,
                bgcolor: productPillStyle.dotColor,
              }}
            />
            {card.productName}
          </Box>
          {/* Editor pill - deterministic color */}
          <Box
            component="span"
            sx={{
              ...gridEditorPillSx as object,
              bgcolor: editorPillStyle.backgroundColor,
              color: editorPillStyle.color,
            }}
          >
            {card.editorName}
          </Box>
        </Box>
      </Box>

      {/* Slot Grid */}
      <Box sx={gridSlotAreaSx}>
        {/* Column Headers */}
        <Box sx={gridSlotRowWithMarginSx}>
          <Typography sx={gridColHeaderSx}>Square</Typography>
          <Typography sx={gridColHeaderSx}>Vertical</Typography>
          <Typography sx={gridColHeaderSx}>YouTube</Typography>
        </Box>

        {/* Row 1: Text */}
        <Box sx={gridSlotRowWithMarginSx}>
          {card.slots.slice(0, 3).map((slotState) => {
            const slotUniqueKey = `${cardKey}::${slotState.slot.key}`;
            const slotStatus = getSlotStatus(slotState);
            return (
              <SlotTile
                key={slotState.slot.key}
                slotState={slotState}
                rowLabel="Text"
                onVideoClick={onVideoClick}
                onUpload={onSlotUpload}
                canUploadToVideo={canUploadToVideo}
                slotUniqueKey={slotUniqueKey}
                isUploading={uploadingSlots.has(slotUniqueKey)}
                uploadProgress={slotProgress.get(slotUniqueKey)}
                errorMessage={slotErrors.get(slotUniqueKey)}
                isEmphasized={activeStatus === slotStatus}
                isFaded={activeStatus !== null && activeStatus !== slotStatus}
              />
            );
          })}
        </Box>

        {/* Row 2: No Text */}
        <Box sx={gridSlotRowSx}>
          {card.slots.slice(3, 6).map((slotState) => {
            const slotUniqueKey = `${cardKey}::${slotState.slot.key}`;
            const slotStatus = getSlotStatus(slotState);
            return (
              <SlotTile
                key={slotState.slot.key}
                slotState={slotState}
                rowLabel="No Text"
                onVideoClick={onVideoClick}
                onUpload={onSlotUpload}
                canUploadToVideo={canUploadToVideo}
                slotUniqueKey={slotUniqueKey}
                isUploading={uploadingSlots.has(slotUniqueKey)}
                uploadProgress={slotProgress.get(slotUniqueKey)}
                errorMessage={slotErrors.get(slotUniqueKey)}
                isEmphasized={activeStatus === slotStatus}
                isFaded={activeStatus !== null && activeStatus !== slotStatus}
              />
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

// =============================================================================
// SLOT TILE COMPONENT
// =============================================================================

interface SlotTileProps {
  slotState: SlotState;
  rowLabel: string;
  onVideoClick?: (video: VideoAsset) => void;
  onUpload?: (video: VideoAsset, file: File, slotUniqueKey: string) => void;
  /** Permission check: Can current user upload to this video? */
  canUploadToVideo?: (video: VideoAsset) => boolean;
  slotUniqueKey: string;
  isUploading: boolean;
  /** Upload progress percentage (0-100) */
  uploadProgress?: number;
  errorMessage?: string;
  /** Slot is emphasized (matches active tab) */
  isEmphasized?: boolean;
  /** Slot is faded (does not match active tab) */
  isFaded?: boolean;
}

function SlotTile({
  slotState,
  rowLabel,
  onVideoClick,
  onUpload,
  canUploadToVideo,
  slotUniqueKey,
  isUploading,
  uploadProgress,
  errorMessage,
  isEmphasized = false,
  isFaded = false,
}: SlotTileProps) {
  const { videos, hasError } = slotState;
  const video = videos[0];
  const status: VideoStatus = video ? video.status : 'todo';

  // Can upload via drag & drop if:
  // - Video exists (has Airtable record)
  // - User has permission (or fallback to status-based check)
  // - Not currently uploading
  // - Upload handler provided
  const canUpload = video && (canUploadToVideo ? canUploadToVideo(video) : canUploadForStatus(video.status));
  const canDrop = canUpload && !isUploading && !!onUpload;

  // Drag state
  const [isDragOver, setIsDragOver] = useState(false);

  // CLICK: Opens sidebar if video exists (does NOT trigger upload)
  const handleClick = () => {
    if (isUploading) return;
    if (video && onVideoClick) {
      onVideoClick(video);
    }
  };

  // DRAG & DROP: Triggers upload (does NOT open sidebar)
  const handleDragOver = (e: React.DragEvent) => {
    if (!canDrop) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!canDrop || !video || !onUpload) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUpload(video, file, slotUniqueKey);
    }
  };

  // Status label and colors from centralized UI system
  const statusLabel = STATUS_LABELS[status];
  const statusPillColors = getStatusPillStyle(status as StatusKey);

  const tileSx = getSlotTileSx({ isDragOver, canDrop: !!canDrop, isUploading, isEmphasized, isFaded });

  return (
    <Box
      sx={tileSx}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Row label - top left, muted */}
      <Box sx={slotRowLabelSx}>
        {rowLabel}
      </Box>

      {/* Content - centered */}
      {isUploading ? (
        // Upload progress display
        <Box sx={slotProgressContainerSx}>
          {/* Progress bar */}
          <Box sx={slotProgressBarBgSx}>
            <Box sx={getSlotProgressBarFillSx(uploadProgress ?? 0)} />
          </Box>
          {/* Progress text */}
          <Box sx={slotProgressTextContainerSx}>
            <CircularProgress size={12} />
            <Box component="span" sx={slotProgressTextSx}>
              {uploadProgress !== undefined ? `${uploadProgress}%` : 'Uploading...'}
            </Box>
          </Box>
        </Box>
      ) : errorMessage ? (
        // Error state
        <Box sx={slotErrorContainerSx}>
          <Box component="span" sx={{ ...basePillSx as object, bgcolor: NEUTRAL_PILL.bg, color: NEUTRAL_PILL.text }}>Error</Box>
          <Box sx={slotErrorMessageSx}>
            {errorMessage.length > 25 ? errorMessage.slice(0, 25) + '...' : errorMessage}
          </Box>
        </Box>
      ) : hasError ? (
        // Duplicate error
        <Box component="span" sx={{ ...basePillSx as object, mt: 0.5, bgcolor: '#fef2f2', color: 'error.main' }}>
          {videos.length} Dup
        </Box>
      ) : isDragOver && canDrop ? (
        // Drag hover state - show action hint (warm amber)
        <Box component="span" sx={{ ...basePillSx as object, mt: 0.5, bgcolor: '#fef3c7', color: '#92400e' }}>
          Drop File
        </Box>
      ) : (
        // Normal state: Status pill (no border, colors only)
        <Box
          component="span"
          sx={{
            ...basePillSx as object,
            mt: 0.5,
            bgcolor: statusPillColors.backgroundColor,
            color: statusPillColors.color,
          }}
        >
          {statusLabel}
        </Box>
      )}
    </Box>
  );
}
