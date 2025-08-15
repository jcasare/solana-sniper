import { Controller, Get, Post, Delete, Query, Param, Body, ValidationPipe } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { GetTokensQueryDto, AnalyzeTokenDto, SimulateTokenDto, BacktestDto } from './dto/dashboard.dto';

@Controller('api')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  async getOverview() {
    return this.dashboardService.getSystemOverview();
  }

  @Get('tokens')
  async getTokens(@Query(ValidationPipe) query: GetTokensQueryDto) {
    return this.dashboardService.getTokens(query);
  }

  @Get('tokens/high-risk')
  async getHighRiskTokens(@Query('limit') limit: number = 50) {
    return this.dashboardService.getHighRiskTokens(limit);
  }

  @Get('tokens/:mintAddress')
  async getTokenDetails(@Param('mintAddress') mintAddress: string) {
    return this.dashboardService.getTokenDetails(mintAddress);
  }

  @Post('tokens/:mintAddress/fetch')
  async fetchAndAnalyzeToken(@Param('mintAddress') mintAddress: string) {
    return this.dashboardService.fetchAndAnalyzeToken(mintAddress);
  }

  @Get('tokens/:mintAddress/analysis-history')
  async getTokenAnalysisHistory(@Param('mintAddress') mintAddress: string) {
    return this.dashboardService.getTokenAnalysisHistory(mintAddress);
  }

  @Post('tokens/:mintAddress/analyze')
  async analyzeToken(@Param('mintAddress') mintAddress: string) {
    return this.dashboardService.analyzeToken(mintAddress);
  }

  @Post('tokens/:mintAddress/simulate')
  async simulateToken(
    @Param('mintAddress') mintAddress: string,
    @Body(ValidationPipe) body: SimulateTokenDto
  ) {
    return this.dashboardService.simulateToken(mintAddress, body.profile);
  }

  @Post('tokens/:mintAddress/simulate-all')
  async simulateTokenAllProfiles(@Param('mintAddress') mintAddress: string) {
    return this.dashboardService.simulateTokenAllProfiles(mintAddress);
  }

  @Get('statistics')
  async getStatistics() {
    return this.dashboardService.getSystemStatistics();
  }

  @Get('monitoring/status')
  async getMonitoringStatus() {
    return this.dashboardService.getMonitoringStatus();
  }

  @Get('simulation/insights')
  async getSimulationInsights() {
    return this.dashboardService.getSimulationInsights();
  }

  @Get('simulation/logs')
  async getSimulationLogs(
    @Query('limit') limit: number = 100,
    @Query('offset') offset: number = 0,
    @Query('days') days?: number
  ) {
    return this.dashboardService.getSimulationLogs(limit, offset, days);
  }

  @Post('backtest')
  async runBacktest(@Body(ValidationPipe) body: BacktestDto) {
    return this.dashboardService.runBacktest(body.days, body.profile);
  }

  @Get('alerts')
  async getActiveAlerts() {
    return this.dashboardService.getActiveAlerts();
  }

  @Get('health')
  async getSystemHealth() {
    return {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      version: '1.0.0',
    };
  }

  @Post('discover-tokens')
  async forceTokenDiscovery() {
    await this.dashboardService.forceTokenDiscovery();
    return { 
      success: true, 
      message: 'Token discovery triggered', 
      timestamp: new Date() 
    };
  }

  @Get('watchlist')
  async getWatchlist(
    @Query('limit') limit: number = 100,
    @Query('search') search?: string,
    @Query('sortBy') sortBy: string = 'watchedAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    // Use the exact same approach as the debug endpoint that works
    const tokens = await this.dashboardService['databaseService'].getWatchedTokens(limit);
    
    let filteredTokens = tokens;
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredTokens = tokens.filter(token => 
        token.symbol.toLowerCase().includes(searchTerm) ||
        token.name.toLowerCase().includes(searchTerm) ||
        token.mintAddress.toLowerCase().includes(searchTerm)
      );
    }
    
    // Note: Sort functionality can be added later - for now keeping it simple
    
    return {
      tokens: filteredTokens,
      count: filteredTokens.length,
      lastUpdated: new Date(),
    };
  }

  @Post('tokens/:mintAddress/watch')
  async addToWatchlist(@Param('mintAddress') mintAddress: string) {
    return this.dashboardService.addToWatchlist(mintAddress);
  }

  @Delete('tokens/:mintAddress/watch')
  async removeFromWatchlist(@Param('mintAddress') mintAddress: string) {
    return this.dashboardService.removeFromWatchlist(mintAddress);
  }

  @Get('debug/tokens')
  async getTokensDebug() {
    return this.dashboardService.getTokensDebug();
  }

  @Post('debug/populate-sample-tokens')
  async populateSampleTokens() {
    return this.dashboardService.populateSampleTokens();
  }

  @Post('debug/mark-all-watched')
  async markAllTokensWatched() {
    return this.dashboardService.markAllTokensWatched();
  }

  @Get('debug/watchlist-direct')
  async getWatchlistDirect() {
    // Bypass service and call database directly
    const tokens = await this.dashboardService['databaseService'].getWatchedTokens(10);
    return {
      tokens: tokens.slice(0, 3).map(t => ({ symbol: t.symbol, mintAddress: t.mintAddress, isWatched: t.isWatched })),
      count: tokens.length,
      direct: true,
    };
  }
}