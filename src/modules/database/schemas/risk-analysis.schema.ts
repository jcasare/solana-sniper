import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RiskLevel } from './token.schema';

export type RiskAnalysisDocument = RiskAnalysis & Document;

export interface AnalysisResult {
  testName: string;
  passed: boolean;
  score: number;
  details: string;
  evidence?: any;
}

@Schema({ timestamps: true })
export class RiskAnalysis {
  @Prop({ required: true })
  tokenMintAddress: string;

  @Prop({ required: true })
  analysisTimestamp: Date;

  @Prop({ required: true, min: 0, max: 1 })
  overallRiskScore: number;

  @Prop({ required: true, enum: RiskLevel })
  riskLevel: RiskLevel;

  @Prop({ type: [Object] })
  analysisResults: AnalysisResult[];

  @Prop({ type: [String] })
  flaggedReasons: string[];

  @Prop()
  analysisVersion: string;

  @Prop({ type: Object })
  rawData: Record<string, any>;

  @Prop()
  analysisDurationMs: number;

  @Prop({ default: false })
  isReanalysis: boolean;

  @Prop()
  previousRiskScore?: number;
}

export const RiskAnalysisSchema = SchemaFactory.createForClass(RiskAnalysis);