import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardGateway } from './dashboard.gateway';
import { DatabaseModule } from '../database/database.module';
import { TokenMonitorModule } from '../token-monitor/token-monitor.module';
import { RiskAnalysisModule } from '../risk-analysis/risk-analysis.module';
import { SimulationModule } from '../simulation/simulation.module';

@Module({
  imports: [
    DatabaseModule,
    TokenMonitorModule,
    RiskAnalysisModule,
    SimulationModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardGateway],
  exports: [DashboardService],
})
export class DashboardModule {}