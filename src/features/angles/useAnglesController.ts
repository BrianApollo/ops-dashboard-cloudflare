/**
 * Angles Controller
 *
 * Owns ALL logic for the Angles feature:
 * - List fetching via TanStack Query
 * - Filtering by product, active state
 * - Create / update active / delete mutations
 *
 * Contains NO UI imports — pure logic only.
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Angle, AngleFilters } from './types';
import { listAngles, createAngle, updateAngleActive, deleteAngle } from './data';
import { sortByNameDesc } from '../../utils';

export interface UseAnglesControllerResult {
  // Data
  angles: Angle[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;

  // Filters
  filters: AngleFilters;
  setFilters: (filters: AngleFilters) => void;
  setProductFilter: (productId: string | null) => void;
  setActiveFilter: (isActive: boolean | null) => void;
  clearFilters: () => void;

  // Filtered results
  filteredAngles: Angle[];

  // Mutations
  createNewAngle: (productId: string, name: string) => Promise<Angle>;
  isCreating: boolean;
  toggleActive: (angleId: string, isActive: boolean) => Promise<void>;
  togglingIds: Set<string>;
  deleteAngleById: (angleId: string) => Promise<void>;
  isDeleting: boolean;
}

interface UseAnglesControllerOptions {
  initialFilters?: Partial<AngleFilters>;
  enabled?: boolean;
}

export function useAnglesController(
  options: UseAnglesControllerOptions = {}
): UseAnglesControllerResult {
  const { initialFilters, enabled = true } = options;

  const [filters, setFilters] = useState<AngleFilters>({
    productId: null,
    isActive: null,
    ...initialFilters,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const anglesQuery = useQuery({
    queryKey: ['angles'],
    queryFn: ({ signal }) => listAngles(signal),
    staleTime: 30 * 1000,
    enabled,
  });

  const angles = anglesQuery.data ?? [];

  const filteredAngles = useMemo(() => {
    let result = angles;

    if (filters.productId) {
      result = result.filter((a) => a.product.id === filters.productId);
    }

    if (filters.isActive !== null) {
      result = result.filter((a) => a.isActive === filters.isActive);
    }

    return [...result].sort(sortByNameDesc);
  }, [angles, filters]);

  const setProductFilter = useCallback((productId: string | null) => {
    setFilters((prev) => ({ ...prev, productId }));
  }, []);

  const setActiveFilter = useCallback((isActive: boolean | null) => {
    setFilters((prev) => ({ ...prev, isActive }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ productId: null, isActive: null });
  }, []);

  const handleCreate = useCallback(async (productId: string, name: string): Promise<Angle> => {
    setIsCreating(true);
    try {
      const newAngle = await createAngle(productId, name, true);
      await anglesQuery.refetch();
      return newAngle;
    } finally {
      setIsCreating(false);
    }
  }, [anglesQuery]);

  const handleToggleActive = useCallback(async (angleId: string, isActive: boolean): Promise<void> => {
    setTogglingIds((prev) => new Set(prev).add(angleId));
    try {
      await updateAngleActive(angleId, isActive);
      await anglesQuery.refetch();
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(angleId);
        return next;
      });
    }
  }, [anglesQuery]);

  const handleDelete = useCallback(async (angleId: string): Promise<void> => {
    setIsDeleting(true);
    try {
      await deleteAngle(angleId);
      await anglesQuery.refetch();
    } finally {
      setIsDeleting(false);
    }
  }, [anglesQuery]);

  return {
    angles,
    isLoading: anglesQuery.isLoading,
    isError: anglesQuery.isError,
    error: anglesQuery.error,
    refetch: anglesQuery.refetch,

    filters,
    setFilters,
    setProductFilter,
    setActiveFilter,
    clearFilters,

    filteredAngles,

    createNewAngle: handleCreate,
    isCreating,
    toggleActive: handleToggleActive,
    togglingIds,
    deleteAngleById: handleDelete,
    isDeleting,
  };
}
