import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Search, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/common/Button';
import { LoadingCard } from '@/components/common/LoadingSpinner';
import { RiskBadge } from '@/components/common/Badge';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useTokenDetails, useAnalyzeToken, useFetchAndAnalyzeToken } from '@/hooks/useApi';
import { useTokenSearch } from '@/hooks/useApi';
import { isValidSolanaAddress, formatCurrency, formatTimeAgo, truncateAddress } from '@/utils';
import toast from 'react-hot-toast';

function ManualLookupContent() {
  const [searchInput, setSearchInput] = useState('');
  const [lookupAddress, setLookupAddress] = useState<string | null>(null);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const router = useRouter();

  const { results: searchResults, loading: searchLoading, search } = useTokenSearch();
  const { data: tokenDetails, isLoading: detailsLoading, error: detailsError } = useTokenDetails(
    lookupAddress || '', 
    !!lookupAddress
  );
  const analyzeTokenMutation = useAnalyzeToken();
  const fetchTokenMutation = useFetchAndAnalyzeToken();

  const handleInputChange = (value: string) => {
    setSearchInput(value);
    const valid = isValidSolanaAddress(value);
    setIsValidAddress(valid);
    
    if (valid) {
      setLookupAddress(value);
    } else if (value.length >= 2) {
      // Search by name/symbol if not a valid address
      search(value);
      setLookupAddress(null);
    }
  };

  const handleLookup = () => {
    if (isValidAddress) {
      setLookupAddress(searchInput);
    }
  };

  const handleAnalyze = async () => {
    if (!lookupAddress) return;
    
    try {
      await analyzeTokenMutation.mutateAsync(lookupAddress);
      toast.success('Analysis completed successfully');
      // Refresh token details after analysis
      window.location.reload();
    } catch (error) {
      toast.error('Analysis failed');
    }
  };

  const handleFetchAndAnalyze = async () => {
    if (!lookupAddress) return;
    
    try {
      toast.loading('Fetching token from DexScreener...', { id: 'fetch' });
      const result = await fetchTokenMutation.mutateAsync(lookupAddress);
      toast.success('Token fetched and analyzed! Added to watchlist.', { id: 'fetch' });
      
      // Force refresh the token details after successful fetch
      if (result.success && result.token) {
        setLookupAddress(result.token.mintAddress);
      }
    } catch (error) {
      toast.error('Failed to fetch token. Please check the address.', { id: 'fetch' });
    }
  };

  const handleViewDetails = (address: string) => {
    router.push(`/token/${address}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Input */}
      <div className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Token Lookup</h2>
        <p className="text-gray-600 mb-4">
          Enter a Solana token address, pair address (like from DexScreener URLs), or search by token name/symbol.
        </p>
        
        <div className="space-y-2">
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Enter token address, name, or symbol..."
              value={searchInput}
              onChange={(e) => handleInputChange(e.target.value)}
              className="input flex-1"
            />
            
            <Button
              onClick={handleLookup}
              disabled={!searchInput || (!isValidAddress && searchResults.length === 0)}
              icon={<Search className="w-4 h-4" />}
            >
              Lookup
            </Button>
          </div>
          
          {searchInput && (
            <div className="flex items-center space-x-2">
              {isValidAddress ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Valid Solana address</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-blue-600">
                  <Search className="w-4 h-4" />
                  <span className="text-sm">Searching tokens...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      {!isValidAddress && searchResults.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Search Results</h3>
          <div className="space-y-3">
            {searchResults.slice(0, 10).map((token) => (
              <div
                key={token.mintAddress}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSearchInput(token.mintAddress);
                  setLookupAddress(token.mintAddress);
                  setIsValidAddress(true);
                }}
              >
                <div className="flex items-center space-x-3">
                  {token.image && (
                    <img
                      src={token.image}
                      alt={token.symbol}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">
                      {token.name} ({token.symbol})
                    </div>
                    <div className="text-sm text-gray-500 font-mono">
                      {truncateAddress(token.mintAddress)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <RiskBadge riskLevel={token.riskLevel} riskScore={token.riskScore} />
                  <span className="text-sm text-gray-500">
                    {formatCurrency(token.liquidityInfo?.totalLiquidityUSD || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token Details */}
      {lookupAddress && (
        <div className="space-y-6">
          {detailsLoading && <LoadingCard>Loading token details...</LoadingCard>}
          
          {!!detailsError && (
            <div className="card p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Token Not Found</h3>
              <p className="text-gray-600 mb-4">
                This token/pair address was not found in our database. It may be a new token that hasn't been discovered yet.
              </p>
              <div className="space-y-2">
                <Button
                  onClick={handleFetchAndAnalyze}
                  loading={fetchTokenMutation.isLoading}
                  className="w-full"
                >
                  Fetch from DexScreener & Analyze
                </Button>
                <p className="text-sm text-gray-500">
                  Supports both token addresses and DexScreener pair addresses
                </p>
              </div>
            </div>
          )}

          {tokenDetails && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  {tokenDetails.token.image && (
                    <img
                      src={tokenDetails.token.image}
                      alt={tokenDetails.token.symbol}
                      className="w-12 h-12 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {tokenDetails.token.name} ({tokenDetails.token.symbol})
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 font-mono">
                        {truncateAddress(tokenDetails.token.mintAddress, 8, 6)}
                      </span>
                      <a
                        href={`https://dexscreener.com/solana/${tokenDetails.token.mintAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => handleViewDetails(tokenDetails.token.mintAddress)}
                    variant="outline"
                  >
                    View Full Details
                  </Button>
                  
                  <Button
                    onClick={handleAnalyze}
                    loading={analyzeTokenMutation.isLoading}
                  >
                    Re-analyze
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <RiskBadge 
                    riskLevel={tokenDetails.token.riskLevel} 
                    riskScore={tokenDetails.token.riskScore}
                    size="lg" 
                  />
                  <p className="text-sm text-gray-500 mt-1">Risk Level</p>
                </div>
                
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(tokenDetails.token.liquidityInfo?.totalLiquidityUSD || 0)}
                  </p>
                  <p className="text-sm text-gray-500">Liquidity</p>
                </div>
                
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {tokenDetails.token.holderAnalysis?.totalHolders || 0}
                  </p>
                  <p className="text-sm text-gray-500">Holders</p>
                </div>
                
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {formatTimeAgo(tokenDetails.token.createdAt)}
                  </p>
                  <p className="text-sm text-gray-500">Age</p>
                </div>
              </div>

              {/* Risk Factors */}
              {tokenDetails.token.riskReasons && tokenDetails.token.riskReasons.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Risk Factors</h4>
                  <div className="space-y-2">
                    {tokenDetails.token.riskReasons.slice(0, 5).map((reason: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Security Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    {tokenDetails.token.securityFlags?.ownershipRenounced ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm">Ownership Renounced</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {tokenDetails.token.liquidityInfo?.lpTokensLocked ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm">LP Tokens Locked</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!tokenDetails.token.securityFlags?.isHoneypot ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm">Not a Honeypot</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!tokenDetails.token.securityFlags?.hasUnlimitedMinting ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm">Limited Supply</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-medium text-blue-900 mb-2">How to Use</h3>
        <div className="text-blue-800 space-y-2">
          <p>• <strong>Token Address:</strong> Enter a complete Solana token address (32-44 characters) for detailed analysis</p>
          <p>• <strong>Pair Address:</strong> Use DexScreener pair addresses (from URLs like dexscreener.com/solana/[pair-address])</p>
          <p>• <strong>Search:</strong> Type part of a token name or symbol to find tokens in our database</p>
          <p>• <strong>Analysis:</strong> Click "Lookup" to fetch from DexScreener and run security analysis</p>
          <p>• <strong>Sources:</strong> We discover tokens from DexScreener, trending lists, and PumpFun</p>
        </div>
      </div>
    </div>
  );
}

export default function ManualLookupPage() {
  return (
    <>
      <Head>
        <title>Manual Token Lookup - Solana Security Monitor</title>
        <meta name="description" content="Look up and analyze any Solana token by address or name" />
      </Head>

      <Layout>
        <ErrorBoundary>
          <ManualLookupContent />
        </ErrorBoundary>
      </Layout>
    </>
  );
}