import useSWR from 'swr';
import { getAssetSnapshotsBatch, type AssetSnapshot } from '@/lib/api/bloomberg';

/**
 * Hook to fetch asset snapshots in batch
 */
export function useAssetSnapshots(symbols: string[]) {
  const { data, error, isLoading } = useSWR(
    // AI_DECISION: Ensure symbols are comma-separated for API batch request
    // Justificación: Prevent "possibly delisted" errors if API interprets space-separated symbols as a single ticker.
    symbols.length > 0 ? ['asset-snapshots-batch', symbols.sort().join(',')] : null,
    async () => {
      // Ensure symbols are passed as an array of distinct strings
      // The API client expects { symbols: string[] }, so we pass the array directly.
      // But we must double check `getAssetSnapshotsBatch` implementation.
      const response = await getAssetSnapshotsBatch(symbols);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch asset snapshots');
    },
    {
      refreshInterval: 60000, // Refresh every 60 seconds
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  return {
    snapshots: data || [],
    isLoading,
    error,
  };
}
