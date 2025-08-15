import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TokenDocument = Token & Document;

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export type RiskLevelType = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityFlags {
  isHoneypot: boolean;
  hasRugPullRisk: boolean;
  ownershipRenounced: boolean;
  hasLockingMechanism: boolean;
  hasUnlimitedMinting: boolean;
  hasBlacklist: boolean;
  hasWhitelist: boolean;
  hasPausableFunctionality: boolean;
}

export interface LiquidityInfo {
  totalLiquidityUSD: number;
  lpTokensLocked: boolean;
  lpLockDuration?: number;
  lpUnlockTime?: Date;
  majorLPHolders: string[];
}

export interface HolderAnalysis {
  totalHolders: number;
  topHoldersConcentration: number;
  devWalletPercentage: number;
  burnedPercentage: number;
  lpPercentage: number;
  topHolders: Array<{
    address: string;
    percentage: number;
    isLP: boolean;
    isBurn: boolean;
    isDev: boolean;
  }>;
}

@Schema({ timestamps: true })
export class Token {
  @Prop({ required: true, unique: true })
  mintAddress: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  image?: string;

  @Prop({ required: true })
  decimals: number;

  @Prop({ required: true })
  totalSupply: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop()
  creatorWallet: string;

  @Prop({ type: Object })
  securityFlags: SecurityFlags;

  @Prop({ type: Object })
  liquidityInfo: LiquidityInfo;

  @Prop({ type: Object })
  holderAnalysis: HolderAnalysis;

  @Prop({ required: true, min: 0, max: 1 })
  riskScore: number;

  @Prop({ required: true, enum: RiskLevel })
  riskLevel: RiskLevel;

  @Prop({ type: [String] })
  riskReasons: string[];

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ default: false })
  isWatched: boolean;

  @Prop()
  watchedAt?: Date;

  @Prop()
  lastAnalyzedAt: Date;

  @Prop({ default: 0 })
  analysisCount: number;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ type: Object })
  priceInfo?: {
    currentPriceUSD: number;
    priceChange24h: number;
    volume24hUSD: number;
    marketCapUSD: number;
  };
}

export const TokenSchema = SchemaFactory.createForClass(Token);