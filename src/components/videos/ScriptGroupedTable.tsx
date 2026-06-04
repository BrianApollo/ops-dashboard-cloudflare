/**
 * ScriptGroupedTable — the video table collapsed into one row per script.
 *
 * Self-contained alternate view used when "Group by scripts" is on. Variants
 * (same script.id) are folded into a single expandable group row showing the
 * script name + how many variants are uploaded. Expanding reveals the variant
 * rows, rendered with the SAME column definitions as the flat VideoTable so they
 * look identical.
 *
 * Kept separate from VideoTable on purpose — zero changes to the flat table.
 */

import { Fragment, useEffect, useMemo, useState } from 'react';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import type { VideoAsset } from '../../features/videos/types';
import type { VideoTableColumn } from './VideoTable';
import { tableHeaderCellSx, tableDataCellSx } from '../products/composition/styles';
import { ListPagination, RowsPerPageSelect } from '../../core/list';

interface ScriptGroup {
  scriptId: string;
  scriptName: string;
  videos: VideoAsset[];
  uploaded: number; // variants no longer in 'todo'
}

/** Group videos by script.id, preserving first-seen order. */
function groupByScript(videos: VideoAsset[]): ScriptGroup[] {
  const groups = new Map<string, ScriptGroup>();
  for (const v of videos) {
    let g = groups.get(v.script.id);
    if (!g) {
      g = { scriptId: v.script.id, scriptName: v.script.name, videos: [], uploaded: 0 };
      groups.set(v.script.id, g);
    }
    g.videos.push(v);
    if (v.status !== 'todo') g.uploaded += 1;
  }
  return Array.from(groups.values());
}

export interface ScriptGroupedTableProps {
  videos: VideoAsset[];
  columns: VideoTableColumn[];
  onVideoClick: (video: VideoAsset) => void;
  /**
   * True per-script upload counts (done/total) from the Video Scripts table,
   * keyed by script.id. These reflect ALL of a script's videos, independent of
   * the current page filter. Falls back to the filtered rows when missing.
   */
  scriptCounts?: Record<string, { done: number; total: number }>;
}

export function ScriptGroupedTable({ videos, columns, onVideoClick, scriptCounts }: ScriptGroupedTableProps) {
  const groups = useMemo(() => groupByScript(videos), [videos]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Paginate by SCRIPTS (not variants), over the full filtered set.
  const [groupPage, setGroupPage] = useState(0);
  const [groupsPerPage, setGroupsPerPage] = useState(25);
  const totalPages = Math.ceil(groups.length / groupsPerPage);
  // Reset to the first page when the filtered set changes (e.g. editor/status filter).
  useEffect(() => setGroupPage(0), [groups.length]);
  const safePage = totalPages > 0 ? Math.min(groupPage, totalPages - 1) : 0;
  const start = safePage * groupsPerPage;
  const pagedGroups = groups.slice(start, start + groupsPerPage);

  const toggle = (scriptId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(scriptId)) next.delete(scriptId);
      else next.add(scriptId);
      return next;
    });

  return (
    <Box>
    <TableContainer
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.field} sx={{ ...tableHeaderCellSx, whiteSpace: 'nowrap' }}>
                {column.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pagedGroups.map((group) => {
            const isOpen = expanded.has(group.scriptId);
            // True counts come from the Video Scripts table (all videos); fall
            // back to the filtered rows only if the script isn't in the lookup.
            const counts = scriptCounts?.[group.scriptId];
            const total = counts?.total ?? group.videos.length;
            const done = counts?.done ?? group.uploaded;
            const complete = total > 0 && done >= total;
            return (
              <Fragment key={group.scriptId}>
                {/* Group header row */}
                <TableRow
                  hover
                  onClick={() => toggle(group.scriptId)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell colSpan={columns.length} sx={{ ...tableDataCellSx, py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton size="small" sx={{ p: 0 }}>
                        {isOpen ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                      </IconButton>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {group.scriptName}
                      </Typography>
                      <Box sx={{ flex: 1 }} />
                      <Chip
                        size="small"
                        label={`${done}/${total} uploaded`}
                        color={complete ? 'success' : 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {total} variant{total !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>

                {/* Variant rows (only when expanded) */}
                {isOpen &&
                  group.videos.map((video) => (
                    <TableRow
                      key={video.id}
                      hover
                      onClick={() => onVideoClick(video)}
                      sx={{ cursor: 'pointer' }}
                    >
                      {columns.map((column, idx) => (
                        <TableCell key={column.field} sx={{ ...tableDataCellSx, ...(idx === 0 ? { pl: 5 } : null) }}>
                          {column.render(video)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>

      {/* Footer: script count + per-page + group-level pagination */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, pt: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {groups.length} script{groups.length !== 1 ? 's' : ''}
          </Typography>
          <RowsPerPageSelect
            value={groupsPerPage}
            onChange={(n) => {
              setGroupPage(0); // reset to first page so the slice stays valid
              setGroupsPerPage(n);
            }}
          />
        </Box>
        <ListPagination
          pageIndex={safePage}
          totalPages={totalPages}
          onPageChange={setGroupPage}
        />
      </Box>
    </Box>
  );
}
