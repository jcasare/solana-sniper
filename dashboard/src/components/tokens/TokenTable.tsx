import React, { useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink, 
  Copy,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { 
  formatCurrency, 
  formatPercentage, 
  formatTimeAgo, 
  truncateAddress,
  copyToClipboard,
  cn
} from '@/utils';
import { Button, IconButton } from '@/components/common/Button';
import { RiskBadge, SimulationBadge, StatusBadge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { Token, TokenFilters } from '@/types';
import toast from 'react-hot-toast';

interface TokenTableProps {
  tokens: Token[];
  loading: boolean;
  filters: TokenFilters;
  onUpdateFilter: (key: keyof TokenFilters, value: any) => void;
  onViewToken: (mintAddress: string) => void;
}

type SortableColumn = 'createdAt' | 'riskScore' | 'volume' | 'liquidity' | 'marketCap';

const columns = [
  { key: 'token', label: 'Token', sortable: false },
  { key: 'createdAt', label: 'Age', sortable: true },
  { key: 'riskScore', label: 'Risk Score', sortable: true },
  { key: 'liquidity', label: 'Liquidity', sortable: true },
  { key: 'volume', label: '24h Volume', sortable: true },
  { key: 'marketCap', label: 'Market Cap', sortable: true },
  { key: 'holders', label: 'Top 10 Holders', sortable: false },
  { key: 'simulation', label: 'Simulated Response', sortable: false },
  { key: 'actions', label: 'Actions', sortable: false },
];

export function TokenTable({ 
  tokens, 
  loading, 
  filters, 
  onUpdateFilter,
  onViewToken
}: TokenTableProps) {
  const handleSort = (column: SortableColumn) => {
    const newOrder = filters.sortBy === column && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    onUpdateFilter('sortBy', column);
    onUpdateFilter('sortOrder', newOrder);
  };

  const handleCopyAddress = async (address: string) => {
    const success = await copyToClipboard(address);
    if (success) {
      toast.success('Address copied to clipboard');
    } else {
      toast.error('Failed to copy address');
    }
  };

  const getSimulationAction = (token: Token): string => {
    // Simple heuristic based on risk score for demo
    if (token.riskScore >= 0.8) return 'avoid';
    if (token.riskScore >= 0.6) return 'flag';
    if (token.riskScore >= 0.4) return 'monitor';
    return 'investigate';
  };

  const SortIcon = ({ column }: { column: SortableColumn }) => {
    if (filters.sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return filters.sortOrder === 'desc' ? (
      <ArrowDown className="w-4 h-4 text-primary-600" />
    ) : (
      <ArrowUp className="w-4 h-4 text-primary-600" />
    );
  };

  if (loading && tokens.length === 0) {
    return (
      <div className="card">
        <div className="p-8 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading tokens...</p>
        </div>
      </div>
    );
  }

  if (!loading && tokens.length === 0) {
    return (
      <div className="card">
        <div className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tokens found</h3>
          <p className="text-gray-600">
            Try adjusting your filters or wait for new tokens to be discovered.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table">
          <thead className="table-header">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="table-header-cell">
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key as SortableColumn)}
                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                    >
                      <span>{column.label}</span>
                      <SortIcon column={column.key as SortableColumn} />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tokens.map((token) => (
              <tr key={token.mintAddress} className="table-row">
                {/* Token Info */}
                <td className="table-cell">
                  <div className="flex items-center space-x-3">
                    {token.image && (
                      <img
                        src={token.image}
                        alt={token.symbol}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{token.symbol}</div>
                      <div className="text-sm text-gray-500 max-w-[150px] truncate">
                        {token.name}
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-400 font-mono">
                          {truncateAddress(token.mintAddress)}
                        </span>
                        <IconButton
                          onClick={() => handleCopyAddress(token.mintAddress)}
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4"
                        >
                          <Copy className="w-3 h-3" />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Age */}
                <td className="table-cell">
                  <div className="text-sm text-gray-900">
                    {formatTimeAgo(token.createdAt)}
                  </div>
                </td>

                {/* Risk Score */}
                <td className="table-cell">
                  <RiskBadge 
                    riskLevel={token.riskLevel} 
                    riskScore={token.riskScore}
                  />
                </td>

                {/* Liquidity */}
                <td className="table-cell">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(token.liquidityInfo?.totalLiquidityUSD || 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {token.liquidityInfo?.lpTokensLocked ? (
                        <span className="text-green-600">🔒 Locked</span>
                      ) : (
                        <span className="text-red-600">🔓 Unlocked</span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Volume */}
                <td className="table-cell">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(token.priceInfo?.volume24hUSD || 0)}
                    </div>
                    {token.priceInfo?.priceChange24h && (
                      <div className={cn(
                        "text-xs",
                        token.priceInfo.priceChange24h >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {token.priceInfo.priceChange24h >= 0 ? '↗' : '↘'} 
                        {formatPercentage(Math.abs(token.priceInfo.priceChange24h) / 100)}
                      </div>
                    )}
                  </div>
                </td>

                {/* Market Cap */}
                <td className="table-cell">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(token.priceInfo?.marketCapUSD || 0)}
                  </div>
                </td>

                {/* Holders */}
                <td className="table-cell">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {formatPercentage(token.holderAnalysis?.topHoldersConcentration || 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {token.holderAnalysis?.totalHolders || 0} holders
                    </div>
                  </div>
                </td>

                {/* Simulation */}
                <td className="table-cell">
                  <SimulationBadge action={getSimulationAction(token)} />
                </td>

                {/* Actions */}
                <td className="table-cell">
                  <div className="flex items-center space-x-2">
                    <IconButton
                      onClick={() => onViewToken(token.mintAddress)}
                      size="sm"
                      variant="outline"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </IconButton>
                    
                    <a
                      href={`https://dexscreener.com/solana/${token.mintAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                      title="View on DexScreener"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && tokens.length > 0 && (
        <div className="flex items-center justify-center p-4 border-t border-gray-200">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-gray-600">Loading more tokens...</span>
        </div>
      )}
    </div>
  );
}