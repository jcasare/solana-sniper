import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SolanaRpcService } from './solana-rpc.service';
import { DexApiService } from './dex-api.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class TokenDiscoveryService {
  private readonly logger = new Logger(TokenDiscoveryService.name);
  private readonly discoveredTokens = new Set<string>();
  private isRunning = false;
  private discoveryRound = 0;

  constructor(
    private solanaRpcService: SolanaRpcService,
    private dexApiService: DexApiService,
    private databaseService: DatabaseService,
  ) {
    this.onModuleInit();
  }

  async onModuleInit() {
    this.logger.log('Initializing token discovery service...');
    setTimeout(() => {
      this.discoverNewTokens();
    }, 5000);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async discoverNewTokens() {
    if (this.isRunning) {
      this.logger.debug('Token discovery already running, skipping...');
      return;
    }

    this.isRunning = true;
    try {
      this.logger.log('Starting aggressive token discovery...');
      
      const [dexTokens, recentTokens, pumpFunTokens] = await Promise.allSettled([
        this.dexApiService.getNewTokensFromDexScreener(100),
        this.dexApiService.getRecentlyListedTokens(100),
        this.dexApiService.getPumpFunTokens(50),
      ]);

      const allTokens = [];
      if (dexTokens.status === 'fulfilled') {
        allTokens.push(...dexTokens.value);
      }
      if (recentTokens.status === 'fulfilled') {
        allTokens.push(...recentTokens.value);
      }
      if (pumpFunTokens.status === 'fulfilled') {
        allTokens.push(...pumpFunTokens.value);
      }

      const uniqueTokens = new Map();
      allTokens.forEach(token => {
        if (token.baseToken?.address && !uniqueTokens.has(token.baseToken.address)) {
          uniqueTokens.set(token.baseToken.address, token);
        }
      });

      this.logger.log(`Found ${uniqueTokens.size} unique tokens to process`);
      let processedCount = 0;
      let skippedCount = 0;

      for (const [mintAddress, tokenPair] of uniqueTokens) {
        try {
          if (this.discoveredTokens.has(mintAddress)) {
            skippedCount++;
            continue;
          }

          const existingToken = await this.databaseService.getToken(mintAddress);
          if (existingToken) {
            this.discoveredTokens.add(mintAddress);
            skippedCount++;
            continue;
          }

          const isActive = await this.solanaRpcService.isTokenMintActive(mintAddress);
          if (!isActive) {
            skippedCount++;
            continue;
          }

          const tokenData = await this.processNewToken(mintAddress, tokenPair);
          if (tokenData) {
            await this.databaseService.saveToken(tokenData);
            
            // Add discovered tokens to watchlist automatically
            await this.databaseService.updateToken(mintAddress, {
              isWatched: true,
              watchedAt: new Date(),
            });
            
            this.discoveredTokens.add(mintAddress);
            processedCount++;
            
            this.logger.log(`Discovered new token: ${tokenData.symbol} (${mintAddress}) - Added to watchlist`);
          }

          if (processedCount % 5 === 0) {
            await this.delay(500);
          } else {
            await this.delay(50);
          }
        } catch (error) {
          this.logger.error(`Error processing token ${mintAddress}:`, error.message);
        }
      }

      this.logger.log(`Token discovery completed. Processed ${processedCount} new tokens, skipped ${skippedCount}.`);
    } catch (error) {
      this.logger.error('Token discovery failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processNewToken(mintAddress: string, tokenPair: any) {
    try {
      const [mintInfo, metadata, holders] = await Promise.allSettled([
        this.solanaRpcService.getTokenMintInfo(mintAddress),
        this.solanaRpcService.getTokenMetadata(mintAddress),
        this.dexApiService.getTokenHolders(mintAddress, 50), // Use Birdeye API for holder data
      ]);

      if (mintInfo.status === 'rejected') {
        throw new Error(`Failed to get mint info: ${mintInfo.reason}`);
      }

      const mintData = mintInfo.value;
      const metadataData = metadata.status === 'fulfilled' ? metadata.value : null;
      const holdersData = holders.status === 'fulfilled' ? holders.value : { totalHolders: 0, topHolders: [] };

      const securityInfo = await this.dexApiService.getTokenSecurityInfo(mintAddress);
      const tokenOverview = await this.dexApiService.getTokenOverview(mintAddress);

      const createdAt = new Date(tokenPair.pairCreatedAt || Date.now());
      const totalSupply = mintData.supply;
      const holderCount = holdersData.totalHolders;

      const securityFlags = {
        isHoneypot: false,
        hasRugPullRisk: mintData.mintAuthority !== null,
        ownershipRenounced: mintData.mintAuthority === null,
        hasLockingMechanism: false,
        hasUnlimitedMinting: mintData.mintAuthority !== null,
        hasBlacklist: false,
        hasWhitelist: false,
        hasPausableFunctionality: mintData.freezeAuthority !== null,
      };

      const liquidityInfo = {
        totalLiquidityUSD: tokenPair.liquidity?.usd || 0,
        lpTokensLocked: false,
        majorLPHolders: [],
      };

      const holderAnalysis = this.analyzeHolders(holdersData, totalSupply);

      return {
        mintAddress,
        symbol: tokenPair.baseToken.symbol || metadataData?.symbol || 'UNKNOWN',
        name: tokenPair.baseToken.name || metadataData?.name || 'Unknown Token',
        description: tokenOverview?.description || '',
        image: tokenOverview?.logoURI || metadataData?.uri || '',
        decimals: mintData.decimals,
        totalSupply,
        createdAt,
        creatorWallet: '',
        securityFlags,
        liquidityInfo,
        holderAnalysis,
        riskScore: 0.5,
        riskLevel: 'medium' as any,
        riskReasons: [],
        isActive: true,
        lastAnalyzedAt: new Date(),
        analysisCount: 0,
        metadata: {
          dexPair: tokenPair,
          securityInfo,
          tokenOverview,
        },
        priceInfo: {
          currentPriceUSD: parseFloat(tokenPair.priceUsd || '0'),
          priceChange24h: tokenPair.priceChange?.h24 || 0,
          volume24hUSD: tokenPair.volume?.h24 || 0,
          marketCapUSD: tokenPair.marketCap || 0,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to process token ${mintAddress}:`, error);
      return null;
    }
  }

  private analyzeHolders(holdersData: { totalHolders: number, topHolders: any[] }, totalSupply: string) {
    const totalSupplyNum = parseFloat(totalSupply);
    const topHolders = holdersData.topHolders.slice(0, 10).map(holder => {
      // Use percentage directly from Birdeye if available
      const percentage = holder.percentage || (holder.balance ? parseFloat(holder.balance) / totalSupplyNum : 0);
      
      return {
        address: holder.address,
        percentage,
        isLP: holder.isLP || this.isLPAddress(holder.address),
        isBurn: holder.isBurn || this.isBurnAddress(holder.address),
        isDev: false,
        balance: holder.balance,
        valueUsd: holder.value,
      };
    });

    const topHoldersConcentration = topHolders
      .filter(h => !h.isLP && !h.isBurn)
      .reduce((sum, holder) => sum + holder.percentage, 0);

    const lpPercentage = topHolders
      .filter(h => h.isLP)
      .reduce((sum, holder) => sum + holder.percentage, 0);

    const burnedPercentage = topHolders
      .filter(h => h.isBurn)
      .reduce((sum, holder) => sum + holder.percentage, 0);

    return {
      totalHolders: holdersData.totalHolders, // Use actual holder count from Birdeye
      topHoldersConcentration,
      devWalletPercentage: 0,
      burnedPercentage,
      lpPercentage,
      topHolders,
    };
  }

  private isLPAddress(address: string): boolean {
    const lpPatterns = [
      /^[A-Za-z0-9]{44}$/,
    ];
    return false;
  }

  private isBurnAddress(address: string): boolean {
    const burnAddresses = [
      '11111111111111111111111111111111',
      '1nc1nerator11111111111111111111111111111111',
    ];
    return burnAddresses.includes(address);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getDiscoveryStats() {
    return {
      totalDiscovered: this.discoveredTokens.size,
      isRunning: this.isRunning,
    };
  }

  async processSingleToken(mintAddress: string, tokenPair: any) {
    try {
      this.logger.log(`Processing single token: ${mintAddress}`);
      
      // Check if it's a valid Solana token
      const isActive = await this.solanaRpcService.isTokenMintActive(mintAddress);
      if (!isActive) {
        this.logger.warn(`Token ${mintAddress} is not active on Solana`);
        return null;
      }
      
      // Process the token
      const tokenData = await this.processNewToken(mintAddress, tokenPair);
      
      if (tokenData) {
        this.discoveredTokens.add(mintAddress);
        return tokenData;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to process single token ${mintAddress}:`, error);
      return null;
    }
  }
}