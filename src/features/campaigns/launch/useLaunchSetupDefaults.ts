/**
 * useLaunchSetupDefaults
 *
 * Fetches "Campaign Launch Setup" defaults for the current product
 * and auto-applies Ad Account, Amount, Pixel, and Page to the draft
 * when they match available Facebook infrastructure options.
 *
 * Two-phase apply:
 *   Phase 1 — Budget + Ad Account (once ad accounts list is ready)
 *   Phase 2 — Pixel + Page (once pixel/page lists are ready,
 *             which depends on the ad account being set first)
 *
 * Each phase fires at most once per session (guarded by refs).
 */

import { useState, useEffect, useRef } from 'react';
import { fetchLaunchSetup } from '../';
import type { CampaignLaunchSetup } from '../';

interface InfraOption {
  id: string;
  name: string;
  externalId?: string;
  status: string;
}

export interface UseLaunchSetupDefaultsOptions {
  productId: string | undefined;
  adAccounts: InfraOption[];
  pixels: InfraOption[];
  pages: InfraOption[];
  onApply: (defaults: { budget?: string; adAccountId?: string; pixelId?: string; pageId?: string }) => void;
}

export interface UseLaunchSetupDefaultsReturn {
  setup: CampaignLaunchSetup | null;
  isLoading: boolean;
}

export function useLaunchSetupDefaults({
  productId,
  adAccounts,
  pixels,
  pages,
  onApply,
}: UseLaunchSetupDefaultsOptions): UseLaunchSetupDefaultsReturn {
  const [setup, setSetup] = useState<CampaignLaunchSetup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const appliedAccountRef = useRef(false);
  const appliedInfraRef = useRef(false);

  // Fetch setup when productId is available
  useEffect(() => {
    if (!productId) return;

    let cancelled = false;
    setIsLoading(true);

    fetchLaunchSetup(productId)
      .then((data) => {
        if (!cancelled) setSetup(data);
      })
      .catch(() => {
        // Silently ignore — setup defaults are optional
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [productId]);

  // Phase 1: Apply budget + ad account once setup AND ad accounts list are available
  useEffect(() => {
    if (!setup || appliedAccountRef.current) return;

    const defaults: { budget?: string; adAccountId?: string } = {};
    let hasDefaults = false;

    // Apply amount (always available, no matching needed)
    if (setup.amount) {
      defaults.budget = setup.amount;
      hasDefaults = true;
    }

    // Match ad account by name against available options
    if (setup.adAccount && adAccounts.length > 0) {
      const match = adAccounts.find(
        (a) => a.name === setup.adAccount || a.id === setup.adAccount || a.externalId === setup.adAccount
      );
      if (match) {
        defaults.adAccountId = match.id;
        hasDefaults = true;
      }
    }

    // Wait for ad accounts list if setup has an ad account value
    const waitingForAdAccounts = setup.adAccount && adAccounts.length === 0;
    if (waitingForAdAccounts) return;

    appliedAccountRef.current = true;
    if (hasDefaults) {
      onApply(defaults);
    }
  }, [setup, adAccounts, onApply]);

  // Phase 2: Apply pixel + page once setup AND pixel/page lists are available
  useEffect(() => {
    if (!setup || appliedInfraRef.current) return;

    const defaults: { pixelId?: string; pageId?: string } = {};
    let hasDefaults = false;

    // Match pixel by name against available options
    if (setup.pixel && pixels.length > 0) {
      const match = pixels.find(
        (p) => p.name === setup.pixel || p.id === setup.pixel || p.externalId === setup.pixel
      );
      if (match) {
        defaults.pixelId = match.id;
        hasDefaults = true;
      }
    }

    // Match page by name against available options
    if (setup.page && pages.length > 0) {
      const match = pages.find(
        (p) => p.name === setup.page || p.id === setup.page || p.externalId === setup.page
      );
      if (match) {
        defaults.pageId = match.id;
        hasDefaults = true;
      }
    }

    // Wait for pixel/page lists if setup has values for them
    const waitingForPixels = setup.pixel && pixels.length === 0;
    const waitingForPages = setup.page && pages.length === 0;
    if (waitingForPixels || waitingForPages) return;

    appliedInfraRef.current = true;
    if (hasDefaults) {
      onApply(defaults);
    }
  }, [setup, pixels, pages, onApply]);

  return { setup, isLoading };
}
