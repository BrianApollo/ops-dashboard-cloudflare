/**
 * AIVideosTab - AI Videos list with status filter pills, search, and pagination.
 * Uses useListController in direct mode for filter/search/pagination state.
 */

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useListController, FilterPills, ListPagination } from '../../core/list';
import { EmptyState } from '../../core/state';
import { matchesAllTokens } from '../../utils';
import { tableHeaderCellSx, tableDataCellSx } from '../products/composition/styles';
import { StatusPill } from '../../ui';
import type { AIVideo } from '../../features/ai-videos/data';

type AIVideoStatus = 'Available' | 'Used';

interface AIVideoFilters {
  status: AIVideoStatus | null;
}

interface AIVideosTabProps {
  aiVideos: AIVideo[];
  isLoading: boolean;
  productSelected: boolean;
}

const STATUS_MAP: Record<string, { key: 'available' | 'used'; label: string }> = {
  'Available': { key: 'available', label: 'Available' },
  'Used': { key: 'used', label: 'Used' },
};

export function AIVideosTab({ aiVideos, isLoading, productSelected }: AIVideosTabProps) {
  const list = useListController<AIVideo, AIVideoFilters>({
    records: aiVideos,
    initialFilters: { status: null },
    initialPageSize: 20,
    filterFn: (records, filters) =>
      filters.status ? records.filter((v) => v.status === filters.status) : records,
    searchFn: (records, searchTerm) => {
      if (!searchTerm.trim()) return records;
      return records.filter((v) => matchesAllTokens(searchTerm, v.name));
    },
  });

  // Derive status counts
  const statusCounts = {
    'Available': list.allRecords.filter((v) => v.status === 'Available').length,
    'Used': list.allRecords.filter((v) => v.status === 'Used').length,
  };

  if (!productSelected) {
    return (
      <EmptyState
        title="Select a product"
        message="Choose a product to view its AI Videos."
      />
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (list.allRecords.length === 0) {
    return <EmptyState title="No AI Videos" message="Create an AI Video to get started." />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Status Filter Pills + Search */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FilterPills<AIVideoStatus>
          options={[
            { value: 'Available', status: 'available', label: `${statusCounts['Available']} Available` },
            { value: 'Used', status: 'used', label: `${statusCounts['Used']} Used` },
          ]}
          activeFilter={list.filters.status}
          onFilterChange={(filter) => list.setFilters({ status: filter })}
        />
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Search AI videos..."
          value={list.searchTerm}
          onChange={(e) => list.setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            width: 400,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'grey.100',
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: 'grey.300' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />
      </Box>

      {/* Table */}
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
              <TableCell sx={{ ...tableHeaderCellSx, whiteSpace: 'nowrap' }}>Name</TableCell>
              <TableCell sx={{ ...tableHeaderCellSx, whiteSpace: 'nowrap', width: 120 }}>Status</TableCell>
              <TableCell sx={{ ...tableHeaderCellSx, whiteSpace: 'nowrap', width: 60 }}>Link</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.visibleRecords.map((video) => {
              const statusInfo = STATUS_MAP[video.status];
              return (
                <TableRow
                  key={video.id}
                  hover
                  sx={{
                    '&:last-child td': { borderBottom: 0 },
                  }}
                >
                  <TableCell sx={tableDataCellSx}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {video.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={tableDataCellSx}>
                    {statusInfo ? (
                      <StatusPill status={statusInfo.key} label={statusInfo.label} />
                    ) : (
                      <StatusPill status="available" label={video.status} />
                    )}
                  </TableCell>
                  <TableCell sx={{ ...tableDataCellSx, px: 1 }}>
                    {video.creativeLink && (
                      <IconButton
                        size="small"
                        onClick={() => window.open(video.creativeLink, '_blank', 'noopener,noreferrer')}
                        sx={{ color: 'text.secondary' }}
                      >
                        <OpenInNewIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <ListPagination
        pageIndex={list.pageIndex}
        totalPages={list.totalPages}
        totalRecords={list.filteredCount}
        onPageChange={list.setPageIndex}
      />
    </Box>
  );
}
