import { useQuery } from '@tanstack/react-query';
import { fetchFraudAlerts, fetchComplianceIssues, type FraudAlert, type ComplianceIssue } from '@/lib/api';

/**
 * Custom hooks using TanStack Query for server state management
 * 
 * Benefits over raw useEffect + fetch:
 * - Automatic caching
 * - Background refetching
 * - Request deduplication
 * - Loading and error states
 * - Stale-while-revalidate pattern
 */

/**
 * Fetch fraud alerts for a workspace
 */
export function useFraudAlerts(workspaceId: string | null) {
  return useQuery<FraudAlert[], Error>({
    queryKey: ['fraudAlerts', workspaceId],
    queryFn: () => fetchFraudAlerts(workspaceId || 'default'),
    enabled: !!workspaceId, // Only fetch if workspaceId exists
    staleTime: 60 * 1000, // Consider data stale after 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes in background
  });
}

/**
 * Fetch compliance issues for a workspace
 */
export function useComplianceIssues(workspaceId: string | null) {
  return useQuery<ComplianceIssue[], Error>({
    queryKey: ['complianceIssues', workspaceId],
    queryFn: () => fetchComplianceIssues(workspaceId || 'default'),
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
