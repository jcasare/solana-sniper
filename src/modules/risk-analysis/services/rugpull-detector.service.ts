import { Injectable, Logger } from '@nestjs/common';
import { TokenDocument } from '../../database/schemas/token.schema';

export interface RugpullAnalysis {
  hasRugRisk: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reasons: string[];
  timeToRug?: string;
  evidence: any[];
}

@Injectable()
export class RugpullDetectorService {
  private readonly logger = new Logger(RugpullDetectorService.name);

  async analyzeToken(token: TokenDocument): Promise<RugpullAnalysis> {
    const startTime = Date.now();
    const evidence: any[] = [];
    const reasons: string[] = [];
    let riskScore = 0;

    try {
      const devWalletRisk = this.analyzeDevWallet(token, evidence);
      const liquidityRisk = this.analyzeLiquidityRisk(token, evidence);
      const ownershipRisk = this.analyzeOwnership(token, evidence);
      const tokenAgeRisk = this.analyzeTokenAge(token, evidence);
      const socialSignalsRisk = this.analyzeSocialSignals(token, evidence);
      const marketBehaviorRisk = this.analyzeMarketBehavior(token, evidence);

      riskScore += devWalletRisk.risk;
      riskScore += liquidityRisk.risk;
      riskScore += ownershipRisk.risk;
      riskScore += tokenAgeRisk.risk;
      riskScore += socialSignalsRisk.risk;
      riskScore += marketBehaviorRisk.risk;

      reasons.push(...devWalletRisk.reasons);
      reasons.push(...liquidityRisk.reasons);
      reasons.push(...ownershipRisk.reasons);
      reasons.push(...tokenAgeRisk.reasons);
      reasons.push(...socialSignalsRisk.reasons);
      reasons.push(...marketBehaviorRisk.reasons);

      const hasRugRisk = riskScore > 0.4;
      const riskLevel = this.categorizeRiskLevel(riskScore);
      const confidence = Math.min(riskScore, 1.0);
      const timeToRug = this.estimateTimeToRug(riskScore, token);

      this.logger.debug(`Rugpull analysis completed for ${token.symbol} in ${Date.now() - startTime}ms: ${riskLevel.toUpperCase()} risk (confidence: ${confidence.toFixed(2)})`);

      return {
        hasRugRisk,
        riskLevel,
        confidence,
        reasons: reasons.filter(Boolean),
        timeToRug,
        evidence,
      };
    } catch (error) {
      this.logger.error(`Rugpull analysis failed for ${token.symbol}:`, error);
      return {
        hasRugRisk: false,
        riskLevel: 'low',
        confidence: 0,
        reasons: ['Analysis failed'],
        evidence: [],
      };
    }
  }

  private analyzeDevWallet(token: TokenDocument, evidence: any[]): { risk: number; reasons: string[] } {
    const reasons: string[] = [];
    let risk = 0;

    const devWalletPercentage = token.holderAnalysis?.devWalletPercentage || 0;
    const topHolders = token.holderAnalysis?.topHolders || [];

    if (devWalletPercentage > 0.2) {
      risk += 0.4;
      reasons.push('Developer holds significant portion of tokens');
      evidence.push({
        test: 'dev_wallet_concentration',
        result: 'FAIL',
        details: `Dev wallet holds ${(devWalletPercentage * 100).toFixed(1)}% of supply`,
      });
    }

    const suspiciousHolders = topHolders.filter(holder => 
      holder.percentage > 0.1 && !holder.isLP && !holder.isBurn
    );

    if (suspiciousHolders.length > 3) {
      risk += 0.2;
      reasons.push('Multiple large non-LP holders detected');
      evidence.push({
        test: 'suspicious_holders_check',
        result: 'WARN',
        details: `${suspiciousHolders.length} holders with >10% each`,
      });
    }

    return { risk, reasons };
  }

  private analyzeLiquidityRisk(token: TokenDocument, evidence: any[]): { risk: number; reasons: string[] } {
    const reasons: string[] = [];
    let risk = 0;

    const liquidityUSD = token.liquidityInfo?.totalLiquidityUSD || 0;
    const lpTokensLocked = token.liquidityInfo?.lpTokensLocked || false;
    const lpUnlockTime = token.liquidityInfo?.lpUnlockTime;

    if (!lpTokensLocked) {
      risk += 0.5;
      reasons.push('LP tokens are not locked - rug risk HIGH');
      evidence.push({
        test: 'lp_lock_status',
        result: 'FAIL',
        details: 'LP tokens not locked',
      });
    } else if (lpUnlockTime) {
      const timeToUnlock = new Date(lpUnlockTime).getTime() - Date.now();
      const daysToUnlock = timeToUnlock / (1000 * 60 * 60 * 24);
      
      if (daysToUnlock < 30) {
        risk += 0.3;
        reasons.push('LP tokens unlock soon');
        evidence.push({
          test: 'lp_unlock_time',
          result: 'WARN',
          details: `LP unlocks in ${daysToUnlock.toFixed(1)} days`,
        });
      }
    }

    if (liquidityUSD < 5000) {
      risk += 0.2;
      reasons.push('Low liquidity makes rug easier');
      evidence.push({
        test: 'liquidity_depth',
        result: 'WARN',
        details: `Low liquidity: $${liquidityUSD}`,
      });
    }

    const lpPercentage = token.holderAnalysis?.lpPercentage || 0;
    if (lpPercentage < 0.7) {
      risk += 0.2;
      reasons.push('Low percentage of tokens in LP');
      evidence.push({
        test: 'lp_percentage',
        result: 'WARN',
        details: `Only ${(lpPercentage * 100).toFixed(1)}% in LP`,
      });
    }

    return { risk, reasons };
  }

  private analyzeOwnership(token: TokenDocument, evidence: any[]): { risk: number; reasons: string[] } {
    const reasons: string[] = [];
    let risk = 0;

    if (!token.securityFlags?.ownershipRenounced) {
      risk += 0.3;
      reasons.push('Contract ownership not renounced');
      evidence.push({
        test: 'ownership_renounced',
        result: 'FAIL',
        details: 'Contract ownership not renounced',
      });
    }

    if (token.securityFlags?.hasUnlimitedMinting) {
      risk += 0.3;
      reasons.push('Unlimited minting possible');
      evidence.push({
        test: 'mint_authority',
        result: 'FAIL',
        details: 'Mint authority not renounced',
      });
    }

    if (token.securityFlags?.hasBlacklist) {
      risk += 0.2;
      reasons.push('Token has blacklist functionality');
      evidence.push({
        test: 'blacklist_function',
        result: 'FAIL',
        details: 'Blacklist functionality detected',
      });
    }

    return { risk, reasons };
  }

  private analyzeTokenAge(token: TokenDocument, evidence: any[]): { risk: number; reasons: string[] } {
    const reasons: string[] = [];
    let risk = 0;

    const tokenAge = Date.now() - new Date(token.createdAt).getTime();
    const ageInHours = tokenAge / (1000 * 60 * 60);
    const ageInDays = ageInHours / 24;

    if (ageInHours < 1) {
      risk += 0.3;
      reasons.push('Token is extremely new (< 1 hour)');
      evidence.push({
        test: 'token_age',
        result: 'WARN',
        details: `Token age: ${ageInHours.toFixed(1)} hours`,
      });
    } else if (ageInDays < 1) {
      risk += 0.2;
      reasons.push('Token is very new (< 1 day)');
      evidence.push({
        test: 'token_age',
        result: 'CAUTION',
        details: `Token age: ${ageInDays.toFixed(1)} days`,
      });
    } else if (ageInDays < 7) {
      risk += 0.1;
      reasons.push('Token is relatively new (< 1 week)');
      evidence.push({
        test: 'token_age',
        result: 'INFO',
        details: `Token age: ${ageInDays.toFixed(1)} days`,
      });
    }

    return { risk, reasons };
  }

  private analyzeSocialSignals(token: TokenDocument, evidence: any[]): { risk: number; reasons: string[] } {
    const reasons: string[] = [];
    let risk = 0;

    const hasWebsite = token.metadata?.website;
    const hasTwitter = token.metadata?.twitter;
    const hasTelegram = token.metadata?.telegram;
    const hasDescription = token.description && token.description.length > 0;

    let socialScore = 0;
    if (hasWebsite) socialScore += 0.25;
    if (hasTwitter) socialScore += 0.25;
    if (hasTelegram) socialScore += 0.25;
    if (hasDescription) socialScore += 0.25;

    if (socialScore < 0.25) {
      risk += 0.3;
      reasons.push('No social presence or documentation');
      evidence.push({
        test: 'social_presence',
        result: 'FAIL',
        details: 'No social media or website links',
      });
    } else if (socialScore < 0.5) {
      risk += 0.1;
      reasons.push('Limited social presence');
      evidence.push({
        test: 'social_presence',
        result: 'WARN',
        details: 'Minimal social media presence',
      });
    }

    return { risk, reasons };
  }

  private analyzeMarketBehavior(token: TokenDocument, evidence: any[]): { risk: number; reasons: string[] } {
    const reasons: string[] = [];
    let risk = 0;

    const volume24h = token.priceInfo?.volume24hUSD || 0;
    const marketCap = token.priceInfo?.marketCapUSD || 0;
    const priceChange24h = token.priceInfo?.priceChange24h || 0;

    if (volume24h === 0) {
      risk += 0.2;
      reasons.push('No trading activity');
      evidence.push({
        test: 'trading_activity',
        result: 'FAIL',
        details: 'Zero trading volume',
      });
    }

    if (priceChange24h > 1000) {
      risk += 0.3;
      reasons.push('Extreme price pump detected');
      evidence.push({
        test: 'price_behavior',
        result: 'WARN',
        details: `Price up ${priceChange24h.toFixed(1)}% in 24h`,
      });
    }

    if (marketCap > 0 && volume24h > 0) {
      const volumeToMcapRatio = volume24h / marketCap;
      if (volumeToMcapRatio > 5) {
        risk += 0.2;
        reasons.push('Unusual volume to market cap ratio');
        evidence.push({
          test: 'volume_mcap_ratio',
          result: 'WARN',
          details: `V/MC ratio: ${volumeToMcapRatio.toFixed(2)}`,
        });
      }
    }

    return { risk, reasons };
  }

  private categorizeRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 0.8) return 'critical';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.4) return 'medium';
    return 'low';
  }

  private estimateTimeToRug(riskScore: number, token: TokenDocument): string | undefined {
    if (riskScore < 0.6) return undefined;

    const lpUnlockTime = token.liquidityInfo?.lpUnlockTime;
    if (lpUnlockTime) {
      const timeToUnlock = new Date(lpUnlockTime).getTime() - Date.now();
      const daysToUnlock = Math.max(0, timeToUnlock / (1000 * 60 * 60 * 24));
      return `${daysToUnlock.toFixed(1)} days (LP unlock)`;
    }

    if (riskScore >= 0.9) return '< 24 hours';
    if (riskScore >= 0.8) return '1-7 days';
    if (riskScore >= 0.6) return '1-4 weeks';
    
    return 'Unknown';
  }
}