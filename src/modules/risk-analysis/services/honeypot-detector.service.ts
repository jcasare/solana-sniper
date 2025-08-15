import { Injectable, Logger } from '@nestjs/common';
import { TokenDocument } from '../../database/schemas/token.schema';

export interface HoneypotAnalysis {
  isHoneypot: boolean;
  confidence: number;
  reasons: string[];
  canSell: boolean;
  sellTax: number;
  buyTax: number;
  evidence: any[];
}

@Injectable()
export class HoneypotDetectorService {
  private readonly logger = new Logger(HoneypotDetectorService.name);

  async analyzeToken(token: TokenDocument): Promise<HoneypotAnalysis> {
    const startTime = Date.now();
    const evidence: any[] = [];
    const reasons: string[] = [];
    let riskScore = 0;

    try {
      const mintAuthority = this.checkMintAuthority(token, evidence);
      const freezeAuthority = this.checkFreezeAuthority(token, evidence);
      const liquidityPattern = this.analyzeLiquidityPattern(token, evidence);
      const holderPattern = this.analyzeHolderPattern(token, evidence);
      const transactionPattern = this.analyzeTransactionPattern(token, evidence);
      const pricePattern = this.analyzePricePattern(token, evidence);

      riskScore += mintAuthority.risk;
      riskScore += freezeAuthority.risk;
      riskScore += liquidityPattern.risk;
      riskScore += holderPattern.risk;
      riskScore += transactionPattern.risk;
      riskScore += pricePattern.risk;

      reasons.push(...mintAuthority.reasons);
      reasons.push(...freezeAuthority.reasons);
      reasons.push(...liquidityPattern.reasons);
      reasons.push(...holderPattern.reasons);
      reasons.push(...transactionPattern.reasons);
      reasons.push(...pricePattern.reasons);

      const isHoneypot = riskScore > 0.6;
      const confidence = Math.min(riskScore, 1.0);

      this.logger.debug(`Honeypot analysis completed for ${token.symbol} in ${Date.now() - startTime}ms: ${isHoneypot ? 'HONEYPOT' : 'SAFE'} (confidence: ${confidence.toFixed(2)})`);

      return {
        isHoneypot,
        confidence,
        reasons: reasons.filter(Boolean),
        canSell: !isHoneypot,
        sellTax: this.estimateSellTax(token),
        buyTax: this.estimateBuyTax(token),
        evidence,
      };
    } catch (error) {
      this.logger.error(`Honeypot analysis failed for ${token.symbol}:`, error);
      return {
        isHoneypot: false,
        confidence: 0,
        reasons: ['Analysis failed'],
        canSell: true,
        sellTax: 0,
        buyTax: 0,
        evidence: [],
      };
    }
  }

  private checkMintAuthority(token: TokenDocument, evidence: any[]): { risk: number; reasons: string[] } {
    const reasons: string[] = [];
    let risk = 0;

    if (token.securityFlags?.hasUnlimitedMinting) {
      risk += 0.3;
      reasons.push('Token has unlimited minting capability');
      evidence.push({
        test: 'mint_authority_check',
        result: 'FAIL',
        details: 'Mint authority not renounced',
      });
    } else {
      evidence.push({
        test: 'mint_authority_check',
        result: 'PASS',
        details: 'Mint authority renounced',
      });
    }

    return { risk, reasons };
  }

  private checkFreezeAuthority(token: TokenDocument, evidence: any[]): { risk: number; reasons: string[] } {
    const reasons: string[] = [];
    let risk = 0;

    if (token.securityFlags?.hasPausableFunctionality) {
      risk += 0.4;
      reasons.push('Token can be frozen by authority');
      evidence.push({
        test: 'freeze_authority_check',
        result: 'FAIL',
        details: 'Freeze authority present - tokens can be frozen',
      });
    } else {
      evidence.push({
        test: 'freeze_authority_check',
        result: 'PASS',
        details: 'No freeze authority',
      });
    }

    return { risk, reasons };
  }

  private analyzeLiquidityPattern(token: TokenDocument, evidence: any[]): { risk: number; reasons: string[] } {
    const reasons: string[] = [];
    let risk = 0;

    const liquidityUSD = token.liquidityInfo?.totalLiquidityUSD || 0;
    
    if (liquidityUSD < 1000) {
      risk += 0.2;
      reasons.push('Very low liquidity detected');
      evidence.push({
        test: 'liquidity_check',
        result: 'WARN',
        details: `Low liquidity: $${liquidityUSD}`,
      });
    } else if (liquidityUSD < 5000) {
      risk += 0.1;
      reasons.push('Low liquidity detected');
      evidence.push({
        test: 'liquidity_check',
        result: 'CAUTION',
        details: `Moderate liquidity: $${liquidityUSD}`,
      });
    } else {
      evidence.push({
        test: 'liquidity_check',
        result: 'PASS',
        details: `Good liquidity: $${liquidityUSD}`,
      });
    }

    if (!token.liquidityInfo?.lpTokensLocked) {
      risk += 0.15;
      reasons.push('LP tokens not locked');
      evidence.push({
        test: 'lp_lock_check',
        result: 'FAIL',
        details: 'LP tokens are not locked',
      });
    }

    return { risk, reasons };
  }

  private analyzeHolderPattern(token: TokenDocument, evidence: any[]): { risk: number; reasons: string[] } {
    const reasons: string[] = [];
    let risk = 0;

    const topHoldersConcentration = token.holderAnalysis?.topHoldersConcentration || 0;
    const totalHolders = token.holderAnalysis?.totalHolders || 0;

    if (topHoldersConcentration > 0.5) {
      risk += 0.3;
      reasons.push('High holder concentration detected');
      evidence.push({
        test: 'holder_concentration_check',
        result: 'FAIL',
        details: `Top holders own ${(topHoldersConcentration * 100).toFixed(1)}% of supply`,
      });
    } else if (topHoldersConcentration > 0.3) {
      risk += 0.1;
      reasons.push('Moderate holder concentration');
      evidence.push({
        test: 'holder_concentration_check',
        result: 'WARN',
        details: `Top holders own ${(topHoldersConcentration * 100).toFixed(1)}% of supply`,
      });
    }

    if (totalHolders < 50) {
      risk += 0.2;
      reasons.push('Very few token holders');
      evidence.push({
        test: 'holder_count_check',
        result: 'WARN',
        details: `Only ${totalHolders} holders`,
      });
    }

    return { risk, reasons };
  }

  private analyzeTransactionPattern(token: TokenDocument, evidence: any[]): { risk: number; reasons: string[] } {
    const reasons: string[] = [];
    let risk = 0;

    const volume24h = token.priceInfo?.volume24hUSD || 0;
    const liquidity = token.liquidityInfo?.totalLiquidityUSD || 0;

    if (volume24h > 0 && liquidity > 0) {
      const volumeToLiquidityRatio = volume24h / liquidity;
      
      if (volumeToLiquidityRatio > 10) {
        risk += 0.2;
        reasons.push('Unusually high volume to liquidity ratio');
        evidence.push({
          test: 'volume_liquidity_ratio_check',
          result: 'WARN',
          details: `V/L ratio: ${volumeToLiquidityRatio.toFixed(2)}`,
        });
      }
    }

    if (volume24h === 0) {
      risk += 0.1;
      reasons.push('No trading volume detected');
      evidence.push({
        test: 'volume_check',
        result: 'WARN',
        details: 'Zero trading volume',
      });
    }

    return { risk, reasons };
  }

  private analyzePricePattern(token: TokenDocument, evidence: any[]): { risk: number; reasons: string[] } {
    const reasons: string[] = [];
    let risk = 0;

    const priceChange24h = token.priceInfo?.priceChange24h || 0;
    
    if (Math.abs(priceChange24h) > 500) {
      risk += 0.3;
      reasons.push('Extreme price volatility detected');
      evidence.push({
        test: 'price_volatility_check',
        result: 'FAIL',
        details: `24h change: ${priceChange24h.toFixed(1)}%`,
      });
    } else if (Math.abs(priceChange24h) > 100) {
      risk += 0.1;
      reasons.push('High price volatility');
      evidence.push({
        test: 'price_volatility_check',
        result: 'WARN',
        details: `24h change: ${priceChange24h.toFixed(1)}%`,
      });
    }

    return { risk, reasons };
  }

  private estimateSellTax(token: TokenDocument): number {
    if (token.securityFlags?.hasBlacklist || token.securityFlags?.hasPausableFunctionality) {
      return 100;
    }
    return 0;
  }

  private estimateBuyTax(token: TokenDocument): number {
    return 0;
  }
}