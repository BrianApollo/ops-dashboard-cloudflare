/**
 * React Query hook for AI Videos.
 * Wraps listAIVideosByProduct with caching and loading state.
 */

import { useQuery } from '@tanstack/react-query';
import { listAIVideosByProduct } from './data';
import type { AIVideo } from './data';

export function useAIVideos(productName: string | null) {
  return useQuery<AIVideo[]>({
    queryKey: ['ai-videos', productName],
    queryFn: () => listAIVideosByProduct(productName!),
    enabled: !!productName,
    staleTime: 2 * 60 * 1000,
  });
}
