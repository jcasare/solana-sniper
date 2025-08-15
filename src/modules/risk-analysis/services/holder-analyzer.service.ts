import { Injectable, Logger } from '@nestjs/common';
import { TokenDocument } from '../../database/schemas/token.schema';

export interface HolderAnalysis {
  concentrationRisk: number;
  holderDistribution: 'healthy' | 'concerning' | 'dangerous';
  whaleCount: number;
  devWalletRisk: number;
  distributionMetrics: {
    giniCoefficient: number;
    top10Percentage: number;
    top50Percentage: number;
  };
  riskFactors: string[];
}

@Injectable()
export class HolderAnalyzerService {
  private readonly logger = new Logger(HolderAnalyzerService.name);

  async analyzeToken(token: TokenDocument): Promise<HolderAnalysis> {
    const holders = token.holderAnalysis?.topHolders || [];
    const totalHolders = token.holderAnalysis?.totalHolders || 0;
    const topHoldersConcentration = token.holderAnalysis?.topHoldersConcentration || 0;
    const devWalletPercentage = token.holderAnalysis?.devWalletPercentage || 0;

    const riskFactors: string[] = [];
    
    const whaleCount = holders.filter(h => h.percentage > 0.05 && !h.isLP && !h.isBurn).length;
    
    let concentrationRisk = 0;
    if (topHoldersConcentration > 0.7) {
      concentrationRisk = 0.8;
      riskFactors.push('Extremely high holder concentration');
    } else if (topHoldersConcentration > 0.5) {
      concentrationRisk = 0.6;
      riskFactors.push('High holder concentration');
    } else if (topHoldersConcentration > 0.3) {
      concentrationRisk = 0.3;
      riskFactors.push('Moderate holder concentration');
    }

    if (totalHolders < 10) {
      riskFactors.push('Very few token holders');
      concentrationRisk += 0.2;
    } else if (totalHolders < 50) {
      riskFactors.push('Low number of holders');
      concentrationRisk += 0.1;
    }

    let devWalletRisk = 0;
    if (devWalletPercentage > 0.2) {
      devWalletRisk = 0.8;
      riskFactors.push('Developer holds large portion');
    } else if (devWalletPercentage > 0.1) {
      devWalletRisk = 0.4;
      riskFactors.push('Developer holds significant portion');
    }

    if (whaleCount > 5) {
      riskFactors.push(`${whaleCount} whale wallets detected`);
    }

    const holderDistribution = this.categorizeDistribution(concentrationRisk, totalHolders);
    const distributionMetrics = this.calculateDistributionMetrics(holders);

    return {
      concentrationRisk: Math.min(1.0, concentrationRisk),
      holderDistribution,
      whaleCount,
      devWalletRisk,
      distributionMetrics,
      riskFactors,
    };
  }

  private categorizeDistribution(concentrationRisk: number, totalHolders: number): 'healthy' | 'concerning' | 'dangerous' {
    if (concentrationRisk > 0.6 || totalHolders < 20) {
      return 'dangerous';
    } else if (concentrationRisk > 0.3 || totalHolders < 100) {
      return 'concerning';
    }
    return 'healthy';
  }

  private calculateDistributionMetrics(holders: any[]) {
    const validHolders = holders.filter(h => !h.isLP && !h.isBurn);
    
    const top10Percentage = validHolders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
    const top50Percentage = validHolders.slice(0, 50).reduce((sum, h) => sum + h.percentage, 0);
    
    const giniCoefficient = this.calculateGiniCoefficient(validHolders.map(h => h.percentage));

    return {
      giniCoefficient,
      top10Percentage,
      top50Percentage,
    };
  }

  private calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) return 0;
    
    values.sort((a, b) => a - b);
    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    
    if (sum === 0) return 0;
    
    let index = 0;
    for (let i = 0; i < n; i++) {
      index += (2 * (i + 1) - n - 1) * values[i];
    }
    
    return index / (n * sum);
  }
}