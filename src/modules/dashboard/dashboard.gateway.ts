import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 5000,
})
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DashboardGateway.name);
  private connectedClients = new Set<string>();

  constructor(private dashboardService: DashboardService) {
    setInterval(() => this.broadcastUpdates(), 15000);
    setInterval(() => this.sendHeartbeat(), 5000);
  }

  handleConnection(client: Socket) {
    this.connectedClients.add(client.id);
    this.logger.log(`Client connected: ${client.id} (Total: ${this.connectedClients.size})`);
    
    // Send immediate connection confirmation
    client.emit('connection', { 
      status: 'connected',
      clientId: client.id,
      timestamp: new Date()
    });
    
    // Setup ping/pong for connection monitoring
    client.on('pong', () => {
      client.emit('heartbeat', { timestamp: new Date() });
    });
    
    this.sendInitialData(client);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  @SubscribeMessage('subscribe_alerts')
  async handleSubscribeAlerts(@ConnectedSocket() client: Socket) {
    client.join('alerts');
    this.logger.log(`Client ${client.id} subscribed to alerts`);
    
    const alerts = await this.dashboardService.getActiveAlerts();
    client.emit('alerts_update', alerts);
  }

  @SubscribeMessage('subscribe_overview')
  async handleSubscribeOverview(@ConnectedSocket() client: Socket) {
    client.join('overview');
    this.logger.log(`Client ${client.id} subscribed to overview updates`);
    
    const overview = await this.dashboardService.getSystemOverview();
    client.emit('overview_update', overview);
  }

  @SubscribeMessage('subscribe_token')
  async handleSubscribeToken(
    @MessageBody() data: { mintAddress: string },
    @ConnectedSocket() client: Socket
  ) {
    const room = `token_${data.mintAddress}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to token ${data.mintAddress}`);
    
    try {
      const tokenDetails = await this.dashboardService.getTokenDetails(data.mintAddress);
      client.emit('token_update', tokenDetails);
    } catch (error) {
      client.emit('error', { message: `Token ${data.mintAddress} not found` });
    }
  }

  @SubscribeMessage('get_status')
  async handleGetStatus(@ConnectedSocket() client: Socket) {
    const status = await this.dashboardService.getMonitoringStatus();
    client.emit('status_update', status);
  }

  async broadcastNewToken(token: any) {
    this.server.emit('new_token', {
      symbol: token.symbol,
      mintAddress: token.mintAddress,
      riskScore: token.riskScore,
      riskLevel: token.riskLevel,
      createdAt: token.createdAt,
    });
  }

  async broadcastRiskAlert(token: any, analysis: any) {
    const alert = {
      type: 'high_risk_detection',
      token: {
        symbol: token.symbol,
        mintAddress: token.mintAddress,
        riskScore: token.riskScore,
      },
      analysis: {
        riskLevel: analysis.riskLevel,
        primaryConcerns: analysis.primaryConcerns,
        recommendation: analysis.recommendation,
      },
      timestamp: new Date(),
    };

    this.server.to('alerts').emit('risk_alert', alert);
  }

  async broadcastSimulationResult(result: any) {
    this.server.emit('simulation_result', {
      tokenAddress: result.token.mintAddress,
      decision: result.decision,
      timestamp: new Date(),
    });
  }

  private async sendInitialData(client: Socket) {
    try {
      const overview = await this.dashboardService.getSystemOverview();
      client.emit('overview_update', overview);
    } catch (error) {
      this.logger.error('Failed to send initial data:', error);
    }
  }

  private async broadcastUpdates() {
    if (this.connectedClients.size === 0) return;

    try {
      const [overview, status, alerts] = await Promise.all([
        this.dashboardService.getSystemOverview(),
        this.dashboardService.getMonitoringStatus(),
        this.dashboardService.getActiveAlerts(),
      ]);

      this.server.to('overview').emit('overview_update', overview);
      this.server.emit('status_update', status);
      this.server.to('alerts').emit('alerts_update', alerts);
      
      // Log discovery progress
      this.logger.log(`Broadcasting: ${status.discovery.totalDiscovered} tokens discovered, ${overview.analysis.highRiskTokens} high risk`);
    } catch (error) {
      this.logger.error('Failed to broadcast updates:', error);
    }
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  private sendHeartbeat() {
    if (this.connectedClients.size === 0) return;
    
    this.server.emit('ping', { timestamp: new Date() });
  }
}