/**
 * ProductSelector - Header component with product dropdown.
 * Handles product selection, status change, and drive link.
 */

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import Divider from '@mui/material/Divider';
import { StatusPill } from '../../ui';
import { matchesAllTokens, sortByNameAsc } from '../../utils';
import type { ProductInfo } from './composition/types';

// Product status options (for dropdowns)
export const PRODUCT_STATUSES = ['Active', 'Preparing', 'Benched'] as const;

interface ProductSelectorProps {
  products: ProductInfo[];
  selectedProduct: ProductInfo | null;
  onSelect: (productId: string | null) => void;
  onStatusChange: (status: string) => void;
  onCreateProduct: () => void;
}

export function ProductSelector({
  products,
  selectedProduct,
  onSelect,
  onStatusChange,
  onCreateProduct,
}: ProductSelectorProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [query, setQuery] = useState('');

  const closeMenu = () => {
    setAnchorEl(null);
    setQuery('');
  };

  // Filter with the shared tokenized search (word order doesn't matter), then
  // sort A-Z and split into status groups. normalizeStatus() guarantees one of
  // the three values, and anything unexpected falls into Active the same way it
  // does there — so no product can be dropped from the list.
  const groups = useMemo(() => {
    const visible = products
      .filter((p) => matchesAllTokens(query, p.name))
      .sort(sortByNameAsc);

    return [
      { label: 'Active', items: visible.filter((p) => p.status !== 'Preparing' && p.status !== 'Benched') },
      { label: 'Preparing', items: visible.filter((p) => p.status === 'Preparing') },
      { label: 'Benched', items: visible.filter((p) => p.status === 'Benched') },
    ].filter((g) => g.items.length > 0);
  }, [products, query]);

  const hasMatches = groups.length > 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1,
        minHeight: 56,
        bgcolor: 'background.paper',
      }}
    >
      {selectedProduct ? (
        <>
          {/* Logo */}
          {selectedProduct.logos[0]?.url ? (
            <Box
              component="img"
              src={selectedProduct.logos[0].url}
              alt={`${selectedProduct.name} logo`}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                objectFit: 'contain',
                bgcolor: 'grey.50',
                border: '1px solid',
                borderColor: 'divider',
                p: 0.5,
              }}
            />
          ) : (
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
              }}
            >
              {selectedProduct.name.charAt(0).toUpperCase()}
            </Box>
          )}

          {/* Product Name - Clickable */}
          <Box
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 },
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
              {selectedProduct.name}
            </Typography>
            <KeyboardArrowDownIcon sx={{ color: 'text.secondary', fontSize: '1.25rem' }} />
          </Box>

          {/* Spacer */}
          <Box sx={{ flex: 1 }} />

          {/* Status Pill */}
          <Box
            onClick={(e) => setStatusAnchor(e.currentTarget)}
            sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
          >
            <StatusPill status={selectedProduct.status} />
          </Box>

          {/* Status Menu */}
          <Menu
            anchorEl={statusAnchor}
            open={Boolean(statusAnchor)}
            onClose={() => setStatusAnchor(null)}
          >
            {PRODUCT_STATUSES.map((s) => (
              <MenuItem
                key={s}
                onClick={() => { onStatusChange(s); setStatusAnchor(null); }}
                selected={selectedProduct.status === s}
                sx={{ textTransform: 'capitalize' }}
              >
                {s}
              </MenuItem>
            ))}
          </Menu>

          {/* Asset folder link - removed during Cloudflare migration */}

          {/* Clear Button */}
          <IconButton
            size="small"
            onClick={() => onSelect(null)}
            sx={{
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </>
      ) : (
        <>
          {/* No Product Selected State */}
          <Button
            variant="text"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            endIcon={<KeyboardArrowDownIcon />}
            sx={{
              color: 'text.primary',
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'none',
              px: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            All Products
          </Button>
        </>
      )}

      {/* Product Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        autoFocus={false}
        // Fixed width so the menu doesn't resize with the longest product name.
        PaperProps={{ sx: { width: 340, maxWidth: '90vw', maxHeight: 420 } }}
        MenuListProps={{ sx: { pt: 0 } }}
      >
        {/* Search — pinned while the list below scrolls */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            bgcolor: 'background.paper',
            px: 1.5,
            pt: 1.5,
            pb: 1,
          }}
          // Menu's built-in typeahead would otherwise swallow these keystrokes.
          // Escape still closes; arrows still move focus into the list.
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'ArrowDown' || e.key === 'ArrowUp') return;
            e.stopPropagation();
          }}
        >
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Search products…"
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

        <MenuItem
          onClick={() => { onSelect(null); closeMenu(); }}
          selected={!selectedProduct}
          sx={{ fontWeight: !selectedProduct ? 600 : 400 }}
        >
          All Products
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        <MenuItem
          onClick={() => { onCreateProduct(); closeMenu(); }}
          sx={{ color: 'primary.main', gap: 1, fontWeight: 500 }}
        >
          <AddIcon fontSize="small" />
          Create New Product
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        {!hasMatches && (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
              No products match “{query}”
            </Typography>
          </Box>
        )}

        {/* Menu flattens these so keyboard navigation still walks every item */}
        {groups.flatMap((group) => [
          <ListSubheader
            key={`header-${group.label}`}
            disableSticky
            sx={{
              lineHeight: 2.2,
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'text.secondary',
              bgcolor: 'transparent',
            }}
          >
            {group.label}
          </ListSubheader>,
          ...group.items.map((p) => (
            <MenuItem
              key={p.id}
              onClick={() => { onSelect(p.id); closeMenu(); }}
              selected={selectedProduct?.id === p.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1,
              }}
            >
              {p.logos[0]?.url ? (
                <Box
                  component="img"
                  src={p.logos[0].url}
                  alt=""
                  sx={{
                    width: 24,
                    height: 24,
                    flexShrink: 0,
                    borderRadius: 0.5,
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    flexShrink: 0,
                    borderRadius: 0.5,
                    bgcolor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'text.secondary',
                  }}
                >
                  {p.name.charAt(0)}
                </Box>
              )}
              {/* minWidth:0 lets this shrink below its text width so the pill
                  keeps its place instead of being pushed out of the row. */}
              <Box
                component="span"
                title={p.name}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.name}
              </Box>
              <StatusPill status={p.status} sx={{ flexShrink: 0 }} />
            </MenuItem>
          )),
        ])}
      </Menu>
    </Paper>
  );
}
