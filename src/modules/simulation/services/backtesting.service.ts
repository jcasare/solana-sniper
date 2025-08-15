import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SimulationLogDocument } from '../../database/schemas/simulation-log.schema';

export interface BacktestResult {
  totalSimulations: number;
  successRate: number;
  avgReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitableTrades: number;
  lossTrades: number;
  rugPullsAvoided: number;
  honeypotsStopped: number;
  performanceByRiskLevel: any;
}

export interface BacktestParameters {
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
}

@Injectable()
export class BacktestingService {
  private readonly logger = new Logger(BacktestingService.name);

  constructor(private databaseService: DatabaseService) {}

  async runBacktest(parameters: BacktestParameters): Promise<BacktestResult> {
    this.logger.log(`Running backtest from ${parameters.startDate.toISOString()} to ${parameters.endDate.toISOString()}`);

    const simulationLogs = await this.getSimulationLogsInRange(parameters.startDate, parameters.endDate);
    
    if (simulationLogs.length === 0) {
      throw new Error('No simulation data available for the specified time range');
    }

    let totalReturn = 0;
    let profitableTrades = 0;
    let lossTrades = 0;
    let rugPullsAvoided = 0;
    let honeypotsStopped = 0;
    const returns: number[] = [];
    const performanceByRiskLevel: any = {};

    for (const log of simulationLogs) {
      const outcome = await this.calculateTradeOutcome(log);
      
      if (outcome.avoided) {
        if (outcome.reason === 'rugpull') rugPullsAvoided++;
        if (outcome.reason === 'honeypot') honeypotsStopped++;
        continue;
      }

      if (outcome.return !== undefined) {
        totalReturn += outcome.return;
        returns.push(outcome.return);
        
        if (outcome.return > 0) {
          profitableTrades++;
        } else {
          lossTrades++;
        }

        const riskLevel = log.riskLevel;
        if (!performanceByRiskLevel[riskLevel]) {
          performanceByRiskLevel[riskLevel] = {
            trades: 0,
            totalReturn: 0,
            avgReturn: 0,
          };
        }
        performanceByRiskLevel[riskLevel].trades++;
        performanceByRiskLevel[riskLevel].totalReturn += outcome.return;
      }
    }

    Object.keys(performanceByRiskLevel).forEach(level => {
      performanceByRiskLevel[level].avgReturn = 
        performanceByRiskLevel[level].totalReturn / performanceByRiskLevel[level].trades;
    });

    const totalTrades = profitableTrades + lossTrades;
    const avgReturn = totalTrades > 0 ? totalReturn / totalTrades : 0;
    const successRate = totalTrades > 0 ? profitableTrades / totalTrades : 0;
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    const sharpeRatio = this.calculateSharpeRatio(returns);

    return {
      totalSimulations: simulationLogs.length,
      successRate,
      avgReturn,
      maxDrawdown,
      sharpeRatio,
      profitableTrades,
      lossTrades,
      rugPullsAvoided,
      honeypotsStopped,
      performanceByRiskLevel,
    };
  }

  async analyzeDecisionAccuracy(): Promise<any> {
    const recentLogs = await this.getRecentSimulationLogs(30);
    
    let correctAvoidance = 0;
    let incorrectAvoidance = 0;
    let correctInvestment = 0;
    let incorrectInvestment = 0;

    for (const log of recentLogs) {
      const actualOutcome = await this.getActualTokenOutcome(log.tokenMintAddress);
      
      if (log.decision.action === 'avoid' && actualOutcome.wasScam) {
        correctAvoidance++;
      } else if (log.decision.action === 'avoid' && !actualOutcome.wasScam) {
        incorrectAvoidance++;
      } else if (log.decision.wouldInvest && !actualOutcome.wasScam) {
        correctInvestment++;
      } else if (log.decision.wouldInvest && actualOutcome.wasScam) {
        incorrectInvestment++;
      }
    }

    const totalDecisions = correctAvoidance + incorrectAvoidance + correctInvestment + incorrectInvestment;
    const accuracy = totalDecisions > 0 ? (correctAvoidance + correctInvestment) / totalDecisions : 0;

    return {
      accuracy,
      correctAvoidance,
      incorrectAvoidance,
      correctInvestment,
      incorrectInvestment,
      totalDecisions,
    };
  }

  private async calculateTradeOutcome(log: SimulationLogDocument): Promise<{
    return?: number;
    avoided: boolean;
    reason?: string;
  }> {
    if (log.decision.action === 'avoid') {
      const token = await this.databaseService.getToken(log.tokenMintAddress);
      if (token?.securityFlags?.isHoneypot) {
        return { avoided: true, reason: 'honeypot' };
      }
      if (token?.securityFlags?.hasRugPullRisk) {
        return { avoided: true, reason: 'rugpull' };
      }
      return { avoided: true, reason: 'risk_management' };
    }

    if (!log.decision.wouldInvest || !log.decision.maxInvestmentUSD) {
      return { avoided: true, reason: 'no_investment' };
    }

    const hypotheticalReturn = this.simulateTradeReturn(log);
    return { return: hypotheticalReturn, avoided: false };
  }

  private simulateTradeReturn(log: SimulationLogDocument): number {
    const token = log.tokenMintAddress;
    const investmentAmount = log.decision.maxInvestmentUSD || 0;
    const riskScore = log.riskScore;

    const randomFactor = (Math.random() - 0.5) * 2;
    const riskFactor = (1 - riskScore) * 0.5;
    const marketFactor = Math.random() * 0.3 - 0.15;

    const returnPercentage = (riskFactor + marketFactor + randomFactor * 0.2) * 100;
    return (investmentAmount * returnPercentage) / 100;
  }

  private calculateMaxDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;

    let peak = 0;
    let maxDrawdown = 0;
    let runningSum = 0;

    for (const ret of returns) {
      runningSum += ret;
      if (runningSum > peak) peak = runningSum;
      const drawdown = (peak - runningSum) / Math.abs(peak) || 0;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return maxDrawdown;
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev === 0 ? 0 : avgReturn / stdDev;
  }

  private async getSimulationLogsInRange(startDate: Date, endDate: Date): Promise<SimulationLogDocument[]> {
    return [];
  }

  private async getRecentSimulationLogs(days: number): Promise<SimulationLogDocument[]> {
    return [];
  }

  private async getActualTokenOutcome(mintAddress: string): Promise<{
    wasScam: boolean;
    priceChange?: number;
    stillActive: boolean;
  }> {
    const token = await this.databaseService.getToken(mintAddress);
    
    return {
      wasScam: token?.securityFlags?.isHoneypot || token?.securityFlags?.hasRugPullRisk || false,
      stillActive: token?.isActive || false,
    };
  }
}