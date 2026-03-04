/**
 * useLaunchSetupDefaults
 *
 * Fetches "Campaign Launch Setup" defaults for the current product
 * and auto-applies Amount, Pixel, and Page to the draft when they
 * match available Facebook infrastructure options.
 *
 * Only applies once per launch page session (guards via ref).
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
  pixels: InfraOption[];
  pages: InfraOption[];
  onApply: (defaults: { budget?: string; pixelId?: string; pageId?: string }) => void;
}

export interface UseLaunchSetupDefaultsReturn {
  setup: CampaignLaunchSetup | null;
  isLoading: boolean;
}

export function useLaunchSetupDefaults({
  productId,
  pixels,
  pages,
  onApply,
}: UseLaunchSetupDefaultsOptions): UseLaunchSetupDefaultsReturn {
  const [setup, setSetup] = useState<CampaignLaunchSetup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const appliedRef = useRef(false);

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

  // Apply defaults once setup is loaded AND infra options are available
  useEffect(() => {
    if (!setup || appliedRef.current) return;

    const defaults: { budget?: string; pixelId?: string; pageId?: string } = {};
    let hasDefaults = false;

    // Apply amount (always available, no matching needed)
    if (setup.amount) {
      defaults.budget = setup.amount;
      hasDefaults = true;
    }

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

    // Only apply once we have something to apply, and pixel/page lists have loaded
    // (if setup has pixel/page values, wait for those lists to be available)
    const waitingForPixels = setup.pixel && pixels.length === 0;
    const waitingForPages = setup.page && pages.length === 0;
    if (waitingForPixels || waitingForPages) return;

    if (hasDefaults) {
      appliedRef.current = true;
      onApply(defaults);
    }
  }, [setup, pixels, pages, onApply]);

  return { setup, isLoading };
}
