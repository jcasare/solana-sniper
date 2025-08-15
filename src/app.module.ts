import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { TokenMonitorModule } from './modules/token-monitor/token-monitor.module';
import { RiskAnalysisModule } from './modules/risk-analysis/risk-analysis.module';
import { SimulationModule } from './modules/simulation/simulation.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DatabaseModule } from './modules/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        new winston.transports.File({
          filename: 'logs/security-monitor.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),
      ],
    }),

    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/solana-security-monitor'),
    
    ScheduleModule.forRoot(),
    
    DatabaseModule,
    TokenMonitorModule,
    RiskAnalysisModule,
    SimulationModule,
    DashboardModule,
  ],
})
export class AppModule {}