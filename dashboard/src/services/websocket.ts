import { io, Socket } from 'socket.io-client';
import type { WebSocketMessage, SystemOverview, Token, Alert } from '@/types';

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  private connect(): void {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
      
      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connection', { status: 'connected' });
        
        // Re-subscribe to events after reconnection
        this.subscribeToOverview();
        this.subscribeToAlerts();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.emit('connection', { status: 'disconnected', reason });
        
        if (reason === 'io server disconnect') {
          // Server disconnected, attempt to reconnect
          this.attemptReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.emit('connection', { status: 'error', error: error.message });
        this.attemptReconnect();
      });

      // Connection event from server
      this.socket.on('connection', (data: { status: string }) => {
        if (data.status === 'connected') {
          this.emit('connection', { status: 'connected' });
        }
      });

      // System events
      this.socket.on('overview_update', (data: SystemOverview) => {
        this.emit('overview_update', data);
      });

      this.socket.on('status_update', (data: any) => {
        this.emit('status_update', data);
      });

      // Token events
      this.socket.on('new_token', (data: Token) => {
        this.emit('new_token', data);
      });

      this.socket.on('token_update', (data: Token) => {
        this.emit('token_update', data);
      });

      // Alert events
      this.socket.on('risk_alert', (data: Alert) => {
        this.emit('risk_alert', data);
      });

      this.socket.on('alerts_update', (data: { alerts: Alert[] }) => {
        this.emit('alerts_update', data);
      });

      // Simulation events
      this.socket.on('simulation_result', (data: any) => {
        this.emit('simulation_result', data);
      });

      // Error handling
      this.socket.on('error', (data: { message: string }) => {
        this.emit('error', data);
      });

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('connection', { status: 'failed', reason: 'Max attempts reached' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Subscription methods
  public subscribeToOverview(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_overview');
    }
  }

  public subscribeToAlerts(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_alerts');
    }
  }

  public subscribeToToken(mintAddress: string): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_token', { mintAddress });
    }
  }

  public getStatus(): void {
    if (this.socket?.connected) {
      this.socket.emit('get_status');
    }
  }

  // Event listener methods
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  public reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
export default websocketService;