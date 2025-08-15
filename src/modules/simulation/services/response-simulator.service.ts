import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenDocument, RiskLevel } from '../../database/schemas/token.schema';
import { SimulationAction, SimulationDecision } from '../../database/schemas/simulation-log.schema';

export interface SimulationParameters {
  maxInvestmentUSD: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  minLiquidityUSD: number;
  maxRiskScore: number;
  requireLPLocked: boolean;
  minHolders: number;
}

export interface MarketConditions {
  volatilityIndex: number;
  overallSentiment: 'bearish' | 'neutral' | 'bullish';
  liquidityAvailable: number;
  competitorAnalysis?: any;
}

@Injectable()
export class ResponseSimulatorService {
  private readonly logger = new Logger(ResponseSimulatorService.name);

  constructor(private configService: ConfigService) {}

  simulateResponse(
    token: TokenDocument,
    marketConditions: MarketConditions,
    parameters: SimulationParameters = this.getDefaultParameters()
  ): SimulationDecision {
    const decision = this.makeInvestmentDecision(token, marketConditions, parameters);
    
    this.logger.debug(`Simulation for ${token.symbol}: ${decision.action} (confidence: ${(decision.confidence * 100).toFixed(1)}%)`);
    
    return decision;
  }

  private makeInvestmentDecision(
    token: TokenDocument,
    marketConditions: MarketConditions,
    parameters: SimulationParameters
  ): SimulationDecision {
    const riskScore = token.riskScore || 1.0;
    const liquidityUSD = token.liquidityInfo?.totalLiquidityUSD || 0;
    const holderCount = token.holderAnalysis?.totalHolders || 0;
    const lpLocked = token.liquidityInfo?.lpTokensLocked || false;

    let confidence = 0.5;
    let reasoning = '';
    let action: SimulationAction = SimulationAction.MONITOR;
    let wouldInvest = false;
    let maxInvestmentUSD: number | undefined;

    if (token.securityFlags?.isHoneypot) {
      action = SimulationAction.AVOID;
      confidence = 0.95;
      reasoning = 'Token identified as honeypot - cannot sell tokens after purchase';
      wouldInvest = false;
    } else if (riskScore >= 0.8) {
      action = SimulationAction.AVOID;
      confidence = 0.9;
      reasoning = `Critical risk score (${(riskScore * 100).toFixed(1)}%) - likely scam or rug pull`;
      wouldInvest = false;
    } else if (riskScore >= parameters.maxRiskScore) {
      action = SimulationAction.FLAG;
      confidence = 0.8;
      reasoning = `Risk score (${(riskScore * 100).toFixed(1)}%) exceeds threshold (${(parameters.maxRiskScore * 100).toFixed(1)}%)`;
      wouldInvest = false;
    } else if (liquidityUSD < parameters.minLiquidityUSD) {
      action = SimulationAction.AVOID;
      confidence = 0.8;
      reasoning = `Insufficient liquidity ($${liquidityUSD}) - high slippage risk`;
      wouldInvest = false;
    } else if (parameters.requireLPLocked && !lpLocked) {
      action = SimulationAction.AVOID;
      confidence = 0.85;
      reasoning = 'LP tokens not locked - rug pull risk too high';
      wouldInvest = false;
    } else if (holderCount < parameters.minHolders) {
      action = SimulationAction.INVESTIGATE;
      confidence = 0.7;
      reasoning = `Too few holders (${holderCount}) - need more adoption`;
      wouldInvest = false;
    } else {
      const investmentDecision = this.calculateInvestmentAmount(token, marketConditions, parameters);
      action = investmentDecision.action;
      confidence = investmentDecision.confidence;
      reasoning = investmentDecision.reasoning;
      wouldInvest = investmentDecision.wouldInvest;
      maxInvestmentUSD = investmentDecision.maxInvestmentUSD;
    }

    confidence = this.adjustConfidenceForMarketConditions(confidence, marketConditions);

    return {
      action,
      confidence,
      reasoning,
      wouldInvest,
      maxInvestmentUSD,
    };
  }

  private calculateInvestmentAmount(
    token: TokenDocument,
    marketConditions: MarketConditions,
    parameters: SimulationParameters
  ) {
    const riskScore = token.riskScore || 0.5;
    const liquidityUSD = token.liquidityInfo?.totalLiquidityUSD || 0;
    
    const riskMultiplier = this.getRiskMultiplier(parameters.riskTolerance);
    const baseInvestment = parameters.maxInvestmentUSD * riskMultiplier;
    
    const riskAdjustment = 1 - riskScore;
    const liquidityAdjustment = Math.min(1, liquidityUSD / 50000);
    
    const adjustedInvestment = baseInvestment * riskAdjustment * liquidityAdjustment;
    
    const maxInvestmentUSD = Math.max(0, Math.min(adjustedInvestment, liquidityUSD * 0.05));

    let action: SimulationAction;
    let confidence: number;
    let reasoning: string;
    let wouldInvest: boolean;

    if (maxInvestmentUSD >= baseInvestment * 0.5) {
      action = SimulationAction.MONITOR;
      confidence = 0.7;
      reasoning = `Acceptable risk profile - would invest up to $${maxInvestmentUSD.toFixed(0)}`;
      wouldInvest = true;
    } else if (maxInvestmentUSD >= baseInvestment * 0.2) {
      action = SimulationAction.INVESTIGATE;
      confidence = 0.6;
      reasoning = `Moderate risk - small position ($${maxInvestmentUSD.toFixed(0)}) acceptable`;
      wouldInvest = true;
    } else {
      action = SimulationAction.MONITOR;
      confidence = 0.5;
      reasoning = 'Risk too high for investment - monitor for improvements';
      wouldInvest = false;
    }

    return { action, confidence, reasoning, wouldInvest, maxInvestmentUSD };
  }

  private getRiskMultiplier(riskTolerance: 'conservative' | 'moderate' | 'aggressive'): number {
    switch (riskTolerance) {
      case 'conservative': return 0.3;
      case 'moderate': return 0.6;
      case 'aggressive': return 1.0;
      default: return 0.5;
    }
  }

  private adjustConfidenceForMarketConditions(
    confidence: number,
    marketConditions: MarketConditions
  ): number {
    let adjustment = 1.0;

    if (marketConditions.overallSentiment === 'bearish') {
      adjustment *= 0.8;
    } else if (marketConditions.overallSentiment === 'bullish') {
      adjustment *= 1.1;
    }

    if (marketConditions.volatilityIndex > 0.8) {
      adjustment *= 0.9;
    }

    return Math.min(1.0, confidence * adjustment);
  }

  private getDefaultParameters(): SimulationParameters {
    return {
      maxInvestmentUSD: 1000,
      riskTolerance: 'moderate',
      minLiquidityUSD: parseInt(this.configService.get<string>('MIN_LIQUIDITY_USD') || '1000'),
      maxRiskScore: parseFloat(this.configService.get<string>('MEDIUM_RISK_THRESHOLD') || '0.6'),
      requireLPLocked: true,
      minHolders: 50,
    };
  }

  getSimulationProfiles(): { [key: string]: SimulationParameters } {
    return {
      conservative: {
        maxInvestmentUSD: 500,
        riskTolerance: 'conservative',
        minLiquidityUSD: 10000,
        maxRiskScore: 0.3,
        requireLPLocked: true,
        minHolders: 100,
      },
      moderate: {
        maxInvestmentUSD: 1000,
        riskTolerance: 'moderate',
        minLiquidityUSD: 5000,
        maxRiskScore: 0.5,
        requireLPLocked: true,
        minHolders: 50,
      },
      aggressive: {
        maxInvestmentUSD: 2000,
        riskTolerance: 'aggressive',
        minLiquidityUSD: 1000,
        maxRiskScore: 0.7,
        requireLPLocked: false,
        minHolders: 20,
      },
    };
  }
}