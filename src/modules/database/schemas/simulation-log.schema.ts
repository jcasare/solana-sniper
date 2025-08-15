import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RiskLevel } from './token.schema';

export type SimulationLogDocument = SimulationLog & Document;

export enum SimulationAction {
  AVOID = 'avoid',
  MONITOR = 'monitor',
  INVESTIGATE = 'investigate',
  FLAG = 'flag'
}

export interface SimulationDecision {
  action: SimulationAction;
  confidence: number;
  reasoning: string;
  wouldInvest: boolean;
  maxInvestmentUSD?: number;
}

@Schema({ timestamps: true })
export class SimulationLog {
  @Prop({ required: true })
  tokenMintAddress: string;

  @Prop({ required: true })
  simulationTimestamp: Date;

  @Prop({ required: true, min: 0, max: 1 })
  riskScore: number;

  @Prop({ required: true, enum: RiskLevel })
  riskLevel: RiskLevel;

  @Prop({ type: Object })
  decision: SimulationDecision;

  @Prop({ type: Object })
  marketConditions: {
    liquidityUSD: number;
    volumeUSD: number;
    priceUSD: number;
    holderCount: number;
  };

  @Prop({ type: Object })
  backtest?: {
    hypotheticalInvestment: number;
    timeHorizon: string;
    outcomeUSD?: number;
    actualOutcome?: 'profit' | 'loss' | 'rug' | 'honeypot' | 'unknown';
  };

  @Prop()
  notes?: string;
}

export const SimulationLogSchema = SchemaFactory.createForClass(SimulationLog);