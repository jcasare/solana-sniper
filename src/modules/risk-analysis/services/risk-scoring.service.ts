import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenDocument, RiskLevel } from '../../database/schemas/token.schema';
import { HoneypotAnalysis } from './honeypot-detector.service';
import { RugpullAnalysis } from './rugpull-detector.service';

export interface RiskAssessment {
  overallRiskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  primaryConcerns: string[];
  recommendation: 'AVOID' | 'EXTREME_CAUTION' | 'MONITOR' | 'ACCEPTABLE';
  reasoning: string;
  componentScores: {
    honeypot: number;
    rugpull: number;
    liquidity: number;
    holders: number;
    social: number;
  };
}

@Injectable()
export class RiskScoringService {
  private readonly logger = new Logger(RiskScoringService.name);
  
  private readonly HIGH_RISK_THRESHOLD: number;
  private readonly MEDIUM_RISK_THRESHOLD: number;

  constructor(private configService: ConfigService) {
    this.HIGH_RISK_THRESHOLD = parseFloat(this.configService.get<string>('HIGH_RISK_THRESHOLD') || '0.7');
    this.MEDIUM_RISK_THRESHOLD = parseFloat(this.configService.get<string>('MEDIUM_RISK_THRESHOLD') || '0.4');
  }

  calculateRiskScore(
    token: TokenDocument,
    honeypotAnalysis: HoneypotAnalysis,
    rugpullAnalysis: RugpullAnalysis
  ): RiskAssessment {
    const weights = {
      honeypot: 0.3,
      rugpull: 0.35,
      liquidity: 0.15,
      holders: 0.15,
      social: 0.05,
    };

    const honeypotScore = honeypotAnalysis.isHoneypot ? honeypotAnalysis.confidence : 0;
    const rugpullScore = rugpullAnalysis.hasRugRisk ? rugpullAnalysis.confidence : 0;
    const liquidityScore = this.calculateLiquidityRisk(token);
    const holdersScore = this.calculateHoldersRisk(token);
    const socialScore = this.calculateSocialRisk(token);

    const overallRiskScore = Math.min(1.0,
      honeypotScore * weights.honeypot +
      rugpullScore * weights.rugpull +
      liquidityScore * weights.liquidity +
      holdersScore * weights.holders +
      socialScore * weights.social
    );

    const riskLevel = this.categorizeRiskLevel(overallRiskScore);
    const recommendation = this.getRecommendation(overallRiskScore, honeypotAnalysis, rugpullAnalysis);
    const confidence = this.calculateConfidence(honeypotAnalysis, rugpullAnalysis);
    const primaryConcerns = this.identifyPrimaryConcerns(honeypotAnalysis, rugpullAnalysis, token);
    const reasoning = this.generateReasoning(overallRiskScore, honeypotAnalysis, rugpullAnalysis, token);

    return {
      overallRiskScore,
      riskLevel,
      confidence,
      primaryConcerns,
      recommendation,
      reasoning,
      componentScores: {
        honeypot: honeypotScore,
        rugpull: rugpullScore,
        liquidity: liquidityScore,
        holders: holdersScore,
        social: socialScore,
      },
    };
  }

  private calculateLiquidityRisk(token: TokenDocument): number {
    const liquidityUSD = token.liquidityInfo?.totalLiquidityUSD || 0;
    const lpTokensLocked = token.liquidityInfo?.lpTokensLocked || false;
    
    let risk = 0;

    if (liquidityUSD < 1000) {
      risk += 0.4;
    } else if (liquidityUSD < 5000) {
      risk += 0.2;
    } else if (liquidityUSD < 10000) {
      risk += 0.1;
    }

    if (!lpTokensLocked) {
      risk += 0.3;
    }

    const lpPercentage = token.holderAnalysis?.lpPercentage || 0;
    if (lpPercentage < 0.5) {
      risk += 0.2;
    }

    return Math.min(1.0, risk);
  }

  private calculateHoldersRisk(token: TokenDocument): number {
    const totalHolders = token.holderAnalysis?.totalHolders || 0;
    const topHoldersConcentration = token.holderAnalysis?.topHoldersConcentration || 0;
    const devWalletPercentage = token.holderAnalysis?.devWalletPercentage || 0;

    let risk = 0;

    if (totalHolders < 10) {
      risk += 0.4;
    } else if (totalHolders < 50) {
      risk += 0.2;
    } else if (totalHolders < 100) {
      risk += 0.1;
    }

    if (topHoldersConcentration > 0.7) {
      risk += 0.4;
    } else if (topHoldersConcentration > 0.5) {
      risk += 0.2;
    } else if (topHoldersConcentration > 0.3) {
      risk += 0.1;
    }

    if (devWalletPercentage > 0.2) {
      risk += 0.3;
    } else if (devWalletPercentage > 0.1) {
      risk += 0.1;
    }

    return Math.min(1.0, risk);
  }

  private calculateSocialRisk(token: TokenDocument): number {
    const hasDescription = token.description && token.description.length > 0;
    const hasImage = token.image && token.image !== '';
    const hasWebsite = token.metadata?.website;
    const hasSocials = token.metadata?.twitter || token.metadata?.telegram;

    let socialSignals = 0;
    if (hasDescription) socialSignals += 0.25;
    if (hasImage) socialSignals += 0.25;
    if (hasWebsite) socialSignals += 0.25;
    if (hasSocials) socialSignals += 0.25;

    return Math.max(0, 1 - socialSignals);
  }

  private categorizeRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= this.HIGH_RISK_THRESHOLD) {
      return riskScore >= 0.9 ? RiskLevel.CRITICAL : RiskLevel.HIGH;
    }
    if (riskScore >= this.MEDIUM_RISK_THRESHOLD) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.LOW;
  }

  private getRecommendation(
    riskScore: number,
    honeypotAnalysis: HoneypotAnalysis,
    rugpullAnalysis: RugpullAnalysis
  ): 'AVOID' | 'EXTREME_CAUTION' | 'MONITOR' | 'ACCEPTABLE' {
    if (honeypotAnalysis.isHoneypot || riskScore >= 0.8) {
      return 'AVOID';
    }
    
    if (rugpullAnalysis.riskLevel === 'critical' || riskScore >= 0.6) {
      return 'EXTREME_CAUTION';
    }
    
    if (riskScore >= 0.3) {
      return 'MONITOR';
    }
    
    return 'ACCEPTABLE';
  }

  private calculateConfidence(
    honeypotAnalysis: HoneypotAnalysis,
    rugpullAnalysis: RugpullAnalysis
  ): number {
    return Math.min(1.0, (honeypotAnalysis.confidence + rugpullAnalysis.confidence) / 2);
  }

  private identifyPrimaryConcerns(
    honeypotAnalysis: HoneypotAnalysis,
    rugpullAnalysis: RugpullAnalysis,
    token: TokenDocument
  ): string[] {
    const concerns: string[] = [];

    if (honeypotAnalysis.isHoneypot) {
      concerns.push('HONEYPOT DETECTED');
    }

    if (rugpullAnalysis.riskLevel === 'critical' || rugpullAnalysis.riskLevel === 'high') {
      concerns.push('HIGH RUGPULL RISK');
    }

    if (token.liquidityInfo?.totalLiquidityUSD && token.liquidityInfo.totalLiquidityUSD < 5000) {
      concerns.push('LOW LIQUIDITY');
    }

    if (!token.liquidityInfo?.lpTokensLocked) {
      concerns.push('LP NOT LOCKED');
    }

    if (token.holderAnalysis?.topHoldersConcentration && token.holderAnalysis.topHoldersConcentration > 0.5) {
      concerns.push('HIGH HOLDER CONCENTRATION');
    }

    if (!token.securityFlags?.ownershipRenounced) {
      concerns.push('OWNERSHIP NOT RENOUNCED');
    }

    if (token.securityFlags?.hasUnlimitedMinting) {
      concerns.push('UNLIMITED MINTING');
    }

    return concerns.slice(0, 5);
  }

  private generateReasoning(
    riskScore: number,
    honeypotAnalysis: HoneypotAnalysis,
    rugpullAnalysis: RugpullAnalysis,
    token: TokenDocument
  ): string {
    if (honeypotAnalysis.isHoneypot) {
      return `Token appears to be a honeypot with ${(honeypotAnalysis.confidence * 100).toFixed(0)}% confidence. ${honeypotAnalysis.reasons.slice(0, 2).join('. ')}.`;
    }

    if (rugpullAnalysis.riskLevel === 'critical') {
      return `Critical rugpull risk detected. ${rugpullAnalysis.reasons.slice(0, 2).join('. ')}.`;
    }

    if (riskScore >= 0.7) {
      return `High-risk token due to multiple security concerns. Primary issues: ${this.identifyPrimaryConcerns(honeypotAnalysis, rugpullAnalysis, token).slice(0, 2).join(', ')}.`;
    }

    if (riskScore >= 0.4) {
      return `Medium-risk token with some concerning factors. Monitor closely before any interaction.`;
    }

    return `Token shows acceptable risk levels based on current analysis. Standard caution recommended.`;
  }
}