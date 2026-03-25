import { useQuery } from '@tanstack/react-query';
import {
  fetchFraudAlerts,
  fetchComplianceIssues,
  fetchAuditLogs,
  fetchAuditAnalytics,
  type FraudAlertsResponse,
  type ComplianceIssuesResponse,
  type AuditLogsResponse,
  type AuditAnalytics,
} from '@/lib/api';

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
 * Returns paginated response with alerts array
 */
export function useFraudAlerts(workspaceId: string | null) {
  return useQuery<FraudAlertsResponse, Error>({
    queryKey: ['fraudAlerts', workspaceId],
    queryFn: () => fetchFraudAlerts(workspaceId || 'default'),
    enabled: !!workspaceId, // Only fetch if workspaceId exists
    staleTime: 60 * 1000, // Consider data stale after 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes in background
  });
}

/**
 * Fetch compliance issues for a workspace
 * Returns paginated response with issues array
 */
export function useComplianceIssues(workspaceId: string | null) {
  return useQuery<ComplianceIssuesResponse, Error>({
    queryKey: ['complianceIssues', workspaceId],
    queryFn: () => fetchComplianceIssues(workspaceId || 'default'),
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2, // Retry failed requests up to 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Fetch audit logs for a workspace
 * Returns paginated response with logs array
 * Only enabled for non-demo users
 */
export function useAuditLogs(
  workspaceId: string | null,
  options?: {
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  return useQuery<AuditLogsResponse, Error>({
    queryKey: ['auditLogs', workspaceId, options?.limit, options?.offset],
    queryFn: () =>
      fetchAuditLogs(workspaceId || 'default', {
        limit: options?.limit || 100,
        offset: options?.offset || 0,
      }),
    enabled: options?.enabled !== false && !!workspaceId,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes in background
  });
}

/**
 * Fetch audit analytics for a workspace
 * Returns analytics summary with top actions and active users
 * Only enabled for non-demo users
 */
export function useAuditAnalytics(
  workspaceId: string | null,
  options?: {
    enabled?: boolean;
    topN?: number;
  }
) {
  return useQuery<AuditAnalytics, Error>({
    queryKey: ['auditAnalytics', workspaceId, options?.topN],
    queryFn: () =>
      fetchAuditAnalytics(workspaceId || 'default', {
        topN: options?.topN || 10,
      }),
    enabled: options?.enabled !== false && !!workspaceId,
    staleTime: 60 * 1000, // Consider data stale after 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes in background
  });
}

