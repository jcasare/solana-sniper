import { Injectable, Logger } from '@nestjs/common';
import { TokenDocument } from '../../database/schemas/token.schema';

export interface LiquidityAnalysis {
  liquidityHealthScore: number;
  riskFactors: string[];
  liquidityDepthUSD: number;
  lpLockStatus: 'locked' | 'unlocked' | 'unknown';
  lpUnlockDate?: Date;
  lpRatio: number;
  impactAnalysis: {
    onePercentImpact: number;
    fivePercentImpact: number;
    tenPercentImpact: number;
  };
}

@Injectable()
export class LiquidityAnalyzerService {
  private readonly logger = new Logger(LiquidityAnalyzerService.name);

  async analyzeToken(token: TokenDocument): Promise<LiquidityAnalysis> {
    const liquidityDepthUSD = token.liquidityInfo?.totalLiquidityUSD || 0;
    const lpTokensLocked = token.liquidityInfo?.lpTokensLocked || false;
    const lpUnlockTime = token.liquidityInfo?.lpUnlockTime;
    const lpPercentage = token.holderAnalysis?.lpPercentage || 0;

    const riskFactors: string[] = [];
    let liquidityHealthScore = 1.0;

    if (liquidityDepthUSD < 1000) {
      riskFactors.push('Extremely low liquidity depth');
      liquidityHealthScore -= 0.4;
    } else if (liquidityDepthUSD < 5000) {
      riskFactors.push('Low liquidity depth');
      liquidityHealthScore -= 0.2;
    } else if (liquidityDepthUSD < 10000) {
      riskFactors.push('Moderate liquidity depth');
      liquidityHealthScore -= 0.1;
    }

    if (!lpTokensLocked) {
      riskFactors.push('LP tokens not locked - high rug risk');
      liquidityHealthScore -= 0.3;
    } else if (lpUnlockTime) {
      const daysToUnlock = (new Date(lpUnlockTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysToUnlock < 30) {
        riskFactors.push(`LP unlocks in ${daysToUnlock.toFixed(0)} days`);
        liquidityHealthScore -= 0.2;
      }
    }

    if (lpPercentage < 0.5) {
      riskFactors.push('Low percentage of supply in liquidity pool');
      liquidityHealthScore -= 0.2;
    }

    const impactAnalysis = this.calculatePriceImpact(liquidityDepthUSD);

    return {
      liquidityHealthScore: Math.max(0, liquidityHealthScore),
      riskFactors,
      liquidityDepthUSD,
      lpLockStatus: lpTokensLocked ? 'locked' : 'unlocked',
      lpUnlockDate: lpUnlockTime ? new Date(lpUnlockTime) : undefined,
      lpRatio: lpPercentage,
      impactAnalysis,
    };
  }

  private calculatePriceImpact(liquidityUSD: number) {
    const baseImpact = 100 / Math.sqrt(liquidityUSD);
    
    return {
      onePercentImpact: Math.min(50, baseImpact * 0.01),
      fivePercentImpact: Math.min(100, baseImpact * 0.05),
      tenPercentImpact: Math.min(200, baseImpact * 0.1),
    };
  }
}