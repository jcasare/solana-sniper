import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Token, TokenSchema } from './schemas/token.schema';
import { RiskAnalysis, RiskAnalysisSchema } from './schemas/risk-analysis.schema';
import { SimulationLog, SimulationLogSchema } from './schemas/simulation-log.schema';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Token.name, schema: TokenSchema },
      { name: RiskAnalysis.name, schema: RiskAnalysisSchema },
      { name: SimulationLog.name, schema: SimulationLogSchema },
    ]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}