import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface DexScreenerToken {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
}

@Injectable()
export class DexApiService {
  private readonly logger = new Logger(DexApiService.name);
  private readonly dexScreenerApi: AxiosInstance;
  private readonly birdeyeApi: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.dexScreenerApi = axios.create({
      baseURL: this.configService.get<string>('DEXSCREENER_API_URL') || 'https://api.dexscreener.com/latest',
      timeout: 10000,
    });

    this.birdeyeApi = axios.create({
      baseURL: this.configService.get<string>('BIRDEYE_API_URL') || 'https://public-api.birdeye.so',
      timeout: 10000,
      headers: {
        'X-API-KEY': this.configService.get<string>('BIRDEYE_API_KEY') || '',
      },
    });
  }

  async getNewTokensFromDexScreener(limit = 50): Promise<DexScreenerToken[]> {
    try {
      const [newPairs, trendingPairs, boostPairs] = await Promise.allSettled([
        this.dexScreenerApi.get('/dex/search?q=solana'),
        this.dexScreenerApi.get('/dex/pairs/solana'),
        this.dexScreenerApi.get('/dex/tokens/new'),
      ]);

      let allPairs = [];
      
      if (newPairs.status === 'fulfilled' && newPairs.value.data.pairs) {
        allPairs.push(...newPairs.value.data.pairs);
      }
      
      if (trendingPairs.status === 'fulfilled' && trendingPairs.value.data) {
        const pairs = Array.isArray(trendingPairs.value.data) ? trendingPairs.value.data : trendingPairs.value.data.pairs || [];
        allPairs.push(...pairs);
      }
      
      if (boostPairs.status === 'fulfilled' && boostPairs.value.data) {
        const pairs = Array.isArray(boostPairs.value.data) ? boostPairs.value.data : boostPairs.value.data.pairs || [];
        allPairs.push(...pairs);
      }

      const uniquePairs = new Map();
      allPairs.forEach(pair => {
        if (pair.chainId === 'solana' && pair.baseToken?.address) {
          if (!uniquePairs.has(pair.baseToken.address) || 
              (pair.liquidity?.usd || 0) > (uniquePairs.get(pair.baseToken.address).liquidity?.usd || 0)) {
            uniquePairs.set(pair.baseToken.address, pair);
          }
        }
      });
      
      return Array.from(uniquePairs.values())
        .slice(0, limit)
        .map((pair: any) => this.mapDexScreenerPair(pair));
    } catch (error) {
      this.logger.error('Failed to fetch new tokens from DexScreener:', error.message);
      return [];
    }
  }

  async getTokenInfoFromDexScreener(address: string): Promise<DexScreenerToken | null> {
    try {
      // First try as token address
      let response = await this.dexScreenerApi.get(`/dex/tokens/${address}`).catch(() => null);
      
      // If not found, try as pair address
      if (!response || !response.data.pairs || response.data.pairs.length === 0) {
        response = await this.dexScreenerApi.get(`/dex/pairs/solana/${address}`).catch(() => null);
      }
      
      if (!response || !response.data) {
        return null;
      }

      // Handle single pair response
      if (response.data.pair) {
        return this.mapDexScreenerPair(response.data.pair);
      }
      
      // Handle multiple pairs response
      const pairs = response.data.pairs || [];
      if (pairs.length === 0) {
        return null;
      }

      const bestPair = pairs.reduce((best: any, current: any) => 
        (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best
      );

      return this.mapDexScreenerPair(bestPair);
    } catch (error) {
      this.logger.error(`Failed to get token info from DexScreener for ${address}:`, error.message);
      return null;
    }
  }

  async getTokenSecurityInfo(mintAddress: string) {
    try {
      const response = await this.birdeyeApi.get(`/defi/token_security?address=${mintAddress}`);
      return response.data.data || null;
    } catch (error) {
      this.logger.warn(`Could not get security info from Birdeye for ${mintAddress}:`, error.message);
      return null;
    }
  }

  async getTokenOverview(mintAddress: string) {
    try {
      const response = await this.birdeyeApi.get(`/defi/token_overview?address=${mintAddress}`);
      return response.data.data || null;
    } catch (error) {
      this.logger.warn(`Could not get token overview from Birdeye for ${mintAddress}:`, error.message);
      return null;
    }
  }

  async getTokenHolders(mintAddress: string, limit = 100) {
    try {
      const response = await this.birdeyeApi.get(`/v1/wallet/token_list?address=${mintAddress}&limit=${limit}`);
      return response.data.data?.items || [];
    } catch (error) {
      this.logger.warn(`Could not get token holders from Birdeye for ${mintAddress}:`, error.message);
      return [];
    }
  }

  async getTrendingTokens(timeframe = '24h', limit = 100): Promise<any[]> {
    try {
      const response = await this.birdeyeApi.get(`/defi/tokenlist?sort_by=v${timeframe}USD&sort_type=desc&offset=0&limit=${limit}`);
      return response.data.data?.tokens || [];
    } catch (error) {
      this.logger.error('Failed to fetch trending tokens:', error.message);
      return [];
    }
  }

  async getRecentlyListedTokens(limit = 100): Promise<any[]> {
    try {
      const profiles = [
        '/dex/profiles/new',
        '/dex/profiles/gainers',
        '/dex/profiles/trending',
      ];

      const responses = await Promise.allSettled(
        profiles.map(profile => this.dexScreenerApi.get(profile))
      );

      const allTokens = [];
      responses.forEach(response => {
        if (response.status === 'fulfilled' && response.value.data) {
          const data = response.value.data;
          const pairs = Array.isArray(data) ? data : data.pairs || [];
          allTokens.push(...pairs);
        }
      });

      const uniqueTokens = new Map();
      allTokens.forEach(pair => {
        if (pair.chainId === 'solana' && pair.baseToken?.address) {
          if (!uniqueTokens.has(pair.baseToken.address)) {
            uniqueTokens.set(pair.baseToken.address, pair);
          }
        }
      });

      return Array.from(uniqueTokens.values())
        .slice(0, limit)
        .map((pair: any) => this.mapDexScreenerPair(pair));
    } catch (error) {
      this.logger.error('Failed to fetch recently listed tokens:', error.message);
      return [];
    }
  }

  async getPumpFunTokens(limit = 50): Promise<any[]> {
    try {
      // Search for PumpFun tokens on Solana
      const response = await this.dexScreenerApi.get('/dex/search?q=pump.fun');
      const pairs = response.data.pairs || [];
      
      // Filter for Solana PumpFun tokens
      const pumpFunTokens = pairs
        .filter((pair: any) => 
          pair.chainId === 'solana' && 
          (pair.dexId === 'raydium' || 
           (pair.info && typeof pair.info === 'string' && pair.info.includes('pump')) || 
           (Array.isArray(pair.labels) && pair.labels.includes('pump')))
        )
        .slice(0, limit)
        .map((pair: any) => this.mapDexScreenerPair(pair));

      return pumpFunTokens;
    } catch (error) {
      this.logger.error('Failed to fetch PumpFun tokens:', error.message);
      return [];
    }
  }

  private mapDexScreenerPair(pair: any): DexScreenerToken {
    return {
      chainId: pair.chainId || 'solana',
      dexId: pair.dexId || 'unknown',
      url: pair.url || '',
      pairAddress: pair.pairAddress || '',
      baseToken: {
        address: pair.baseToken?.address || '',
        name: pair.baseToken?.name || '',
        symbol: pair.baseToken?.symbol || '',
      },
      quoteToken: {
        address: pair.quoteToken?.address || '',
        name: pair.quoteToken?.name || '',
        symbol: pair.quoteToken?.symbol || '',
      },
      priceNative: pair.priceNative || '0',
      priceUsd: pair.priceUsd || '0',
      txns: {
        m5: { buys: pair.txns?.m5?.buys || 0, sells: pair.txns?.m5?.sells || 0 },
        h1: { buys: pair.txns?.h1?.buys || 0, sells: pair.txns?.h1?.sells || 0 },
        h6: { buys: pair.txns?.h6?.buys || 0, sells: pair.txns?.h6?.sells || 0 },
        h24: { buys: pair.txns?.h24?.buys || 0, sells: pair.txns?.h24?.sells || 0 },
      },
      volume: {
        h24: pair.volume?.h24 || 0,
        h6: pair.volume?.h6 || 0,
        h1: pair.volume?.h1 || 0,
        m5: pair.volume?.m5 || 0,
      },
      priceChange: {
        m5: pair.priceChange?.m5 || 0,
        h1: pair.priceChange?.h1 || 0,
        h6: pair.priceChange?.h6 || 0,
        h24: pair.priceChange?.h24 || 0,
      },
      liquidity: {
        usd: pair.liquidity?.usd || 0,
        base: pair.liquidity?.base || 0,
        quote: pair.liquidity?.quote || 0,
      },
      fdv: pair.fdv || 0,
      marketCap: pair.marketCap || 0,
      pairCreatedAt: pair.pairCreatedAt || Date.now(),
    };
  }
}