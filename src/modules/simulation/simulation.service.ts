import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { TokenDocument, RiskLevel } from '../database/schemas/token.schema';
import { ResponseSimulatorService, SimulationParameters, MarketConditions } from './services/response-simulator.service';
import { BacktestingService } from './services/backtesting.service';

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);
  private isSimulating = false;

  constructor(
    private databaseService: DatabaseService,
    private responseSimulatorService: ResponseSimulatorService,
    private backtestingService: BacktestingService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runSimulationsScheduled() {
    if (this.isSimulating) {
      return;
    }

    this.isSimulating = true;
    try {
      const recentTokens = await this.databaseService.getTokensByRiskLevel(RiskLevel.MEDIUM, 20);
      const currentMarketConditions = this.getCurrentMarketConditions();

      let simulationCount = 0;
      for (const token of recentTokens) {
        try {
          await this.simulateTokenResponse(token, currentMarketConditions);
          simulationCount++;
        } catch (error) {
          this.logger.error(`Simulation failed for ${token.symbol}:`, error.message);
        }
      }

      if (simulationCount > 0) {
        this.logger.log(`Completed ${simulationCount} token simulations`);
      }
    } catch (error) {
      this.logger.error('Scheduled simulation failed:', error);
    } finally {
      this.isSimulating = false;
    }
  }

  async simulateTokenResponse(
    token: TokenDocument,
    marketConditions?: MarketConditions,
    simulationProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
  ) {
    const conditions = marketConditions || this.getCurrentMarketConditions();
    const profiles = this.responseSimulatorService.getSimulationProfiles();
    const parameters = profiles[simulationProfile];

    const decision = this.responseSimulatorService.simulateResponse(token, conditions, parameters);

    const simulationLog = await this.databaseService.saveSimulationLog({
      tokenMintAddress: token.mintAddress,
      simulationTimestamp: new Date(),
      riskScore: token.riskScore,
      riskLevel: token.riskLevel,
      decision,
      marketConditions: {
        liquidityUSD: token.liquidityInfo?.totalLiquidityUSD || 0,
        volumeUSD: token.priceInfo?.volume24hUSD || 0,
        priceUSD: token.priceInfo?.currentPriceUSD || 0,
        holderCount: token.holderAnalysis?.totalHolders || 0,
      },
      notes: `Simulation profile: ${simulationProfile}`,
    });

    this.logger.debug(`Simulated response for ${token.symbol}: ${decision.action} (confidence: ${(decision.confidence * 100).toFixed(1)}%)`);

    return {
      token,
      decision,
      marketConditions: conditions,
      simulationLog,
    };
  }

  async runBacktest(days = 30, profile: 'conservative' | 'moderate' | 'aggressive' = 'moderate') {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    return this.backtestingService.runBacktest({
      startDate,
      endDate,
      initialBalance: 10000,
      riskTolerance: profile,
    });
  }

  async getSimulationInsights() {
    const [stats, accuracy] = await Promise.all([
      this.databaseService.getSimulationStats(),
      this.backtestingService.analyzeDecisionAccuracy(),
    ]);

    return {
      simulationStats: stats,
      decisionAccuracy: accuracy,
      isCurrentlySimulating: this.isSimulating,
    };
  }

  async simulateMultipleProfiles(token: TokenDocument) {
    const marketConditions = this.getCurrentMarketConditions();
    const profiles = ['conservative', 'moderate', 'aggressive'] as const;

    const results = await Promise.all(
      profiles.map(async (profile) => {
        const result = await this.simulateTokenResponse(token, marketConditions, profile);
        return {
          profile,
          decision: result.decision,
        };
      })
    );

    return {
      token: {
        symbol: token.symbol,
        mintAddress: token.mintAddress,
        riskScore: token.riskScore,
        riskLevel: token.riskLevel,
      },
      marketConditions,
      profileResults: results,
      consensus: this.calculateConsensus(results),
    };
  }

  private getCurrentMarketConditions(): MarketConditions {
    return {
      volatilityIndex: 0.6,
      overallSentiment: 'neutral',
      liquidityAvailable: 1000000,
    };
  }

  private calculateConsensus(results: any[]) {
    const actions = results.map(r => r.decision.action);
    const wouldInvestCount = results.filter(r => r.decision.wouldInvest).length;
    const avgConfidence = results.reduce((sum, r) => sum + r.decision.confidence, 0) / results.length;

    const mostCommonAction = actions.reduce((a, b) =>
      actions.filter(v => v === a).length >= actions.filter(v => v === b).length ? a : b
    );

    return {
      recommendedAction: mostCommonAction,
      consensusStrength: wouldInvestCount / results.length,
      averageConfidence: avgConfidence,
      agreement: actions.every(action => action === actions[0]) ? 'unanimous' : 'mixed',
    };
  }

  getSimulationStatus() {
    return {
      isRunning: this.isSimulating,
      lastRun: new Date(),
      availableProfiles: Object.keys(this.responseSimulatorService.getSimulationProfiles()),
    };
  }
}