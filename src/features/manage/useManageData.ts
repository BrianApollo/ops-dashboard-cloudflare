/**
 * Data hook for the Manage page.
 *
 * Fetches profiles from Airtable, then uses the selected profile's
 * permanent token to fetch Facebook campaigns across ad accounts.
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getActiveProfiles, getMasterProfileId } from '../profiles/data';
import { getLaunchedCampaignRedtrackMap } from '../campaigns/data';
import { fetchAllCampaigns, updateCampaignStatus, updateCampaignBudget } from './api';
import { matchesAllTokens } from '../../utils/tokenizedSearch';
import type { Profile } from '../profiles/types';
import type { FbManageCampaign, FbAdAccount, ManageFilters, DatePreset } from './types';

// =============================================================================
// HOOK
// =============================================================================

export interface ManageData {
  // Profiles
  profiles: Profile[];
  selectedProfile: Profile | null;
  setSelectedProfileId: (id: string) => void;

  // Campaigns & accounts
  campaigns: FbManageCampaign[];
  adAccounts: FbAdAccount[];
  filteredCampaigns: FbManageCampaign[];

  // RedTrack lookup: campaign name → redtrackCampaignId
  redtrackMap: Map<string, string>;

  // Filters
  filters: ManageFilters;
  setSearch: (search: string) => void;
  setAdAccountFilter: (id: string) => void;
  setStatusFilter: (status: ManageFilters['status']) => void;
  setDatePreset: (preset: DatePreset) => void;

  // State
  isLoadingProfiles: boolean;
  isLoadingCampaigns: boolean;
  isError: boolean;
  error: Error | null;

  // Actions
  refetch: () => void;
  toggleCampaignStatus: (campaignId: string, currentStatus: string) => Promise<void>;
  editCampaignBudget: (campaignId: string, newBudgetCents: number) => Promise<void>;
}

export function useManageData(): ManageData {
  const queryClient = useQueryClient();

  // ── Profile selection state ──
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // ── Filter state ──
  const [filters, setFilters] = useState<ManageFilters>({
    search: '',
    adAccountId: 'all',
    status: 'ACTIVE',
    datePreset: 'last_7d',
  });

  // ── Fetch active profiles from Airtable ──
  const {
    data: profiles = [],
    isLoading: isLoadingProfiles,
  } = useQuery({
    queryKey: ['manage-profiles'],
    queryFn: getActiveProfiles,
    staleTime: 5 * 60 * 1000,
  });

  // ── Fetch master profile ID from Airtable ──
  const { data: masterProfileId } = useQuery({
    queryKey: ['master-profile-id'],
    queryFn: getMasterProfileId,
    staleTime: 10 * 60 * 1000,
  });

  // Auto-select master profile when profiles load, fall back to first profile
  const selectedProfile = useMemo(() => {
    if (profiles.length === 0) return null;
    if (selectedProfileId) {
      return profiles.find((p) => p.id === selectedProfileId) ?? profiles[0];
    }
    // Default to master profile if configured
    if (masterProfileId) {
      const master = profiles.find((p) => p.id === masterProfileId);
      if (master) return master;
    }
    return profiles[0];
  }, [profiles, selectedProfileId, masterProfileId]);

  const accessToken = selectedProfile?.permanentToken ?? '';

  // ── Fetch launched campaign → RedTrack ID map from Airtable ──
  const { data: redtrackMap = new Map<string, string>() } = useQuery({
    queryKey: ['launched-redtrack-map'],
    queryFn: getLaunchedCampaignRedtrackMap,
    staleTime: 5 * 60 * 1000,
  });

  // ── Fetch campaigns from Facebook ──
  const {
    data: campaignData,
    isLoading: isLoadingCampaigns,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['manage-campaigns', selectedProfile?.id, filters.datePreset],
    queryFn: () => fetchAllCampaigns(accessToken, filters.datePreset),
    enabled: !!accessToken,
    staleTime: 2 * 60 * 1000,
  });

  const campaigns = campaignData?.campaigns ?? [];
  const adAccounts = campaignData?.adAccounts ?? [];

  // ── Filter campaigns ──
  const filteredCampaigns = useMemo(() => {
    let result = campaigns;

    // Only show ACTIVE and PAUSED (not DELETED/ARCHIVED)
    result = result.filter((c) => c.status === 'ACTIVE' || c.status === 'PAUSED');

    // Ad account filter
    if (filters.adAccountId !== 'all') {
      result = result.filter((c) => c.adAccountId === filters.adAccountId);
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter((c) => c.status === filters.status);
    }

    // Tokenized search — matches all words in any order against name + ID
    if (filters.search.trim()) {
      result = result.filter((c) =>
        matchesAllTokens(filters.search, `${c.name} ${c.id}`),
      );
    }

    return result;
  }, [campaigns, filters]);

  // ── Filter setters ──
  const setSearch = useCallback((search: string) => {
    setFilters((f) => ({ ...f, search }));
  }, []);

  const setAdAccountFilter = useCallback((adAccountId: string) => {
    setFilters((f) => ({ ...f, adAccountId }));
  }, []);

  const setStatusFilter = useCallback((status: ManageFilters['status']) => {
    setFilters((f) => ({ ...f, status }));
  }, []);

  const setDatePreset = useCallback((datePreset: DatePreset) => {
    setFilters((f) => ({ ...f, datePreset }));
  }, []);

  // ── Mutations ──
  const toggleCampaignStatus = useCallback(
    async (campaignId: string, currentStatus: string) => {
      if (!accessToken) return;
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      await updateCampaignStatus(campaignId, newStatus, accessToken);
      queryClient.invalidateQueries({ queryKey: ['manage-campaigns'] });
    },
    [accessToken, queryClient],
  );

  const editCampaignBudget = useCallback(
    async (campaignId: string, newBudgetCents: number) => {
      if (!accessToken) return;
      await updateCampaignBudget(campaignId, newBudgetCents, accessToken);
      queryClient.invalidateQueries({ queryKey: ['manage-campaigns'] });
    },
    [accessToken, queryClient],
  );

  return {
    profiles,
    selectedProfile,
    setSelectedProfileId,
    campaigns,
    adAccounts,
    filteredCampaigns,
    redtrackMap,
    filters,
    setSearch,
    setAdAccountFilter,
    setStatusFilter,
    setDatePreset,
    isLoadingProfiles,
    isLoadingCampaigns,
    isError,
    error: error as Error | null,
    refetch,
    toggleCampaignStatus,
    editCampaignBudget,
  };
}
