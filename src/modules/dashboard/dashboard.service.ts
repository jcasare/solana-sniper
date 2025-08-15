import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TokenMonitorService } from '../token-monitor/token-monitor.service';
import { RiskAnalysisService } from '../risk-analysis/risk-analysis.service';
import { SimulationService } from '../simulation/simulation.service';
import { GetTokensQueryDto } from './dto/dashboard.dto';
import { RiskLevel } from '../database/schemas/token.schema';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private databaseService: DatabaseService,
    private tokenMonitorService: TokenMonitorService,
    private riskAnalysisService: RiskAnalysisService,
    private simulationService: SimulationService,
  ) {}

  async forceTokenDiscovery() {
    this.logger.log('Force triggering token discovery...');
    await this.tokenMonitorService.forceTokenDiscovery();
  }

  async fetchAndAnalyzeToken(address: string) {
    this.logger.log(`Fetching token/pair ${address} from DexScreener...`);
    
    // Try to fetch from DexScreener first (handles both token and pair addresses)
    try {
      const tokenData = await this.tokenMonitorService.fetchAndAddToken(address);
      
      if (!tokenData) {
        return {
          success: false,
          message: 'Token/pair not found on DexScreener. Please check the address and try again.',
          address,
        };
      }

      // Get the actual token mint address
      const mintAddress = tokenData.mintAddress || address;
      
      // Fetch the saved token from database for analysis
      const savedToken = await this.databaseService.getToken(mintAddress);
      
      if (!savedToken) {
        return {
          success: false,
          message: 'Token was fetched but could not be saved to database',
          address,
        };
      }

      // Analyze the token
      const result = await this.riskAnalysisService.analyzeToken(savedToken);
      
      // Add to watchlist automatically
      await this.databaseService.updateToken(mintAddress, {
        isWatched: true,
        watchedAt: new Date(),
      });
      
      // Get updated token with watchlist status
      const updatedToken = await this.databaseService.getToken(mintAddress);
      
      // Check if it's a new token (no _id means it was just created)
      const isNewToken = !('_id' in tokenData);
      
      return {
        success: true,
        message: 'Token fetched from DexScreener, analyzed, and added to watchlist',
        token: updatedToken || result.token,
        analysis: result.analysis,
        isNew: isNewToken,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch and analyze token/pair ${address}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to fetch token',
        address,
      };
    }
  }

  async getSystemOverview() {
    const [tokenStats, monitoringStatus, analysisStats, simulationInsights] = await Promise.all([
      this.databaseService.getTokenStatistics(),
      this.tokenMonitorService.getMonitoringStatus(),
      this.riskAnalysisService.getAnalysisStats(),
      this.simulationService.getSimulationInsights(),
    ]);

    return {
      tokens: {
        total: tokenStats.totalActiveTokens,
        recentlyAdded: tokenStats.recentlyAdded,
        riskDistribution: tokenStats.riskDistribution,
      },
      monitoring: {
        status: monitoringStatus.discovery.isRunning ? 'active' : 'idle',
        tokensDiscovered: monitoringStatus.discovery.totalDiscovered,
      },
      analysis: {
        isAnalyzing: analysisStats.isAnalyzing,
        highRiskTokens: analysisStats.highRiskTokens,
        recentAnalyses: analysisStats.recentAnalyses,
      },
      simulation: {
        totalSimulations: simulationInsights.simulationStats.totalSimulations,
        accuracy: simulationInsights.decisionAccuracy.accuracy,
        isSimulating: simulationInsights.isCurrentlySimulating,
      },
      lastUpdated: new Date(),
    };
  }

  async getTokens(query: GetTokensQueryDto) {
    const { riskLevel, limit = 50, offset = 0, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    if (riskLevel) {
      const tokens = await this.databaseService.getTokensByRiskLevel(riskLevel, limit);
      return {
        tokens: tokens.slice(offset),
        pagination: {
          total: tokens.length,
          limit,
          offset,
          hasMore: tokens.length > offset + limit,
        },
      };
    }

    // Get all active tokens for search or get medium risk tokens by default
    const tokens = search 
      ? await this.databaseService.getAllActiveTokens(limit * 4) 
      : await this.databaseService.getTokensByRiskLevel(RiskLevel.MEDIUM, limit * 2);
    
    let filteredTokens = tokens;
    if (search) {
      filteredTokens = tokens.filter(token => 
        token.symbol.toLowerCase().includes(search.toLowerCase()) ||
        token.name.toLowerCase().includes(search.toLowerCase()) ||
        token.mintAddress.toLowerCase().includes(search.toLowerCase())
      );
    }

    filteredTokens.sort((a, b) => {
      const aVal = this.getSortValue(a, sortBy);
      const bVal = this.getSortValue(b, sortBy);
      
      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      } else {
        return aVal > bVal ? 1 : -1;
      }
    });

    return {
      tokens: filteredTokens.slice(offset, offset + limit),
      pagination: {
        total: filteredTokens.length,
        limit,
        offset,
        hasMore: filteredTokens.length > offset + limit,
      },
    };
  }

  async getHighRiskTokens(limit = 50) {
    const tokens = await this.databaseService.getHighRiskTokens(limit);
    return {
      tokens,
      count: tokens.length,
      criteria: 'Risk score >= 0.7',
    };
  }

  async getTokenDetails(mintAddress: string) {
    const token = await this.databaseService.getToken(mintAddress);
    if (!token) {
      throw new NotFoundException(`Token with address ${mintAddress} not found`);
    }

    const [latestAnalysis, analysisHistory] = await Promise.all([
      this.databaseService.getLatestAnalysis(mintAddress),
      this.databaseService.getAnalysisHistory(mintAddress, 5),
    ]);

    return {
      token,
      latestAnalysis,
      analysisHistory,
    };
  }

  async getTokenAnalysisHistory(mintAddress: string) {
    const history = await this.databaseService.getAnalysisHistory(mintAddress, 20);
    return {
      mintAddress,
      analyses: history,
      count: history.length,
    };
  }

  async analyzeToken(mintAddress: string) {
    const token = await this.databaseService.getToken(mintAddress);
    if (!token) {
      throw new NotFoundException(`Token with address ${mintAddress} not found`);
    }

    try {
      const result = await this.riskAnalysisService.analyzeToken(token);
      return {
        success: true,
        token: result.token,
        analysis: result.analysis,
        analyzedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Manual analysis failed for ${mintAddress}:`, error);
      return {
        success: false,
        error: error.message,
        mintAddress,
      };
    }
  }

  async simulateToken(mintAddress: string, profile: 'conservative' | 'moderate' | 'aggressive' = 'moderate') {
    const token = await this.databaseService.getToken(mintAddress);
    if (!token) {
      throw new NotFoundException(`Token with address ${mintAddress} not found`);
    }

    const result = await this.simulationService.simulateTokenResponse(token, undefined, profile);
    return {
      success: true,
      simulation: result,
      profile,
      simulatedAt: new Date(),
    };
  }

  async simulateTokenAllProfiles(mintAddress: string) {
    const token = await this.databaseService.getToken(mintAddress);
    if (!token) {
      throw new NotFoundException(`Token with address ${mintAddress} not found`);
    }

    const result = await this.simulationService.simulateMultipleProfiles(token);
    return {
      success: true,
      ...result,
      simulatedAt: new Date(),
    };
  }

  async getSystemStatistics() {
    const [tokenStats, analysisStats, simulationInsights] = await Promise.all([
      this.databaseService.getTokenStatistics(),
      this.riskAnalysisService.getAnalysisStats(),
      this.simulationService.getSimulationInsights(),
    ]);

    return {
      tokens: tokenStats,
      analysis: analysisStats,
      simulation: simulationInsights,
      generatedAt: new Date(),
    };
  }

  async getMonitoringStatus() {
    return this.tokenMonitorService.getMonitoringStatus();
  }

  async getSimulationInsights() {
    return this.simulationService.getSimulationInsights();
  }

  async getSimulationLogs(limit = 100, offset = 0, days?: number) {
    const result = await this.databaseService.getSimulationLogs(limit, offset, days);
    
    return {
      logs: result.logs.map(log => ({
        id: log._id,
        tokenSymbol: log.tokenMintAddress, // This will need to be populated with actual symbol
        tokenAddress: log.tokenMintAddress,
        action: log.decision.action,
        wouldInvest: log.decision.wouldInvest,
        maxInvestment: log.decision.maxInvestmentUSD || 0,
        confidence: log.decision.confidence,
        reasoning: log.decision.reasoning,
        timestamp: log.simulationTimestamp.toISOString(),
        riskScore: log.riskScore,
        marketConditions: log.marketConditions
      })),
      total: result.total,
      pagination: {
        limit,
        offset,
        hasMore: result.total > offset + limit
      }
    };
  }

  async runBacktest(days = 30, profile: 'conservative' | 'moderate' | 'aggressive' = 'moderate') {
    try {
      const result = await this.simulationService.runBacktest(days, profile);
      return {
        success: true,
        backtest: result,
        parameters: { days, profile },
        runAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Backtest failed:', error);
      return {
        success: false,
        error: error.message,
        parameters: { days, profile },
      };
    }
  }

  async getActiveAlerts() {
    const highRiskTokens = await this.databaseService.getHighRiskTokens(20);
    
    const alerts = highRiskTokens.map(token => ({
      id: token._id,
      type: 'high_risk_token',
      severity: token.riskLevel === 'critical' ? 'critical' : 'high',
      title: `High Risk Token: ${token.symbol}`,
      message: `Token ${token.symbol} has a risk score of ${(token.riskScore * 100).toFixed(1)}%`,
      tokenAddress: token.mintAddress,
      riskScore: token.riskScore,
      reasons: token.riskReasons.slice(0, 3),
      createdAt: token.lastAnalyzedAt,
    }));

    return {
      alerts,
      count: alerts.length,
      lastUpdated: new Date(),
    };
  }

  async getWatchlist(limit = 100, search?: string) {
    try {
      // Direct database query instead of using service method
      let tokens = await this.databaseService.tokenModel
        .find({ isWatched: true })
        .sort({ watchedAt: -1 })
        .limit(limit * 2)
        .lean(); // Use lean() for better performance and serialization
      
      // Apply search filter if provided
      if (search) {
        const searchTerm = search.toLowerCase();
        tokens = tokens.filter(token => 
          token.symbol.toLowerCase().includes(searchTerm) ||
          token.name.toLowerCase().includes(searchTerm) ||
          token.mintAddress.toLowerCase().includes(searchTerm)
        );
      }
      
      // Limit results
      tokens = tokens.slice(0, limit);
      
      return {
        tokens,
        count: tokens.length,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Error in getWatchlist:', error);
      return {
        tokens: [],
        count: 0,
        lastUpdated: new Date(),
        error: error.message,
      };
    }
  }

  async addToWatchlist(mintAddress: string) {
    const token = await this.databaseService.getToken(mintAddress);
    if (!token) {
      throw new NotFoundException(`Token with address ${mintAddress} not found`);
    }

    const updatedToken = await this.databaseService.addToWatchlist(mintAddress);
    return {
      success: true,
      message: `Token ${token.symbol} added to watchlist`,
      token: updatedToken,
    };
  }

  async removeFromWatchlist(mintAddress: string) {
    const token = await this.databaseService.getToken(mintAddress);
    if (!token) {
      throw new NotFoundException(`Token with address ${mintAddress} not found`);
    }

    const updatedToken = await this.databaseService.removeFromWatchlist(mintAddress);
    return {
      success: true,
      message: `Token ${token.symbol} removed from watchlist`,
      token: updatedToken,
    };
  }

  async getTokensDebug() {
    const [totalTokens, activeTokens, watchedTokens, sampleTokens, watchedSample, rawWatchedQuery] = await Promise.all([
      this.databaseService.tokenModel.countDocuments(),
      this.databaseService.tokenModel.countDocuments({ isActive: true }),
      this.databaseService.tokenModel.countDocuments({ isWatched: true }),
      this.databaseService.tokenModel.find().limit(5).select('mintAddress symbol name isActive createdAt'),
      this.databaseService.tokenModel.find({ isWatched: true }).limit(3).select('mintAddress symbol name isWatched watchedAt'),
      this.databaseService.getWatchedTokens(5)
    ]);

    return {
      totalTokens,
      activeTokens,
      watchedTokens,
      sampleTokens,
      watchedSample,
      rawWatchedQuery: rawWatchedQuery.map(t => ({ symbol: t.symbol, isWatched: t.isWatched })),
      timestamp: new Date(),
    };
  }

  async populateSampleTokens() {
    const sampleTokens = [
      {
        mintAddress: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Wrapped SOL',
        decimals: 9,
        totalSupply: '1000000000000000000',
        isActive: true,
        riskScore: 0.1,
        riskLevel: RiskLevel.LOW,
        riskReasons: [],
        analysisCount: 1,
        createdAt: new Date(),
        securityFlags: {
          isHoneypot: false,
          hasRugPullRisk: false,
          ownershipRenounced: true,
          hasLockingMechanism: false,
          hasUnlimitedMinting: false,
          hasBlacklist: false,
          hasWhitelist: false,
          hasPausableFunctionality: false,
        },
        liquidityInfo: {
          totalLiquidityUSD: 1000000,
          lpTokensLocked: true,
          majorLPHolders: [],
        },
        holderAnalysis: {
          totalHolders: 10000,
          topHoldersConcentration: 0.2,
          devWalletPercentage: 0,
          burnedPercentage: 0,
          lpPercentage: 0.1,
          topHolders: [],
        },
      },
      // Add a few more sample tokens
      {
        mintAddress: '45fffdevgaik9mradpfkhnlbfghtsvwqjx3mnlxhv5hk',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 9,
        totalSupply: '1000000000000000',
        isActive: true,
        riskScore: 0.5,
        riskLevel: RiskLevel.MEDIUM,
        riskReasons: ['Low liquidity'],
        analysisCount: 1,
        createdAt: new Date(),
        securityFlags: {
          isHoneypot: false,
          hasRugPullRisk: false,
          ownershipRenounced: false,
          hasLockingMechanism: false,
          hasUnlimitedMinting: false,
          hasBlacklist: false,
          hasWhitelist: false,
          hasPausableFunctionality: false,
        },
        liquidityInfo: {
          totalLiquidityUSD: 5000,
          lpTokensLocked: false,
          majorLPHolders: [],
        },
        holderAnalysis: {
          totalHolders: 100,
          topHoldersConcentration: 0.6,
          devWalletPercentage: 0.1,
          burnedPercentage: 0,
          lpPercentage: 0.05,
          topHolders: [],
        },
      }
    ];

    try {
      // Use upsert to avoid duplicates
      for (const tokenData of sampleTokens) {
        await this.databaseService.updateToken(tokenData.mintAddress, tokenData);
      }

      return {
        success: true,
        message: `Added ${sampleTokens.length} sample tokens`,
        tokens: sampleTokens.map(t => ({ mintAddress: t.mintAddress, symbol: t.symbol, name: t.name })),
      };
    } catch (error) {
      this.logger.error('Failed to populate sample tokens:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async markAllTokensWatched() {
    try {
      const result = await this.databaseService.tokenModel.updateMany(
        { isActive: true },
        { 
          $set: { 
            isWatched: true, 
            watchedAt: new Date() 
          } 
        }
      );
      
      return {
        success: true,
        message: `Marked ${result.modifiedCount} tokens as watched`,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      this.logger.error('Failed to mark all tokens as watched:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private getSortValue(token: any, sortBy: string): any {
    switch (sortBy) {
      case 'riskScore':
        return token.riskScore || 0;
      case 'volume':
        return token.priceInfo?.volume24hUSD || 0;
      case 'liquidity':
        return token.liquidityInfo?.totalLiquidityUSD || 0;
      case 'createdAt':
      default:
        return new Date(token.createdAt).getTime();
    }
  }
}