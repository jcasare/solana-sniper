import React, { useState } from 'react';
import { Search, Filter, X, RefreshCw } from 'lucide-react';
import { Button, IconButton } from '@/components/common/Button';
import { cn } from '@/utils';
import type { TokenFilters, RiskLevel } from '@/types';

interface TokenFiltersProps {
  filters: TokenFilters;
  onUpdateFilter: (key: keyof TokenFilters, value: any) => void;
  onResetFilters: () => void;
  loading?: boolean;
}

const riskLevels: { value: RiskLevel | '', label: string, color: string }[] = [
  { value: '', label: 'All Risk Levels', color: 'bg-gray-100 text-gray-800' },
  { value: 'low', label: 'Low Risk', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High Risk', color: 'bg-red-100 text-red-800' },
  { value: 'critical', label: 'Critical Risk', color: 'bg-red-900 text-red-100' },
];

const sortOptions = [
  { value: 'createdAt', label: 'Age' },
  { value: 'riskScore', label: 'Risk Score' },
  { value: 'liquidity', label: 'Liquidity' },
  { value: 'volume', label: 'Volume' },
  { value: 'marketCap', label: 'Market Cap' },
];

export function TokenFilters({ 
  filters, 
  onUpdateFilter, 
  onResetFilters,
  loading = false
}: TokenFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateFilter('search', searchValue.trim() || undefined);
  };

  const handleSearchClear = () => {
    setSearchValue('');
    onUpdateFilter('search', undefined);
  };

  const hasActiveFilters = !!(
    filters.riskLevel || 
    filters.search || 
    filters.minLiquidity || 
    filters.maxRiskScore ||
    filters.hasLPLock !== undefined
  );

  return (
    <div className="space-y-4">
      {/* Search and Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by token name, symbol, or address..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="input pl-10 pr-10"
            />
            {searchValue && (
              <IconButton
                onClick={handleSearchClear}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                size="sm"
                variant="ghost"
              >
                <X className="w-4 h-4" />
              </IconButton>
            )}
          </div>
        </form>

        {/* Risk Level Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Risk Level:
          </span>
          <select
            value={filters.riskLevel || ''}
            onChange={(e) => onUpdateFilter('riskLevel', e.target.value || undefined)}
            className="input w-auto min-w-[140px]"
          >
            {riskLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Sort by:
          </span>
          <select
            value={filters.sortBy || 'createdAt'}
            onChange={(e) => onUpdateFilter('sortBy', e.target.value)}
            className="input w-auto min-w-[120px]"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <IconButton
            onClick={() => onUpdateFilter('sortOrder', filters.sortOrder === 'desc' ? 'asc' : 'desc')}
            variant="outline"
            size="sm"
            title={`Sort ${filters.sortOrder === 'desc' ? 'ascending' : 'descending'}`}
          >
            {filters.sortOrder === 'desc' ? '↓' : '↑'}
          </IconButton>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => setShowAdvanced(!showAdvanced)}
          variant="ghost"
          size="sm"
          icon={<Filter className="w-4 h-4" />}
        >
          Advanced Filters
          {hasActiveFilters && (
            <span className="ml-2 inline-flex items-center justify-center w-4 h-4 text-xs font-medium text-white bg-primary-600 rounded-full">
              •
            </span>
          )}
        </Button>

        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              onClick={onResetFilters}
              variant="ghost"
              size="sm"
              icon={<X className="w-4 h-4" />}
            >
              Clear Filters
            </Button>
          )}
          
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            icon={<RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="card p-4 space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Min Liquidity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Liquidity (USD)
              </label>
              <input
                type="number"
                placeholder="1000"
                value={filters.minLiquidity || ''}
                onChange={(e) => onUpdateFilter('minLiquidity', e.target.value ? Number(e.target.value) : undefined)}
                className="input"
                min="0"
                step="100"
              />
            </div>

            {/* Max Risk Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Risk Score (%)
              </label>
              <input
                type="number"
                placeholder="70"
                value={filters.maxRiskScore ? filters.maxRiskScore * 100 : ''}
                onChange={(e) => onUpdateFilter('maxRiskScore', e.target.value ? Number(e.target.value) / 100 : undefined)}
                className="input"
                min="0"
                max="100"
                step="5"
              />
            </div>

            {/* LP Lock Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LP Lock Status
              </label>
              <select
                value={filters.hasLPLock === undefined ? '' : filters.hasLPLock.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  onUpdateFilter('hasLPLock', value === '' ? undefined : value === 'true');
                }}
                className="input"
              >
                <option value="">All Tokens</option>
                <option value="true">LP Locked Only</option>
                <option value="false">LP Unlocked Only</option>
              </select>
            </div>
          </div>

          {/* Results Limit */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Results per page:
            </label>
            <select
              value={filters.limit || 50}
              onChange={(e) => onUpdateFilter('limit', Number(e.target.value))}
              className="input w-auto"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          
          {filters.search && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Search: "{filters.search}"
              <IconButton
                onClick={() => onUpdateFilter('search', undefined)}
                size="sm"
                variant="ghost"
                className="ml-1 h-4 w-4 text-blue-600 hover:text-blue-800"
              >
                <X className="w-3 h-3" />
              </IconButton>
            </span>
          )}
          
          {filters.riskLevel && (
            <span className={cn(
              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
              riskLevels.find(r => r.value === filters.riskLevel)?.color
            )}>
              {riskLevels.find(r => r.value === filters.riskLevel)?.label}
              <IconButton
                onClick={() => onUpdateFilter('riskLevel', undefined)}
                size="sm"
                variant="ghost"
                className="ml-1 h-4 w-4"
              >
                <X className="w-3 h-3" />
              </IconButton>
            </span>
          )}
          
          {filters.minLiquidity && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Min Liquidity: ${filters.minLiquidity.toLocaleString()}
              <IconButton
                onClick={() => onUpdateFilter('minLiquidity', undefined)}
                size="sm"
                variant="ghost"
                className="ml-1 h-4 w-4 text-green-600 hover:text-green-800"
              >
                <X className="w-3 h-3" />
              </IconButton>
            </span>
          )}
        </div>
      )}
    </div>
  );
}