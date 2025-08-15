import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  Token,
  TokensResponse,
  TokenDetailsResponse,
  SystemOverview,
  RiskAnalysis,
  SimulationLog,
  TokenFilters,
  Alert,
  UserSettings,
} from '@/types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // System endpoints
  async getSystemOverview(): Promise<SystemOverview> {
    const response: AxiosResponse<SystemOverview> = await this.api.get('/api/overview');
    return response.data;
  }

  async getSystemHealth(): Promise<{ status: string; timestamp: string; uptime: number; version: string }> {
    const response = await this.api.get('/api/health');
    return response.data;
  }

  async getStatistics(): Promise<any> {
    const response = await this.api.get('/api/statistics');
    return response.data;
  }

  // Token endpoints  
  async getTokens(filters: TokenFilters = {}): Promise<TokensResponse> {
    const params = new URLSearchParams();
    
    if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);
    if (filters.search) params.append('search', filters.search);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const response: AxiosResponse<TokensResponse> = await this.api.get(`/api/tokens?${params.toString()}`);
    return response.data;
  }

  async getHighRiskTokens(limit = 50): Promise<{ tokens: Token[]; count: number; criteria: string }> {
    const response = await this.api.get(`/api/tokens/high-risk?limit=${limit}`);
    return response.data;
  }

  async getTokenDetails(mintAddress: string): Promise<TokenDetailsResponse> {
    const response: AxiosResponse<TokenDetailsResponse> = await this.api.get(`/api/tokens/${mintAddress}`);
    return response.data;
  }

  async getTokenAnalysisHistory(mintAddress: string): Promise<{ mintAddress: string; analyses: RiskAnalysis[]; count: number }> {
    const response = await this.api.get(`/api/tokens/${mintAddress}/analysis-history`);
    return response.data;
  }

  // Analysis endpoints
  async analyzeToken(mintAddress: string): Promise<{
    success: boolean;
    token?: Token;
    analysis?: any;
    error?: string;
    analyzedAt: string;
  }> {
    const response = await this.api.post(`/api/tokens/${mintAddress}/analyze`);
    return response.data;
  }

  async fetchAndAnalyzeToken(mintAddress: string): Promise<{
    success: boolean;
    message: string;
    token?: Token;
    analysis?: any;
    isNew?: boolean;
  }> {
    const response = await this.api.post(`/api/tokens/${mintAddress}/fetch`);
    return response.data;
  }

  // Simulation endpoints
  async simulateToken(
    mintAddress: string,
    profile: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
  ): Promise<{
    success: boolean;
    simulation?: any;
    profile: string;
    simulatedAt: string;
  }> {
    const response = await this.api.post(`/api/tokens/${mintAddress}/simulate`, { profile });
    return response.data;
  }

  async simulateTokenAllProfiles(mintAddress: string): Promise<{
    success: boolean;
    token: any;
    marketConditions: any;
    profileResults: any[];
    consensus: any;
    simulatedAt: string;
  }> {
    const response = await this.api.post(`/api/tokens/${mintAddress}/simulate-all`);
    return response.data;
  }

  async getSimulationInsights(): Promise<{
    simulationStats: any;
    decisionAccuracy: any;
    isCurrentlySimulating: boolean;
  }> {
    const response = await this.api.get('/api/simulation/insights');
    return response.data;
  }

  async getSimulationLogs(
    limit = 100, 
    offset = 0, 
    days?: number
  ): Promise<{
    logs: any[];
    total: number;
    pagination: { limit: number; offset: number; hasMore: boolean };
  }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    if (days) params.append('days', days.toString());
    
    const response = await this.api.get(`/api/simulation/logs?${params.toString()}`);
    return response.data;
  }

  async runBacktest(days = 30, profile: 'conservative' | 'moderate' | 'aggressive' = 'moderate'): Promise<{
    success: boolean;
    backtest?: any;
    error?: string;
    parameters: { days: number; profile: string };
    runAt: string;
  }> {
    const response = await this.api.post('/api/backtest', { days, profile });
    return response.data;
  }

  // Monitoring endpoints
  async getMonitoringStatus(): Promise<any> {
    const response = await this.api.get('/api/monitoring/status');
    return response.data;
  }

  async getActiveAlerts(): Promise<{ alerts: Alert[]; count: number; lastUpdated: string }> {
    const response = await this.api.get('/api/alerts');
    return response.data;
  }

  // Watchlist endpoints
  async getWatchlist(
    limit = 100, 
    search?: string, 
    sortBy = 'watchedAt', 
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ tokens: Token[]; count: number; lastUpdated: string }> {
    const params = new URLSearchParams({ 
      limit: limit.toString(),
      sortBy,
      sortOrder
    });
    if (search) params.append('search', search);
    const response = await this.api.get(`/api/watchlist?${params.toString()}`);
    return response.data;
  }

  async addToWatchlist(mintAddress: string): Promise<{ success: boolean; message: string; token: Token }> {
    const response = await this.api.post(`/api/tokens/${mintAddress}/watch`);
    return response.data;
  }

  async removeFromWatchlist(mintAddress: string): Promise<{ success: boolean; message: string; token: Token }> {
    const response = await this.api.delete(`/api/tokens/${mintAddress}/watch`);
    return response.data;
  }

  // Utility methods
  async searchTokens(query: string): Promise<Token[]> {
    const response = await this.getTokens({ search: query, limit: 20 });
    return response.tokens;
  }

  async getTokensByRiskLevel(riskLevel: string, limit = 50): Promise<Token[]> {
    const response = await this.getTokens({ 
      riskLevel: riskLevel as any, 
      limit,
      sortBy: 'riskScore',
      sortOrder: 'desc'
    });
    return response.tokens;
  }

  // Local storage methods for settings
  saveSettings(settings: UserSettings): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('solana-security-settings', JSON.stringify(settings));
    }
  }

  loadSettings(): UserSettings {
    if (typeof window === 'undefined') {
      return {
        riskThresholds: {
          high: 0.7,
          medium: 0.4,
        },
        minimums: {
          liquidityUSD: 1000,
          holders: 50,
        },
        alerts: {
          highRiskTokens: true,
          rugPullAlerts: true,
          honeypotAlerts: true,
        },
        simulation: {
          defaultProfile: 'moderate',
          maxInvestment: 1000,
        },
      };
    }

    const stored = localStorage.getItem('solana-security-settings');
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Default settings
    return {
      riskThresholds: {
        high: 0.7,
        medium: 0.4,
      },
      minimums: {
        liquidityUSD: 1000,
        holders: 50,
      },
      alerts: {
        highRiskTokens: true,
        rugPullAlerts: true,
        honeypotAlerts: true,
      },
      simulation: {
        defaultProfile: 'moderate',
        maxInvestment: 1000,
      },
    };
  }

  // Error handling utility
  handleApiError(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }
}

export const apiService = new ApiService();
export default apiService;