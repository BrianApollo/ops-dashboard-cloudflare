/**
 * AnglesTab - Angles table view.
 * Table with: Name | [Product] | Active toggle | Delete
 * Filter pills: Active / Inactive.
 */

import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import DialogContentText from '@mui/material/DialogContentText';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import { useListController, FilterPills, ListPagination } from '../../core/list';
import { AppDialog } from '../../core/dialog';
import { EmptyState } from '../../core/state';
import { tableHeaderCellSx, tableDataCellSx } from '../products/composition/styles';
import { matchesAllTokens } from '../../utils';
import type { Angle } from '../../features/angles';

type ActiveFilter = 'active' | 'inactive';

interface AngleListFilters {
  active: ActiveFilter | null;
}

export interface AngleRow {
  id: string;
  name: string;
  productName: string;
  isActive: boolean;
}

interface AnglesTabProps {
  angles: AngleRow[];
  showProductColumn: boolean;
  onToggleActive: (angleId: string, isActive: boolean) => Promise<void>;
  togglingIds: Set<string>;
  onDelete?: (angleId: string) => Promise<void>;
  isDeleting?: boolean;
}

export function AnglesTab({
  angles,
  showProductColumn,
  onToggleActive,
  togglingIds,
  onDelete,
  isDeleting = false,
}: AnglesTabProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const list = useListController<AngleRow, AngleListFilters>({
    records: angles,
    initialFilters: { active: 'active' },
    initialPageSize: 20,
    filterFn: (records, filters) => {
      if (!filters.active) return records;
      if (filters.active === 'active') return records.filter((a) => a.isActive);
      return records.filter((a) => !a.isActive);
    },
    searchFn: (records, searchTerm) => {
      if (!searchTerm.trim()) return records;
      return records.filter((a) => matchesAllTokens(searchTerm, a.name));
    },
  });

  const activeCount = list.allRecords.filter((a) => a.isActive).length;
  const inactiveCount = list.allRecords.filter((a) => !a.isActive).length;

  const deleteConfirmAngle = deleteConfirmId
    ? angles.find((a) => a.id === deleteConfirmId) ?? null
    : null;

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmId || !onDelete) return;
    await onDelete(deleteConfirmId);
    setDeleteConfirmId(null);
  }, [deleteConfirmId, onDelete]);

  if (list.allRecords.length === 0) {
    return <EmptyState variant="filter" />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Filter Pills + Search */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FilterPills<ActiveFilter>
          options={[
            { value: 'active', status: 'active', label: `${activeCount} Active` },
            { value: 'inactive', status: 'disabled', label: `${inactiveCount} Inactive` },
          ]}
          activeFilter={list.filters.active}
          onFilterChange={(filter) => list.setFilters({ active: filter })}
        />
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Search angles..."
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

      {list.filteredRecords.length === 0 ? (
        <EmptyState variant="filter" />
      ) : (
        <>
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
                  <TableCell sx={tableHeaderCellSx}>Angle</TableCell>
                  {showProductColumn && (
                    <TableCell sx={tableHeaderCellSx}>Product</TableCell>
                  )}
                  <TableCell sx={{ ...tableHeaderCellSx, width: 120 }}>Active</TableCell>
                  {onDelete && (
                    <TableCell sx={{ ...tableHeaderCellSx, width: 80 }}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {list.visibleRecords.map((angle) => {
                  const isToggling = togglingIds.has(angle.id);
                  return (
                    <TableRow
                      key={angle.id}
                      hover
                      sx={{ '&:last-child td': { borderBottom: 0 } }}
                    >
                      <TableCell sx={tableDataCellSx}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {angle.name}
                        </Typography>
                      </TableCell>
                      {showProductColumn && (
                        <TableCell sx={tableDataCellSx}>
                          <Typography variant="body2" color="text.secondary">
                            {angle.productName}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell sx={tableDataCellSx}>
                        {isToggling ? (
                          <CircularProgress size={20} />
                        ) : (
                          <Switch
                            size="small"
                            checked={angle.isActive}
                            onChange={(e) => onToggleActive(angle.id, e.target.checked)}
                          />
                        )}
                      </TableCell>
                      {onDelete && (
                        <TableCell sx={tableDataCellSx}>
                          <IconButton
                            size="small"
                            onClick={() => setDeleteConfirmId(angle.id)}
                            disabled={isDeleting}
                            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <ListPagination
            pageIndex={list.pageIndex}
            totalPages={list.totalPages}
            totalRecords={list.filteredCount}
            onPageChange={list.setPageIndex}
          />
        </>
      )}

      <AppDialog
        open={!!deleteConfirmId}
        onClose={() => !isDeleting && setDeleteConfirmId(null)}
        title="Delete Angle"
        size="xs"
        actions={
          <>
            <Button onClick={() => setDeleteConfirmId(null)} variant="outlined" color="inherit" disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              variant="contained"
              color="error"
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <DialogContentText sx={{ color: 'text.secondary' }}>
          Are you sure you want to delete &quot;{deleteConfirmAngle?.name ?? ''}&quot;? This action cannot be undone.
        </DialogContentText>
      </AppDialog>
    </Box>
  );
}
