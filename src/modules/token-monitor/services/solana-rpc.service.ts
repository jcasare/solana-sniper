import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey, AccountInfo, ParsedAccountData } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getMint, getAccount } from '@solana/spl-token';

@Injectable()
export class SolanaRpcService {
  private readonly logger = new Logger(SolanaRpcService.name);
  private readonly connection: Connection;
  private readonly backupConnection: Connection;

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com';
    const backupRpcUrl = this.configService.get<string>('SOLANA_RPC_BACKUP_URL') || 'https://rpc.ankr.com/solana';
    
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.backupConnection = new Connection(backupRpcUrl, 'confirmed');
  }

  async getConnection(): Promise<Connection> {
    try {
      await this.connection.getSlot();
      return this.connection;
    } catch (error) {
      this.logger.warn('Primary RPC connection failed, using backup', error.message);
      return this.backupConnection;
    }
  }

  async getTokenMintInfo(mintAddress: string) {
    try {
      const connection = await this.getConnection();
      const mintPubkey = new PublicKey(mintAddress);
      
      const mintInfo = await getMint(connection, mintPubkey);
      
      return {
        address: mintAddress,
        decimals: mintInfo.decimals,
        supply: mintInfo.supply.toString(),
        mintAuthority: mintInfo.mintAuthority?.toBase58() || null,
        freezeAuthority: mintInfo.freezeAuthority?.toBase58() || null,
        isInitialized: mintInfo.isInitialized,
      };
    } catch (error) {
      this.logger.error(`Failed to get mint info for ${mintAddress}:`, error);
      throw error;
    }
  }

  async getTokenMetadata(mintAddress: string) {
    try {
      const connection = await this.getConnection();
      const mintPubkey = new PublicKey(mintAddress);
      
      const metadataPDA = await this.getMetadataPDA(mintPubkey);
      const accountInfo = await connection.getAccountInfo(metadataPDA);
      
      if (!accountInfo) {
        return null;
      }

      return this.parseMetadata(accountInfo.data);
    } catch (error) {
      this.logger.error(`Failed to get metadata for ${mintAddress}:`, error);
      return null;
    }
  }

  async getTokenHolders(mintAddress: string, limit = 100) {
    try {
      const connection = await this.getConnection();
      const mintPubkey = new PublicKey(mintAddress);
      
      const tokenAccounts = await connection.getParsedProgramAccounts(
        TOKEN_PROGRAM_ID,
        {
          filters: [
            { dataSize: 165 },
            { memcmp: { offset: 0, bytes: mintPubkey.toBase58() } }
          ]
        }
      );

      const holders = [];
      for (const account of tokenAccounts.slice(0, limit)) {
        try {
          const parsedData = account.account.data as ParsedAccountData;
          if (parsedData.parsed?.info) {
            const info = parsedData.parsed.info;
            holders.push({
              address: info.owner || account.pubkey.toBase58(),
              balance: info.tokenAmount?.amount || '0',
              isNative: info.isNative || false,
              isFrozen: info.state === 'frozen',
            });
          }
        } catch (error) {
          continue;
        }
      }

      return holders.sort((a, b) => 
        BigInt(b.balance) > BigInt(a.balance) ? 1 : -1
      );
    } catch (error) {
      this.logger.error(`Failed to get holders for ${mintAddress}:`, error);
      return [];
    }
  }

  async getLiquidityPools(mintAddress: string) {
    try {
      const connection = await this.getConnection();
      
      const accounts = await connection.getProgramAccounts(
        new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'), // Raydium AMM Program
        {
          filters: [
            { memcmp: { offset: 400, bytes: mintAddress } }
          ]
        }
      );

      return accounts.map(account => ({
        address: account.pubkey.toBase58(),
        data: account.account.data
      }));
    } catch (error) {
      this.logger.warn(`Could not fetch LP data for ${mintAddress}:`, error.message);
      return [];
    }
  }

  async isTokenMintActive(mintAddress: string): Promise<boolean> {
    try {
      const mintInfo = await this.getTokenMintInfo(mintAddress);
      return mintInfo.isInitialized && BigInt(mintInfo.supply) > 0;
    } catch (error) {
      return false;
    }
  }

  private async getMetadataPDA(mintPubkey: PublicKey): Promise<PublicKey> {
    const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    const [metadataPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        METADATA_PROGRAM_ID.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );
    return metadataPDA;
  }

  private parseMetadata(data: Buffer) {
    try {
      if (data.length < 100) {
        return null;
      }

      let offset = 1;
      if (data[0] !== 4) {
        return null;
      }

      offset += 32;
      offset += 32;

      const nameLength = data.readUInt32LE(offset);
      offset += 4;
      if (offset + nameLength > data.length) {
        return null;
      }
      const name = data.slice(offset, offset + nameLength).toString('utf8').replace(/\0/g, '').trim();
      offset += nameLength;

      const symbolLength = data.readUInt32LE(offset);
      offset += 4;
      if (offset + symbolLength > data.length) {
        return null;
      }
      const symbol = data.slice(offset, offset + symbolLength).toString('utf8').replace(/\0/g, '').trim();
      offset += symbolLength;

      const uriLength = data.readUInt32LE(offset);
      offset += 4;
      if (offset + uriLength > data.length) {
        return null;
      }
      const uri = data.slice(offset, offset + uriLength).toString('utf8').replace(/\0/g, '').trim();
      
      return { name, symbol, uri };
    } catch (error) {
      this.logger.error('Failed to parse metadata:', error);
      return null;
    }
  }
}