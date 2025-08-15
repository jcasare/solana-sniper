import { IsOptional, IsEnum, IsNumber, IsString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { RiskLevel } from '../../database/schemas/token.schema';

export class GetTokensQueryDto {
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number = 50;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'riskScore', 'volume', 'liquidity'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['desc', 'asc'])
  sortOrder?: 'desc' | 'asc' = 'desc';
}

export class AnalyzeTokenDto {
  @IsString()
  mintAddress: string;
}

export class SimulateTokenDto {
  @IsString()
  mintAddress: string;

  @IsOptional()
  @IsEnum(['conservative', 'moderate', 'aggressive'])
  profile?: 'conservative' | 'moderate' | 'aggressive' = 'moderate';
}

export class BacktestDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number = 30;

  @IsOptional()
  @IsEnum(['conservative', 'moderate', 'aggressive'])
  profile?: 'conservative' | 'moderate' | 'aggressive' = 'moderate';
}