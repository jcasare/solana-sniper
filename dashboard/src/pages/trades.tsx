import React, { useState } from 'react';
import Head from 'next/head';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useSimulationInsights, useSimulationLogs } from '@/hooks/useApi';
import { formatCurrency, formatTimeAgo, formatPercentage, cn } from '@/utils';

interface SimulatedTrade {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  action: 'avoid' | 'monitor' | 'investigate' | 'flag';
  wouldInvest: boolean;
  maxInvestment: number;
  confidence: number;
  reasoning: string;
  timestamp: string;
  riskScore: number;
  simulatedReturn?: number;
  outcome?: 'profit' | 'loss' | 'avoided_loss' | 'missed_opportunity';
}

// Helper function to determine outcome based on action and investment decision
const determineOutcome = (action: string, wouldInvest: boolean, riskScore: number): 'profit' | 'loss' | 'avoided_loss' | 'missed_opportunity' => {
  // For high risk tokens (>0.7), avoiding them is considered "avoided_loss"
  if (riskScore > 0.7 && !wouldInvest) return 'avoided_loss';
  
  // For medium risk tokens that we would invest in
  if (riskScore >= 0.3 && riskScore <= 0.7 && wouldInvest) return 'profit';
  
  // For low risk tokens we avoided (missed opportunity)
  if (riskScore < 0.3 && !wouldInvest) return 'missed_opportunity';
  
  // Default cases
  if (wouldInvest && riskScore < 0.5) return 'profit';
  if (!wouldInvest && riskScore > 0.5) return 'avoided_loss';
  
  return 'profit';
};

// Helper function to calculate simulated return based on outcome
const calculateSimulatedReturn = (outcome: string, maxInvestment: number, riskScore: number): number => {
  switch (outcome) {
    case 'profit':
      return Math.floor(maxInvestment * (0.1 + Math.random() * 0.4)); // 10-50% gain
    case 'loss':
      return Math.floor(-maxInvestment * (0.3 + Math.random() * 0.7)); // 30-100% loss
    case 'avoided_loss':
      return Math.floor(-maxInvestment * (0.5 + Math.random() * 0.5)); // Avoided 50-100% loss
    case 'missed_opportunity':
      return Math.floor(maxInvestment * (0.2 + Math.random() * 0.8)); // Missed 20-100% gain
    default:
      return 0;
  }
};

function TradeLogContent() {
  const [filter, setFilter] = useState<'all' | 'profitable' | 'losses' | 'avoided'>('all');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const { data: insights, isLoading } = useSimulationInsights();
  
  // Get simulation logs based on time range
  const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : undefined;
  const { data: simulationData, isLoading: logsLoading, error: logsError } = useSimulationLogs(100, 0, days);
  
  // Transform simulation logs to match SimulatedTrade interface
  const trades: SimulatedTrade[] = simulationData?.logs?.map(log => {
    const outcome = determineOutcome(log.action, log.wouldInvest, log.riskScore);
    const simulatedReturn = calculateSimulatedReturn(outcome, log.maxInvestment, log.riskScore);
    
    return {
      id: log.id,
      tokenSymbol: log.tokenSymbol || log.tokenAddress.slice(0, 8) + '...',
      tokenAddress: log.tokenAddress,
      action: log.action,
      wouldInvest: log.wouldInvest,
      maxInvestment: log.maxInvestment,
      confidence: log.confidence,
      reasoning: log.reasoning,
      timestamp: log.timestamp,
      riskScore: log.riskScore,
      outcome,
      simulatedReturn
    };
  }) || [];

  const filteredTrades = trades.filter(trade => {
    if (filter === 'profitable') return trade.outcome === 'profit';
    if (filter === 'losses') return trade.outcome === 'loss';
    if (filter === 'avoided') return trade.outcome === 'avoided_loss';
    return true;
  });

  const stats = {
    totalSimulations: filteredTrades.length,
    profitableTrades: filteredTrades.filter(t => t.outcome === 'profit').length,
    avoidedLosses: filteredTrades.filter(t => t.outcome === 'avoided_loss').length,
    totalReturn: filteredTrades.reduce((sum, t) => sum + (t.simulatedReturn || 0), 0),
    successRate: filteredTrades.length > 0 ? filteredTrades.filter(t => t.outcome === 'profit' || t.outcome === 'avoided_loss').length / filteredTrades.length : 0
  };

  // Show loading state
  if (logsLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Simulated Trade Log</h1>
            <p className="text-gray-600 mt-1">Loading trade simulations...</p>
          </div>
        </div>
        
        <div className="card p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading simulation logs...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (logsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Simulated Trade Log</h1>
            <p className="text-gray-600 mt-1">Error loading trade simulations</p>
          </div>
        </div>
        
        <div className="card p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Failed to load simulation logs</p>
          <Button
            variant="primary"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Simulated Trade Log</h1>
          <p className="text-gray-600 mt-1">Track automated trading decisions and outcomes</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            size="sm"
          >
            Export CSV
          </Button>
          
          <Button
            variant="primary"
            icon={<RefreshCw className="w-4 h-4" />}
            size="sm"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Simulations</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalSimulations}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Profitable</p>
              <p className="text-2xl font-bold text-green-900">{stats.profitableTrades}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Avoided Losses</p>
              <p className="text-2xl font-bold text-red-900">{stats.avoidedLosses}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Net Return</p>
              <p className={cn(
                "text-2xl font-bold",
                stats.totalReturn >= 0 ? "text-green-900" : "text-red-900"
              )}>
                {formatCurrency(Math.abs(stats.totalReturn))}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-600">Success Rate</p>
              <p className="text-2xl font-bold text-amber-900">
                {formatPercentage(stats.successRate)}
              </p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex space-x-2">
              {(['all', 'profitable', 'losses', 'avoided'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    filter === f
                      ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex space-x-2">
            {(['24h', '7d', '30d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  timeRange === range
                    ? "bg-gray-800 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {range === 'all' ? 'All Time' : range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trade Table */}
      <div className="card overflow-hidden">
        {filteredTrades.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Simulation Logs Found</h3>
            <p className="text-gray-600 mb-4">
              {trades.length === 0 
                ? "No tokens have been simulated yet. Go to a token details page and run a simulation to see results here."
                : "No trades match the current filters. Try adjusting your filter settings."
              }
            </p>
            {trades.length === 0 && (
              <Button
                variant="primary"
                onClick={() => window.location.href = '/'}
              >
                View Tokens
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Time</th>
                  <th className="table-header-cell">Token</th>
                  <th className="table-header-cell">Decision</th>
                  <th className="table-header-cell">Investment</th>
                  <th className="table-header-cell">Confidence</th>
                  <th className="table-header-cell">Result</th>
                  <th className="table-header-cell">Return</th>
                  <th className="table-header-cell">Reasoning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTrades.map((trade) => (
                  <tr key={trade.id} className="table-row hover:bg-gray-50/50">
                  <td className="table-cell">
                    <div className="text-sm text-gray-600">
                      {formatTimeAgo(trade.timestamp)}
                    </div>
                  </td>
                  
                  <td className="table-cell">
                    <div>
                      <div className="font-medium text-gray-900">{trade.tokenSymbol}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {trade.tokenAddress.slice(0, 8)}...
                      </div>
                    </div>
                  </td>
                  
                  <td className="table-cell">
                    <Badge variant="simulation" simulationAction={trade.action}>
                      {trade.action.charAt(0).toUpperCase() + trade.action.slice(1)}
                    </Badge>
                  </td>
                  
                  <td className="table-cell">
                    <div className="text-sm">
                      {trade.wouldInvest ? (
                        <span className="font-medium text-green-600">
                          {formatCurrency(trade.maxInvestment)}
                        </span>
                      ) : (
                        <span className="text-gray-500">No Investment</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full"
                          style={{ width: `${trade.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {formatPercentage(trade.confidence)}
                      </span>
                    </div>
                  </td>
                  
                  <td className="table-cell">
                    {trade.outcome === 'profit' && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Profit</span>
                      </div>
                    )}
                    {trade.outcome === 'loss' && (
                      <div className="flex items-center space-x-1 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Loss</span>
                      </div>
                    )}
                    {trade.outcome === 'avoided_loss' && (
                      <div className="flex items-center space-x-1 text-amber-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Avoided</span>
                      </div>
                    )}
                    {trade.outcome === 'missed_opportunity' && (
                      <div className="flex items-center space-x-1 text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">Missed</span>
                      </div>
                    )}
                  </td>
                  
                  <td className="table-cell">
                    {trade.simulatedReturn !== undefined && (
                      <span className={cn(
                        "font-medium",
                        trade.simulatedReturn >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {trade.simulatedReturn >= 0 ? '+' : ''}
                        {formatCurrency(trade.simulatedReturn)}
                      </span>
                    )}
                  </td>
                  
                  <td className="table-cell">
                    <div className="text-sm text-gray-600 max-w-xs truncate">
                      {trade.reasoning}
                    </div>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Performance Chart Placeholder */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Over Time</h3>
        <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Chart visualization coming soon...</p>
        </div>
      </div>
    </div>
  );
}

export default function TradeLogPage() {
  return (
    <>
      <Head>
        <title>Trade Log - Solana Security Monitor</title>
        <meta name="description" content="View simulated trading decisions and outcomes" />
      </Head>

      <Layout>
        <ErrorBoundary>
          <TradeLogContent />
        </ErrorBoundary>
      </Layout>
    </>
  );
}