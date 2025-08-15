import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { TrendingUp, AlertTriangle, Activity, Users } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { TokenTable } from '@/components/tokens/TokenTable';
import { TokenFilters } from '@/components/tokens/TokenFilters';
import { LoadingCard } from '@/components/common/LoadingSpinner';
import { ErrorBoundary, ApiErrorFallback } from '@/components/common/ErrorBoundary';
import { useTokens, useSystemOverview, useTokenFilters, useWatchlist } from '@/hooks/useApi';
import { useRealTimeUpdates } from '@/hooks/useWebSocket';
import { formatCurrency, formatNumber } from '@/utils';

function TokenWatchlistContent() {
  const router = useRouter();
  const { filters, updateFilter, resetFilters } = useTokenFilters();
  
  // Always use watchlist, but pass search term and sort parameters
  const { data: watchlistData, isLoading: watchlistLoading, error: watchlistError } = useWatchlist(
    100, 
    filters.search, 
    filters.sortBy || 'watchedAt', 
    filters.sortOrder || 'desc'
  );
  const { data: overview, isLoading: overviewLoading } = useSystemOverview();

  // Determine display mode
  const isSearching = !!filters.search;
  const displayData = watchlistData;
  const displayLoading = watchlistLoading;
  const displayError = watchlistError;
  
  // Real-time updates
  useRealTimeUpdates({
    enableOverview: true,
    enableNewTokens: true,
    enableAlerts: true,
  });

  const handleViewToken = (mintAddress: string) => {
    router.push(`/token/${mintAddress}`);
  };

  if (displayError) {
    const errorObj = displayError instanceof Error ? displayError : new Error(String(displayError));
    return <ApiErrorFallback error={errorObj} retry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6">
      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 card-hover">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="w-8 h-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Tokens</p>
              <div className="text-2xl font-semibold text-gray-900">
                {overviewLoading ? (
                  <div className="w-16 h-8 bg-gray-200 animate-pulse rounded" />
                ) : (
                  formatNumber(overview?.tokens.total || 0)
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 card-hover">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">New Today</p>
              <div className="text-2xl font-semibold text-gray-900">
                {overviewLoading ? (
                  <div className="w-16 h-8 bg-gray-200 animate-pulse rounded" />
                ) : (
                  formatNumber(overview?.tokens.recentlyAdded || 0)
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-red-50 to-orange-50 border-red-200 card-hover">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">High Risk</p>
              <div className="text-2xl font-semibold text-gray-900">
                {overviewLoading ? (
                  <div className="w-16 h-8 bg-gray-200 animate-pulse rounded" />
                ) : (
                  formatNumber(overview?.analysis.highRiskTokens || 0)
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 card-hover">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Simulations</p>
              <div className="text-2xl font-semibold text-gray-900">
                {overviewLoading ? (
                  <div className="w-16 h-8 bg-gray-200 animate-pulse rounded" />
                ) : (
                  formatNumber(overview?.simulation.totalSimulations || 0)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Distribution */}
      {overview?.tokens.riskDistribution && (
        <div className="card p-6">
          <h3 className="text-xl font-bold gradient-text mb-6">Risk Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(overview.tokens.riskDistribution).map(([riskLevel, count]) => (
              <div key={riskLevel} className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {count}
                </div>
                <div className="text-sm text-gray-500 capitalize">
                  {riskLevel} Risk
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-6">
        <h2 className="text-xl font-bold gradient-text mb-6">Token Filters</h2>
        <TokenFilters
          filters={filters}
          onUpdateFilter={updateFilter}
          onResetFilters={resetFilters}
          loading={displayLoading}
        />
      </div>

      {/* Token Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold gradient-text">
            {isSearching ? 'Search Results' : 'Token Watchlist'}
            {displayData && (
              <span className="ml-2 text-sm text-gray-500">
                ({isSearching ? (displayData as any).pagination?.total || 0 : (displayData as any).count || 0} tokens)
              </span>
            )}
          </h2>

          {/* Live indicator */}
          <div className="flex items-center space-x-3">
            <div className="status-online" />
            <span className="text-sm font-medium text-green-600">Live monitoring</span>
            <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200">
              ACTIVE
            </div>
          </div>
        </div>

        <TokenTable
          tokens={displayData?.tokens || []}
          loading={displayLoading}
          filters={filters}
          onUpdateFilter={updateFilter}
          onViewToken={handleViewToken}
        />

        {/* No pagination needed for watchlist search */}

        {/* Show message if no watchlist tokens */}
        {!isSearching && (!displayData?.tokens || displayData.tokens.length === 0) && !displayLoading && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg mb-2">No tokens in your watchlist yet</p>
              <p className="text-sm">Use the token lookup page to fetch and analyze tokens from DexScreener</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TokenWatchlistPage() {
  return (
    <>
      <Head>
        <title>Token Watchlist - Solana Security Monitor</title>
        <meta name="description" content="Real-time monitoring of Solana token launches with risk analysis" />
      </Head>

      <Layout>
        <ErrorBoundary>
          <TokenWatchlistContent />
        </ErrorBoundary>
      </Layout>
    </>
  );
}