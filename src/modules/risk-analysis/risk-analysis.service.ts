import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { TokenDocument } from '../database/schemas/token.schema';
import { HoneypotDetectorService } from './services/honeypot-detector.service';
import { RugpullDetectorService } from './services/rugpull-detector.service';
import { LiquidityAnalyzerService } from './services/liquidity-analyzer.service';
import { HolderAnalyzerService } from './services/holder-analyzer.service';
import { RiskScoringService } from './services/risk-scoring.service';

@Injectable()
export class RiskAnalysisService {
  private readonly logger = new Logger(RiskAnalysisService.name);
  private isAnalyzing = false;

  constructor(
    private databaseService: DatabaseService,
    private honeypotDetectorService: HoneypotDetectorService,
    private rugpullDetectorService: RugpullDetectorService,
    private liquidityAnalyzerService: LiquidityAnalyzerService,
    private holderAnalyzerService: HolderAnalyzerService,
    private riskScoringService: RiskScoringService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async analyzeTokensScheduled() {
    if (this.isAnalyzing) {
      return;
    }

    this.isAnalyzing = true;
    try {
      const tokensToAnalyze = await this.databaseService.getTokensRequiringReanalysis(60 * 60 * 1000);
      
      if (tokensToAnalyze.length === 0) {
        return;
      }

      this.logger.log(`Analyzing ${tokensToAnalyze.length} tokens...`);
      
      const batchSize = 5;
      for (let i = 0; i < tokensToAnalyze.length; i += batchSize) {
        const batch = tokensToAnalyze.slice(i, i + batchSize);
        await Promise.all(batch.map(token => this.analyzeTokenSafely(token)));
        
        await this.delay(1000);
      }

      this.logger.log(`Completed analysis of ${tokensToAnalyze.length} tokens`);
    } catch (error) {
      this.logger.error('Scheduled analysis failed:', error);
    } finally {
      this.isAnalyzing = false;
    }
  }

  async analyzeToken(token: TokenDocument) {
    const startTime = Date.now();
    this.logger.log(`Starting comprehensive analysis for ${token.symbol} (${token.mintAddress})`);

    try {
      const [honeypotAnalysis, rugpullAnalysis, liquidityAnalysis, holderAnalysis] = await Promise.all([
        this.honeypotDetectorService.analyzeToken(token),
        this.rugpullDetectorService.analyzeToken(token),
        this.liquidityAnalyzerService.analyzeToken(token),
        this.holderAnalyzerService.analyzeToken(token),
      ]);

      const riskAssessment = this.riskScoringService.calculateRiskScore(
        token,
        honeypotAnalysis,
        rugpullAnalysis
      );

      const analysisResults = [
        {
          testName: 'honeypot_detection',
          passed: !honeypotAnalysis.isHoneypot,
          score: honeypotAnalysis.confidence,
          details: honeypotAnalysis.reasons.join('; '),
          evidence: honeypotAnalysis.evidence,
        },
        {
          testName: 'rugpull_detection',
          passed: !rugpullAnalysis.hasRugRisk,
          score: rugpullAnalysis.confidence,
          details: rugpullAnalysis.reasons.join('; '),
          evidence: rugpullAnalysis.evidence,
        },
        {
          testName: 'liquidity_analysis',
          passed: liquidityAnalysis.liquidityHealthScore > 0.6,
          score: liquidityAnalysis.liquidityHealthScore,
          details: liquidityAnalysis.riskFactors.join('; '),
          evidence: { liquidityDepthUSD: liquidityAnalysis.liquidityDepthUSD },
        },
        {
          testName: 'holder_analysis',
          passed: holderAnalysis.holderDistribution === 'healthy',
          score: 1 - holderAnalysis.concentrationRisk,
          details: holderAnalysis.riskFactors.join('; '),
          evidence: holderAnalysis.distributionMetrics,
        },
      ];

      const riskReasons = [
        ...honeypotAnalysis.reasons,
        ...rugpullAnalysis.reasons,
        ...liquidityAnalysis.riskFactors,
        ...holderAnalysis.riskFactors,
      ].filter(Boolean);

      const updatedToken = await this.databaseService.updateToken(token.mintAddress, {
        riskScore: riskAssessment.overallRiskScore,
        riskLevel: riskAssessment.riskLevel,
        riskReasons: riskReasons.slice(0, 10),
        analysisCount: token.analysisCount + 1,
        securityFlags: {
          ...token.securityFlags,
          isHoneypot: honeypotAnalysis.isHoneypot,
          hasRugPullRisk: rugpullAnalysis.hasRugRisk,
        },
      });

      await this.databaseService.saveRiskAnalysis({
        tokenMintAddress: token.mintAddress,
        analysisTimestamp: new Date(),
        overallRiskScore: riskAssessment.overallRiskScore,
        riskLevel: riskAssessment.riskLevel,
        analysisResults,
        flaggedReasons: riskReasons.slice(0, 5),
        analysisVersion: '1.0',
        rawData: {
          honeypotAnalysis,
          rugpullAnalysis,
          liquidityAnalysis,
          holderAnalysis,
          riskAssessment,
        },
        analysisDurationMs: Date.now() - startTime,
        isReanalysis: token.analysisCount > 0,
        previousRiskScore: token.riskScore,
      });

      this.logger.log(`Analysis completed for ${token.symbol}: ${riskAssessment.riskLevel.toUpperCase()} risk (${(riskAssessment.overallRiskScore * 100).toFixed(1)}%) in ${Date.now() - startTime}ms`);

      return {
        token: updatedToken,
        analysis: {
          honeypotAnalysis,
          rugpullAnalysis,
          liquidityAnalysis,
          holderAnalysis,
          riskAssessment,
        },
      };
    } catch (error) {
      this.logger.error(`Analysis failed for ${token.symbol}:`, error);
      throw error;
    }
  }

  async getAnalysisStats() {
    const [totalTokens, highRiskTokens, simulationStats] = await Promise.all([
      this.databaseService.getTokenStatistics(),
      this.databaseService.getHighRiskTokens(10),
      this.databaseService.getSimulationStats(),
    ]);

    return {
      totalTokens: totalTokens.totalActiveTokens,
      riskDistribution: totalTokens.riskDistribution,
      highRiskTokens: highRiskTokens.length,
      recentAnalyses: totalTokens.recentlyAdded,
      isAnalyzing: this.isAnalyzing,
      simulationStats,
    };
  }

  private async analyzeTokenSafely(token: TokenDocument) {
    try {
      await this.analyzeToken(token);
    } catch (error) {
      this.logger.error(`Safe analysis failed for ${token.symbol}:`, error.message);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}