import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SimulationService } from './simulation.service';
import { ResponseSimulatorService } from './services/response-simulator.service';
import { BacktestingService } from './services/backtesting.service';
import { DatabaseModule } from '../database/database.module';
import { RiskAnalysisModule } from '../risk-analysis/risk-analysis.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RiskAnalysisModule,
  ],
  providers: [
    SimulationService,
    ResponseSimulatorService,
    BacktestingService,
  ],
  exports: [SimulationService],
})
export class SimulationModule {}