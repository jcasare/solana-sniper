import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RiskAnalysisService } from './risk-analysis.service';
import { HoneypotDetectorService } from './services/honeypot-detector.service';
import { RugpullDetectorService } from './services/rugpull-detector.service';
import { LiquidityAnalyzerService } from './services/liquidity-analyzer.service';
import { HolderAnalyzerService } from './services/holder-analyzer.service';
import { RiskScoringService } from './services/risk-scoring.service';
import { DatabaseModule } from '../database/database.module';
import { TokenMonitorModule } from '../token-monitor/token-monitor.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    TokenMonitorModule,
  ],
  providers: [
    RiskAnalysisService,
    HoneypotDetectorService,
    RugpullDetectorService,
    LiquidityAnalyzerService,
    HolderAnalyzerService,
    RiskScoringService,
  ],
  exports: [RiskAnalysisService],
})
export class RiskAnalysisModule {}