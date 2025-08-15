import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Token, TokenDocument, RiskLevel } from './schemas/token.schema';
import { RiskAnalysis, RiskAnalysisDocument } from './schemas/risk-analysis.schema';
import { SimulationLog, SimulationLogDocument, SimulationAction } from './schemas/simulation-log.schema';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectModel(Token.name) public tokenModel: Model<TokenDocument>,
    @InjectModel(RiskAnalysis.name) private riskAnalysisModel: Model<RiskAnalysisDocument>,
    @InjectModel(SimulationLog.name) private simulationLogModel: Model<SimulationLogDocument>,
  ) {}

  async saveToken(tokenData: Partial<Token>): Promise<TokenDocument> {
    const token = new this.tokenModel(tokenData);
    return token.save();
  }

  async updateToken(mintAddress: string, updateData: Partial<Token>): Promise<TokenDocument> {
    return this.tokenModel.findOneAndUpdate(
      { mintAddress },
      { ...updateData, lastAnalyzedAt: new Date() },
      { new: true, upsert: true }
    );
  }

  async getToken(mintAddress: string): Promise<TokenDocument | null> {
    return this.tokenModel.findOne({ mintAddress });
  }

  async getTokensByRiskLevel(riskLevel: RiskLevel, limit = 50): Promise<TokenDocument[]> {
    return this.tokenModel
      .find({ riskLevel, isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async getAllActiveTokens(limit = 200): Promise<TokenDocument[]> {
    return this.tokenModel
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async getHighRiskTokens(limit = 100): Promise<TokenDocument[]> {
    return this.tokenModel
      .find({ 
        riskScore: { $gte: 0.7 },
        isActive: true 
      })
      .sort({ riskScore: -1, createdAt: -1 })
      .limit(limit);
  }

  async saveRiskAnalysis(analysisData: Partial<RiskAnalysis>): Promise<RiskAnalysisDocument> {
    const analysis = new this.riskAnalysisModel(analysisData);
    return analysis.save();
  }

  async getLatestAnalysis(mintAddress: string): Promise<RiskAnalysisDocument | null> {
    return this.riskAnalysisModel
      .findOne({ tokenMintAddress: mintAddress })
      .sort({ analysisTimestamp: -1 });
  }

  async getAnalysisHistory(mintAddress: string, limit = 10): Promise<RiskAnalysisDocument[]> {
    return this.riskAnalysisModel
      .find({ tokenMintAddress: mintAddress })
      .sort({ analysisTimestamp: -1 })
      .limit(limit);
  }

  async saveSimulationLog(logData: Partial<SimulationLog>): Promise<SimulationLogDocument> {
    const log = new this.simulationLogModel(logData);
    return log.save();
  }


  async getTokensRequiringReanalysis(maxAge: number = 24 * 60 * 60 * 1000): Promise<TokenDocument[]> {
    const cutoff = new Date(Date.now() - maxAge);
    return this.tokenModel.find({
      isActive: true,
      $or: [
        { lastAnalyzedAt: { $lt: cutoff } },
        { lastAnalyzedAt: { $exists: false } }
      ]
    }).limit(50);
  }

  async getTokenStatistics(): Promise<any> {
    const totalTokens = await this.tokenModel.countDocuments({ isActive: true });
    const riskDistribution = await this.tokenModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 },
          avgScore: { $avg: '$riskScore' }
        }
      }
    ]);

    // Convert aggregation result to object format expected by frontend
    const riskDistributionObj = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    riskDistribution.forEach(item => {
      if (item._id && riskDistributionObj.hasOwnProperty(item._id)) {
        riskDistributionObj[item._id] = item.count;
      }
    });

    return {
      totalActiveTokens: totalTokens,
      riskDistribution: riskDistributionObj,
      recentlyAdded: await this.tokenModel.countDocuments({
        isActive: true,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    };
  }

  async getWatchedTokens(limit = 100): Promise<TokenDocument[]> {
    return this.tokenModel
      .find({ isWatched: true })
      .sort({ watchedAt: -1 })
      .limit(limit);
  }

  async addToWatchlist(mintAddress: string): Promise<TokenDocument> {
    return this.tokenModel.findOneAndUpdate(
      { mintAddress },
      { isWatched: true, watchedAt: new Date() },
      { new: true }
    );
  }

  async removeFromWatchlist(mintAddress: string): Promise<TokenDocument> {
    return this.tokenModel.findOneAndUpdate(
      { mintAddress },
      { isWatched: false, $unset: { watchedAt: 1 } },
      { new: true }
    );
  }

  async getSimulationLogs(
    limit = 100, 
    offset = 0,
    days?: number
  ): Promise<{ logs: SimulationLogDocument[]; total: number }> {
    const query: any = {};
    
    if (days) {
      query.simulationTimestamp = {
        $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      };
    }

    const [logs, total] = await Promise.all([
      this.simulationLogModel
        .find(query)
        .sort({ simulationTimestamp: -1 })
        .skip(offset)
        .limit(limit),
      this.simulationLogModel.countDocuments(query)
    ]);

    return { logs, total };
  }

  async getSimulationStats(): Promise<any> {
    const stats = await this.simulationLogModel.aggregate([
      {
        $group: {
          _id: '$decision.action',
          count: { $sum: 1 },
          avgRiskScore: { $avg: '$riskScore' }
        }
      }
    ]);
    
    const totalCount = await this.simulationLogModel.countDocuments();
    
    return {
      totalSimulations: totalCount,
      actionBreakdown: stats,
      averageRiskScore: stats.reduce((acc, s) => acc + (s.avgRiskScore || 0), 0) / stats.length || 0,
    };
  }
}