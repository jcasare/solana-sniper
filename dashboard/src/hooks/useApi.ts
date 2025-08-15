import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import apiService from '@/services/api';
import type { 
  Token, 
  TokensResponse, 
  TokenDetailsResponse, 
  SystemOverview, 
  TokenFilters,
  UserSettings,
} from '@/types';

// System hooks
export function useSystemOverview(refreshInterval = 30000) {
  return useQuery(
    'system-overview',
    () => apiService.getSystemOverview(),
    {
      refetchInterval: refreshInterval,
      staleTime: 15000,
      cacheTime: 60000,
    }
  );
}

export function useSystemHealth() {
  return useQuery(
    'system-health',
    () => apiService.getSystemHealth(),
    {
      refetchInterval: 60000,
      staleTime: 30000,
    }
  );
}

// Token hooks
export function useTokens(filters: TokenFilters = {}, enabled = true) {
  const queryKey = ['tokens', filters];
  
  return useQuery(
    queryKey,
    () => apiService.getTokens(filters),
    {
      enabled,
      staleTime: 10000,
      cacheTime: 300000, // 5 minutes
      keepPreviousData: true,
    }
  );
}

export function useHighRiskTokens(limit = 50) {
  return useQuery(
    ['high-risk-tokens', limit],
    () => apiService.getHighRiskTokens(limit),
    {
      refetchInterval: 60000,
      staleTime: 30000,
    }
  );
}

export function useTokenDetails(mintAddress: string, enabled = true) {
  return useQuery(
    ['token-details', mintAddress],
    () => apiService.getTokenDetails(mintAddress),
    {
      enabled: enabled && !!mintAddress,
      staleTime: 30000,
      cacheTime: 300000,
    }
  );
}

export function useTokenAnalysisHistory(mintAddress: string, enabled = true) {
  return useQuery(
    ['token-analysis-history', mintAddress],
    () => apiService.getTokenAnalysisHistory(mintAddress),
    {
      enabled: enabled && !!mintAddress,
      staleTime: 60000,
    }
  );
}

// Analysis mutations
export function useAnalyzeToken() {
  const queryClient = useQueryClient();
  
  return useMutation(
    (mintAddress: string) => apiService.analyzeToken(mintAddress),
    {
      onSuccess: (data, mintAddress) => {
        // Invalidate related queries
        queryClient.invalidateQueries(['token-details', mintAddress]);
        queryClient.invalidateQueries(['token-analysis-history', mintAddress]);
        queryClient.invalidateQueries(['tokens']);
      },
    }
  );
}

export function useFetchAndAnalyzeToken() {
  const queryClient = useQueryClient();
  
  return useMutation(
    (mintAddress: string) => apiService.fetchAndAnalyzeToken(mintAddress),
    {
      onSuccess: (data, mintAddress) => {
        // Invalidate related queries
        queryClient.invalidateQueries(['token-details', mintAddress]);
        queryClient.invalidateQueries(['tokens']);
        queryClient.invalidateQueries('system-overview');
      },
    }
  );
}

// Simulation hooks
export function useSimulateToken() {
  return useMutation(
    ({ mintAddress, profile }: { mintAddress: string; profile?: 'conservative' | 'moderate' | 'aggressive' }) =>
      apiService.simulateToken(mintAddress, profile),
  );
}

export function useSimulateTokenAllProfiles() {
  return useMutation(
    (mintAddress: string) => apiService.simulateTokenAllProfiles(mintAddress),
  );
}

export function useSimulationInsights() {
  return useQuery(
    'simulation-insights',
    () => apiService.getSimulationInsights(),
    {
      refetchInterval: 120000, // 2 minutes
      staleTime: 60000,
    }
  );
}

export function useSimulationLogs(limit = 100, offset = 0, days?: number) {
  return useQuery(
    ['simulation-logs', limit, offset, days],
    () => apiService.getSimulationLogs(limit, offset, days),
    {
      refetchInterval: 30000,
      staleTime: 15000,
    }
  );
}

export function useBacktest() {
  return useMutation(
    ({ days, profile }: { days?: number; profile?: 'conservative' | 'moderate' | 'aggressive' }) =>
      apiService.runBacktest(days, profile),
  );
}

// Alerts hook
export function useActiveAlerts() {
  return useQuery(
    'active-alerts',
    () => apiService.getActiveAlerts(),
    {
      refetchInterval: 30000,
      staleTime: 15000,
    }
  );
}

// Watchlist hooks
export function useWatchlist(
  limit = 100, 
  search?: string, 
  sortBy = 'watchedAt', 
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  return useQuery(
    ['watchlist', limit, search, sortBy, sortOrder],
    () => apiService.getWatchlist(limit, search, sortBy, sortOrder),
    {
      refetchInterval: 30000,
      staleTime: 15000,
    }
  );
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  
  return useMutation(
    (mintAddress: string) => apiService.addToWatchlist(mintAddress),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['watchlist']);
        queryClient.invalidateQueries(['tokens']);
      },
    }
  );
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  
  return useMutation(
    (mintAddress: string) => apiService.removeFromWatchlist(mintAddress),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['watchlist']);
        queryClient.invalidateQueries(['tokens']);
      },
    }
  );
}

// Search hook with debouncing
export function useTokenSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tokens = await apiService.searchTokens(searchQuery);
      setResults(tokens);
    } catch (err) {
      setError(apiService.handleApiError(err));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      search(searchQuery);
    }, 300);
  }, [search]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    query,
    results,
    loading,
    error,
    search: debouncedSearch,
    clearResults: () => setResults([]),
  };
}

// Settings hook
export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedSettings = apiService.loadSettings();
      setSettings(savedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback((newSettings: UserSettings) => {
    try {
      apiService.saveSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }, []);

  return {
    settings,
    loading,
    updateSettings,
  };
}

// Pagination hook
export function usePagination(initialLimit = 50) {
  const [limit, setLimit] = useState(initialLimit);
  const [offset, setOffset] = useState(0);

  const nextPage = useCallback(() => {
    setOffset(prev => prev + limit);
  }, [limit]);

  const prevPage = useCallback(() => {
    setOffset(prev => Math.max(0, prev - limit));
  }, [limit]);

  const goToPage = useCallback((page: number) => {
    setOffset(Math.max(0, (page - 1) * limit));
  }, [limit]);

  const reset = useCallback(() => {
    setOffset(0);
  }, []);

  const currentPage = Math.floor(offset / limit) + 1;

  return {
    limit,
    offset,
    currentPage,
    setLimit,
    nextPage,
    prevPage,
    goToPage,
    reset,
  };
}

// Filter hook for token list
export function useTokenFilters() {
  const [filters, setFilters] = useState<TokenFilters>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 50,
    offset: 0,
  });

  const updateFilter = useCallback((key: keyof TokenFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset to first page when filters change
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: 50,
      offset: 0,
    });
  }, []);

  return {
    filters,
    updateFilter,
    resetFilters,
    setFilters,
  };
}