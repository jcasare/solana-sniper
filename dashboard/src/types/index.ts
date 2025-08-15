// Risk Analysis Types
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

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
  lpUnlockTime?: string;
  majorLPHolders: string[];
}

export interface HolderInfo {
  address: string;
  percentage: number;
  isLP: boolean;
  isBurn: boolean;
  isDev: boolean;
}

export interface HolderAnalysis {
  totalHolders: number;
  topHoldersConcentration: number;
  devWalletPercentage: number;
  burnedPercentage: number;
  lpPercentage: number;
  topHolders: HolderInfo[];
}

export interface PriceInfo {
  currentPriceUSD: number;
  priceChange24h: number;
  volume24hUSD: number;
  marketCapUSD: number;
}

// Token Types
export interface Token {
  _id: string;
  mintAddress: string;
  symbol: string;
  name: string;
  description?: string;
  image?: string;
  decimals: number;
  totalSupply: string;
  createdAt: string;
  creatorWallet: string;
  securityFlags: SecurityFlags;
  liquidityInfo: LiquidityInfo;
  holderAnalysis: HolderAnalysis;
  riskScore: number;
  riskLevel: RiskLevel;
  riskReasons: string[];
  isActive: boolean;
  isWatched?: boolean;
  watchedAt?: string;
  lastAnalyzedAt: string;
  analysisCount: number;
  metadata: Record<string, any>;
  priceInfo?: PriceInfo;
}

// Analysis Types
export interface AnalysisResult {
  testName: string;
  passed: boolean;
  score: number;
  details: string;
  evidence?: any;
}

export interface RiskAnalysis {
  _id: string;
  tokenMintAddress: string;
  analysisTimestamp: string;
  overallRiskScore: number;
  riskLevel: RiskLevel;
  analysisResults: AnalysisResult[];
  flaggedReasons: string[];
  analysisVersion: string;
  rawData: Record<string, any>;
  analysisDurationMs: number;
  isReanalysis: boolean;
  previousRiskScore?: number;
}

// Simulation Types
export type SimulationAction = 'avoid' | 'monitor' | 'investigate' | 'flag';

export interface SimulationDecision {
  action: SimulationAction;
  confidence: number;
  reasoning: string;
  wouldInvest: boolean;
  maxInvestmentUSD?: number;
}

export interface MarketConditions {
  liquidityUSD: number;
  volumeUSD: number;
  priceUSD: number;
  holderCount: number;
}

export interface SimulationLog {
  _id: string;
  tokenMintAddress: string;
  simulationTimestamp: string;
  riskScore: number;
  riskLevel: RiskLevel;
  decision: SimulationDecision;
  marketConditions: MarketConditions;
  backtest?: {
    hypotheticalInvestment: number;
    timeHorizon: string;
    outcomeUSD?: number;
    actualOutcome?: 'profit' | 'loss' | 'rug' | 'honeypot' | 'unknown';
  };
  notes?: string;
}

// API Response Types
export interface TokensResponse {
  tokens: Token[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface TokenDetailsResponse {
  token: Token;
  latestAnalysis?: RiskAnalysis;
  analysisHistory: RiskAnalysis[];
}

export interface SystemOverview {
  tokens: {
    total: number;
    recentlyAdded: number;
    riskDistribution: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };
  monitoring: {
    status: 'active' | 'idle';
    tokensDiscovered: number;
  };
  analysis: {
    isAnalyzing: boolean;
    highRiskTokens: number;
    recentAnalyses: number;
  };
  simulation: {
    totalSimulations: number;
    accuracy: number;
    isSimulating: boolean;
  };
  lastUpdated: string;
}

export interface Alert {
  id: string;
  type: 'high_risk_token' | 'system_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  tokenAddress?: string;
  riskScore?: number;
  reasons?: string[];
  createdAt: string;
}

// Filter and Sort Types
export interface TokenFilters {
  riskLevel?: RiskLevel;
  search?: string;
  minLiquidity?: number;
  maxRiskScore?: number;
  hasLPLock?: boolean;
  sortBy?: 'createdAt' | 'riskScore' | 'volume' | 'liquidity' | 'marketCap';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Settings Types
export interface UserSettings {
  riskThresholds: {
    high: number;
    medium: number;
  };
  minimums: {
    liquidityUSD: number;
    holders: number;
  };
  alerts: {
    highRiskTokens: boolean;
    rugPullAlerts: boolean;
    honeypotAlerts: boolean;
  };
  simulation: {
    defaultProfile: 'conservative' | 'moderate' | 'aggressive';
    maxInvestment: number;
  };
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'overview_update' | 'new_token' | 'risk_alert' | 'simulation_result' | 'status_update';
  data: any;
}

// Chart Data Types
export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface RiskScoreHistory {
  timestamp: string;
  riskScore: number;
  riskLevel: RiskLevel;
  analysisCount: number;
}