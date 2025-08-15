import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TokenMonitorService } from './token-monitor.service';
import { SolanaRpcService } from './services/solana-rpc.service';
import { DexApiService } from './services/dex-api.service';
import { TokenDiscoveryService } from './services/token-discovery.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
  ],
  providers: [
    TokenMonitorService,
    SolanaRpcService,
    DexApiService,
    TokenDiscoveryService,
  ],
  exports: [TokenMonitorService],
})
export class TokenMonitorModule {}