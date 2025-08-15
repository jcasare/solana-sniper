import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  Play, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { RiskBadge, SimulationBadge, StatusBadge } from '@/components/common/Badge';
import { Button, IconButton } from '@/components/common/Button';
import { LoadingCard } from '@/components/common/LoadingSpinner';
import { ErrorBoundary, ApiErrorFallback } from '@/components/common/ErrorBoundary';
import { 
  useTokenDetails, 
  useAnalyzeToken, 
  useSimulateTokenAllProfiles,
  useFetchAndAnalyzeToken 
} from '@/hooks/useApi';
import { useTokenUpdates } from '@/hooks/useWebSocket';
import { 
  formatCurrency, 
  formatPercentage, 
  formatTimeAgo, 
  formatRiskScore,
  truncateAddress,
  copyToClipboard,
  cn
} from '@/utils';
import toast from 'react-hot-toast';

function TokenDetailContent() {
  const router = useRouter();
  const { address } = router.query as { address: string };
  
  const { data: tokenData, isLoading, error, refetch } = useTokenDetails(address, !!address);
  const analyzeTokenMutation = useAnalyzeToken();
  const simulateMutation = useSimulateTokenAllProfiles();
  const fetchTokenMutation = useFetchAndAnalyzeToken();
  
  // Real-time updates for this token
  useTokenUpdates(address);

  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'simulation' | 'history'>('overview');

  const handleAnalyze = async () => {
    if (!address) return;
    
    try {
      await analyzeTokenMutation.mutateAsync(address);
      toast.success('Analysis completed successfully');
      refetch();
    } catch (error) {
      toast.error('Analysis failed');
    }
  };

  const handleSimulate = async () => {
    if (!address) return;
    
    try {
      const result = await simulateMutation.mutateAsync(address);
      toast.success('Simulation completed');
    } catch (error) {
      toast.error('Simulation failed');
    }
  };

  const handleCopyAddress = async () => {
    if (!address) return;
    const success = await copyToClipboard(address);
    if (success) {
      toast.success('Address copied to clipboard');
    }
  };

  if (isLoading) {
    return <LoadingCard>Loading token details...</LoadingCard>;
  }

  if (error || !tokenData) {
    const errorMessage = error && typeof error === 'object' && 'message' in error ? error.message as string : String(error || '');
    const isNotFound = errorMessage.includes('404') || errorMessage.includes('not found');
    
    if (isNotFound && address) {
      return (
        <div className="card p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Token Not Found</h2>
          <p className="text-gray-600 mb-6">
            This token/pair address was not found in our database. It may be a new token that hasn't been discovered yet.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={async () => {
                try {
                  toast.loading('Fetching token from DexScreener...', { id: 'fetch' });
                  await fetchTokenMutation.mutateAsync(address);
                  toast.success('Token fetched and analyzed!', { id: 'fetch' });
                  refetch();
                } catch (error) {
                  toast.error('Failed to fetch token/pair from DexScreener.', { id: 'fetch' });
                }
              }}
              loading={fetchTokenMutation.isLoading}
              variant="primary"
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Fetch from DexScreener
            </Button>
            <Button
              onClick={() => router.back()}
              variant="outline"
            >
              Go Back
            </Button>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Token Address: <span className="font-mono">{address}</span>
          </div>
        </div>
      );
    }
    
    const errorObj = error instanceof Error ? error : new Error('Token not found');
    return <ApiErrorFallback error={errorObj} retry={() => refetch()} />;
  }

  const { token, latestAnalysis, analysisHistory } = tokenData;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'analysis', label: 'Risk Analysis' },
    { id: 'simulation', label: 'Simulation' },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => router.back()}
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          
          <div className="flex items-center space-x-3">
            {token.image && (
              <img
                src={token.image}
                alt={token.symbol}
                className="w-12 h-12 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {token.name} ({token.symbol})
              </h1>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 font-mono">
                  {truncateAddress(token.mintAddress, 8, 6)}
                </span>
                <IconButton
                  onClick={handleCopyAddress}
                  size="sm"
                  variant="ghost"
                >
                  <Copy className="w-4 h-4" />
                </IconButton>
                <a
                  href={`https://dexscreener.com/solana/${token.mintAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={handleAnalyze}
            loading={analyzeTokenMutation.isLoading}
            icon={<RefreshCw className="w-4 h-4" />}
            size="sm"
          >
            Re-analyze
          </Button>
          
          <Button
            onClick={handleSimulate}
            loading={simulateMutation.isLoading}
            variant="outline"
            icon={<Play className="w-4 h-4" />}
            size="sm"
          >
            Simulate
          </Button>
        </div>
      </div>

      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Risk Score</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatRiskScore(token.riskScore)}
              </p>
            </div>
            <RiskBadge riskLevel={token.riskLevel} riskScore={token.riskScore} size="lg" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Liquidity</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(token.liquidityInfo?.totalLiquidityUSD || 0)}
              </p>
            </div>
            {token.liquidityInfo?.lpTokensLocked ? (
              <Lock className="w-8 h-8 text-green-500" />
            ) : (
              <Unlock className="w-8 h-8 text-red-500" />
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">24h Volume</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(token.priceInfo?.volume24hUSD || 0)}
              </p>
            </div>
            {token.priceInfo?.priceChange24h !== undefined && (
              <div className={cn(
                "flex items-center",
                token.priceInfo.priceChange24h >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {token.priceInfo.priceChange24h >= 0 ? (
                  <TrendingUp className="w-8 h-8" />
                ) : (
                  <TrendingDown className="w-8 h-8" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="font-medium">{formatTimeAgo(token.createdAt)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Holders</p>
            <p className="font-medium">{token.holderAnalysis?.totalHolders || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Market Cap</p>
            <p className="font-medium">{formatCurrency(token.priceInfo?.marketCapUSD || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Analysis</p>
            <p className="font-medium">{formatTimeAgo(token.lastAnalyzedAt)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "py-2 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <TokenOverview token={token} />
          )}
          
          {activeTab === 'analysis' && (
            <RiskAnalysisView token={token} analysis={latestAnalysis} />
          )}
          
          {activeTab === 'simulation' && (
            <SimulationView 
              token={token} 
              result={simulateMutation.data}
              loading={simulateMutation.isLoading}
            />
          )}
          
          {activeTab === 'history' && (
            <AnalysisHistory history={analysisHistory} />
          )}
        </div>
      </div>
    </div>
  );
}

// Tab Components
function TokenOverview({ token }: { token: any }) {
  return (
    <div className="space-y-6">
      {/* Security Flags */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security Flags</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(token.securityFlags || {}).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
              {value ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              <span className="text-sm capitalize">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Holder Distribution */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Holders</h3>
        <div className="space-y-3">
          {token.holderAnalysis?.topHolders?.slice(0, 5).map((holder: any, index: number) => (
            <div key={holder.address} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                <span className="font-mono text-sm">{truncateAddress(holder.address)}</span>
                <div className="flex space-x-1">
                  {holder.isLP && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">LP</span>}
                  {holder.isBurn && <span className="text-xs bg-gray-100 text-gray-800 px-1 rounded">Burn</span>}
                  {holder.isDev && <span className="text-xs bg-red-100 text-red-800 px-1 rounded">Dev</span>}
                </div>
              </div>
              <span className="font-medium">
                {formatPercentage(holder.percentage)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RiskAnalysisView({ token, analysis }: { token: any; analysis?: any }) {
  if (!analysis) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No analysis available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Factors</h3>
          <div className="space-y-2">
            {token.riskReasons?.map((reason: string, index: number) => (
              <div key={index} className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Results</h3>
          <div className="space-y-3">
            {analysis.analysisResults?.map((result: any, index: number) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm capitalize">
                    {result.testName.replace(/_/g, ' ')}
                  </span>
                  <StatusBadge status={result.passed ? 'active' : 'error'} size="sm" />
                </div>
                <p className="text-sm text-gray-600">{result.details}</p>
                <p className="text-xs text-gray-500 mt-1">Score: {result.score.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SimulationView({ token, result, loading }: { token: any; result?: any; loading: boolean }) {
  if (loading) {
    return <LoadingCard>Running simulation...</LoadingCard>;
  }

  if (!result) {
    return (
      <div className="text-center py-8">
        <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Click "Simulate" to run analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {result.profileResults?.map((profile: any) => (
          <div key={profile.profile} className="card p-4">
            <h4 className="font-medium text-gray-900 capitalize mb-3">
              {profile.profile} Profile
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Action:</span>
                <SimulationBadge action={profile.decision.action} />
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Confidence:</span>
                <span className="text-sm font-medium">
                  {formatPercentage(profile.decision.confidence)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Would Invest:</span>
                <span className={cn(
                  "text-sm font-medium",
                  profile.decision.wouldInvest ? "text-green-600" : "text-red-600"
                )}>
                  {profile.decision.wouldInvest ? 'Yes' : 'No'}
                </span>
              </div>
              {profile.decision.maxInvestmentUSD && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Max Investment:</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(profile.decision.maxInvestmentUSD)}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600">{profile.decision.reasoning}</p>
            </div>
          </div>
        ))}
      </div>

      {result.consensus && (
        <div className="card p-4">
          <h4 className="font-medium text-gray-900 mb-3">Consensus</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Recommended Action</p>
              <SimulationBadge action={result.consensus.recommendedAction} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Consensus Strength</p>
              <p className="font-medium">{formatPercentage(result.consensus.consensusStrength)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Confidence</p>
              <p className="font-medium">{formatPercentage(result.consensus.averageConfidence)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Agreement</p>
              <p className="font-medium capitalize">{result.consensus.agreement}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisHistory({ history }: { history: any[] }) {
  if (!history.length) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No analysis history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((analysis) => (
        <div key={analysis._id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <RiskBadge riskLevel={analysis.riskLevel} riskScore={analysis.overallRiskScore} />
              <span className="text-sm text-gray-500">
                {formatTimeAgo(analysis.analysisTimestamp)}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {analysis.analysisDurationMs}ms
            </span>
          </div>
          
          <div className="text-sm text-gray-700">
            <p className="mb-2">
              <strong>Flagged reasons:</strong> {analysis.flaggedReasons.join(', ')}
            </p>
            <p>
              <strong>Tests run:</strong> {analysis.analysisResults?.length || 0}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TokenDetailPage() {
  const router = useRouter();
  const { address } = router.query as { address: string };

  return (
    <>
      <Head>
        <title>Token Details - Solana Security Monitor</title>
        <meta name="description" content="Detailed risk analysis for Solana token" />
      </Head>

      <Layout>
        <ErrorBoundary>
          <TokenDetailContent />
        </ErrorBoundary>
      </Layout>
    </>
  );
}