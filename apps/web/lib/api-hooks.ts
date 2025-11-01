// AI_DECISION: Add SWR hooks for request deduplication and caching
// Justificación: Eliminates redundant API calls on navigation and provides automatic caching
// Impacto: Reduces API load, improves perceived performance with instant cache hits

import useSWR from 'swr';
import { useAuth } from '../app/auth/AuthContext';

// Generic fetcher function with auth headers
const fetcher = async (url: string, token: string) => {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};

// Hook for contacts list
export function useContacts(assignedAdvisorId?: string | null) {
  const { token } = useAuth();
  const apiUrl = 'http://localhost:3001';
  
  // Build URL with query params if assignedAdvisorId is provided
  const url = assignedAdvisorId 
    ? `${apiUrl}/contacts?assignedAdvisorId=${assignedAdvisorId}`
    : `${apiUrl}/contacts`;
  
  // Use the full URL as the SWR key to ensure proper cache separation for different advisorIds
  // This ensures each advisorId gets its own cached result
  const swrKey = token ? [url, token] : null;
  
  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
  
  return {
    contacts: data?.data || [],
    error,
    isLoading,
    mutate
  };
}

// Hook for pipeline stages
export function usePipelineStages() {
  const { token } = useAuth();
  const apiUrl = 'http://localhost:3001';
  
  const { data, error, isLoading, mutate } = useSWR(
    token ? [`${apiUrl}/pipeline/stages`, token] : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Pipeline stages change less frequently
    }
  );
  
  return {
    stages: data?.data || [],
    error,
    isLoading,
    mutate
  };
}

// Hook for advisors
export function useAdvisors() {
  const { token } = useAuth();
  const apiUrl = 'http://localhost:3001';
  
  const { data, error, isLoading, mutate } = useSWR(
    token ? [`${apiUrl}/users/advisors`, token] : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // Advisors change rarely
    }
  );
  
  return {
    advisors: data?.data || [],
    error,
    isLoading,
    mutate
  };
}

// Hook for tags
export function useTags(scope: string = 'contact') {
  const { token } = useAuth();
  const apiUrl = 'http://localhost:3001';
  
  const { data, error, isLoading, mutate } = useSWR(
    token ? [`${apiUrl}/tags?scope=${scope}`, token] : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 3000,
    }
  );
  
  return {
    tags: data?.data || [],
    error,
    isLoading,
    mutate
  };
}

// AI_DECISION: Add contact detail hooks for client islands pattern
// Justificación: Server component fetches initial data, client islands use SWR for mutations
// Impacto: Enables server/client split while maintaining reactive updates

// Hook for contact detail
export function useContactDetail(id: string) {
  const { token } = useAuth();
  const apiUrl = 'http://localhost:3001';
  
  const { data, error, isLoading, mutate } = useSWR(
    token && id ? [`${apiUrl}/contacts/${id}`, token] : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
  
  return {
    contact: data?.data || null,
    error,
    isLoading,
    mutate
  };
}

// Hook for broker accounts
export function useBrokerAccounts(contactId: string) {
  const { token } = useAuth();
  const apiUrl = 'http://localhost:3001';
  
  const { data, error, isLoading, mutate } = useSWR(
    token && contactId ? [`${apiUrl}/broker-accounts?contactId=${contactId}`, token] : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
  
  return {
    brokerAccounts: data?.data || [],
    error,
    isLoading,
    mutate
  };
}

// Hook for portfolio assignments
export function usePortfolioAssignments(contactId: string) {
  const { token } = useAuth();
  const apiUrl = 'http://localhost:3001';
  
  const { data, error, isLoading, mutate } = useSWR(
    token && contactId ? [`${apiUrl}/portfolios/assignments?contactId=${contactId}`, token] : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
  
  return {
    portfolioAssignments: data?.data || [],
    error,
    isLoading,
    mutate
  };
}

// Hook for tasks
export function useTasks(contactId: string) {
  const { token } = useAuth();
  const apiUrl = 'http://localhost:3001';
  
  const { data, error, isLoading, mutate } = useSWR(
    token && contactId ? [`${apiUrl}/tasks?contactId=${contactId}`, token] : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
  
  return {
    tasks: data?.data || [],
    error,
    isLoading,
    mutate
  };
}

// Hook for notes
export function useNotes(contactId: string) {
  const { token } = useAuth();
  const apiUrl = 'http://localhost:3001';
  
  const { data, error, isLoading, mutate } = useSWR(
    token && contactId ? [`${apiUrl}/notes?contactId=${contactId}`, token] : null,
    ([url, token]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
  
  return {
    notes: data?.data || [],
    error,
    isLoading,
    mutate
  };
}
