import { Injectable, Logger } from '@nestjs/common';
import { TokenDiscoveryService } from './services/token-discovery.service';
import { SolanaRpcService } from './services/solana-rpc.service';
import { DexApiService } from './services/dex-api.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TokenMonitorService {
  private readonly logger = new Logger(TokenMonitorService.name);

  constructor(
    private tokenDiscoveryService: TokenDiscoveryService,
    private solanaRpcService: SolanaRpcService,
    private dexApiService: DexApiService,
    private databaseService: DatabaseService,
  ) {}

  async getMonitoringStatus() {
    const discoveryStats = this.tokenDiscoveryService.getDiscoveryStats();
    const tokenStats = await this.databaseService.getTokenStatistics();
    
    return {
      discovery: discoveryStats,
      database: tokenStats,
      timestamp: new Date(),
    };
  }

  async forceTokenDiscovery() {
    this.logger.log('Manually triggering token discovery...');
    await this.tokenDiscoveryService.discoverNewTokens();
  }

  async fetchAndAddToken(address: string) {
    try {
      this.logger.log(`Fetching token/pair ${address} from DexScreener...`);
      
      // Fetch token info from DexScreener (handles both token and pair addresses)
      const dexInfo = await this.dexApiService.getTokenInfoFromDexScreener(address);
      
      if (!dexInfo) {
        this.logger.warn(`Token/pair ${address} not found on DexScreener`);
        return null;
      }

      // Extract the actual token address from the pair data
      const mintAddress = dexInfo.baseToken?.address || address;
      
      // Check if token already exists
      const existingToken = await this.databaseService.getToken(mintAddress);
      if (existingToken) {
        this.logger.log(`Token ${mintAddress} already exists, updating data...`);
        await this.refreshTokenData(mintAddress);
        return existingToken;
      }

      // Process and save the token
      const tokenData = await this.tokenDiscoveryService.processSingleToken(mintAddress, dexInfo);
      
      if (tokenData) {
        await this.databaseService.saveToken(tokenData);
        this.logger.log(`Successfully added token ${tokenData.symbol} (${mintAddress}) to database`);
        return tokenData;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to fetch and add token ${address}:`, error);
      throw error;
    }
  }

  async refreshTokenData(mintAddress: string) {
    try {
      this.logger.log(`Refreshing data for token: ${mintAddress}`);
      
      const [dexInfo, mintInfo, holders, securityInfo] = await Promise.all([
        this.dexApiService.getTokenInfoFromDexScreener(mintAddress),
        this.solanaRpcService.getTokenMintInfo(mintAddress),
        this.solanaRpcService.getTokenHolders(mintAddress, 50),
        this.dexApiService.getTokenSecurityInfo(mintAddress),
      ]);

      if (!dexInfo) {
        this.logger.warn(`No DEX info found for token: ${mintAddress}`);
        return null;
      }

      const updateData = {
        priceInfo: {
          currentPriceUSD: parseFloat(dexInfo.priceUsd || '0'),
          priceChange24h: dexInfo.priceChange?.h24 || 0,
          volume24hUSD: dexInfo.volume?.h24 || 0,
          marketCapUSD: dexInfo.marketCap || 0,
        },
        liquidityInfo: {
          totalLiquidityUSD: dexInfo.liquidity?.usd || 0,
          lpTokensLocked: false,
          majorLPHolders: [],
        },
        holderAnalysis: this.analyzeHolders(holders, mintInfo.supply),
        metadata: {
          ...{},
          lastRefresh: new Date(),
          securityInfo,
        },
      };

      return await this.databaseService.updateToken(mintAddress, updateData);
    } catch (error) {
      this.logger.error(`Failed to refresh token data for ${mintAddress}:`, error);
      throw error;
    }
  }

  async getRecentTokens(limit = 50) {
    const { RiskLevel } = await import('../database/schemas/token.schema');
    return this.databaseService.getTokensByRiskLevel(RiskLevel.MEDIUM, limit);
  }

  async searchTokens(query: string) {
    const tokens = await this.databaseService.getTokenStatistics();
    return tokens;
  }

  private analyzeHolders(holders: any[], totalSupply: string) {
    const totalSupplyNum = parseFloat(totalSupply);
    const topHolders = holders.slice(0, 10).map(holder => {
      const balance = parseFloat(holder.balance);
      const percentage = balance / totalSupplyNum;
      
      return {
        address: holder.address,
        percentage,
        isLP: false,
        isBurn: this.isBurnAddress(holder.address),
        isDev: false,
      };
    });

    const topHoldersConcentration = topHolders
      .filter(h => !h.isLP && !h.isBurn)
      .reduce((sum, holder) => sum + holder.percentage, 0);

    const burnedPercentage = topHolders
      .filter(h => h.isBurn)
      .reduce((sum, holder) => sum + holder.percentage, 0);

    return {
      totalHolders: holders.length,
      topHoldersConcentration,
      devWalletPercentage: 0,
      burnedPercentage,
      lpPercentage: 0,
      topHolders,
    };
  }

  private isBurnAddress(address: string): boolean {
    const burnAddresses = [
      '11111111111111111111111111111111',
      '1nc1nerator11111111111111111111111111111111',
    ];
    return burnAddresses.includes(address);
  }
}