import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import websocketService from '@/services/websocket';
import type { SystemOverview, Token, Alert } from '@/types';
import toast from 'react-hot-toast';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleConnection = (data: { status: string; reason?: string; error?: string }) => {
      setConnectionStatus(data.status as any);
      setIsConnected(data.status === 'connected');
      
      if (data.status === 'connected') {
        // Subscribe to overview updates when connected
        websocketService.subscribeToOverview();
        websocketService.subscribeToAlerts();
      } else if (data.status === 'error') {
        toast.error(`Connection error: ${data.error || 'Unknown error'}`);
      }
    };

    websocketService.on('connection', handleConnection);

    return () => {
      websocketService.off('connection', handleConnection);
    };
  }, []);

  const reconnect = useCallback(() => {
    websocketService.reconnect();
  }, []);

  return {
    isConnected,
    connectionStatus,
    reconnect,
  };
}

export function useSystemOverviewUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOverviewUpdate = (data: SystemOverview) => {
      queryClient.setQueryData('system-overview', data);
    };

    websocketService.on('overview_update', handleOverviewUpdate);

    return () => {
      websocketService.off('overview_update', handleOverviewUpdate);
    };
  }, [queryClient]);
}

export function useNewTokenAlerts() {
  const [newTokens, setNewTokens] = useState<Token[]>([]);
  const queryClient = useQueryClient();
  const tokensRef = useRef<Token[]>([]);

  useEffect(() => {
    const handleNewToken = (token: Token) => {
      const newTokensList = [token, ...tokensRef.current.slice(0, 9)]; // Keep last 10
      tokensRef.current = newTokensList;
      setNewTokens(newTokensList);

      // Show toast notification for high-risk tokens
      if (token.riskScore > 0.7) {
        toast.error(`High risk token detected: ${token.symbol}`, {
          duration: 5000,
          position: 'top-right',
        });
      } else if (token.riskScore > 0.4) {
        toast(`New token monitored: ${token.symbol}`, {
          icon: '⚠️',
          duration: 3000,
        });
      }

      // Invalidate token queries to refresh lists
      queryClient.invalidateQueries(['tokens']);
    };

    websocketService.on('new_token', handleNewToken);

    return () => {
      websocketService.off('new_token', handleNewToken);
    };
  }, [queryClient]);

  const clearNewTokens = useCallback(() => {
    setNewTokens([]);
    tokensRef.current = [];
  }, []);

  return {
    newTokens,
    clearNewTokens,
  };
}

export function useRiskAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleRiskAlert = (alert: Alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 19)]); // Keep last 20 alerts
      
      // Show toast notification
      const toastMessage = `${alert.title}: ${alert.message}`;
      
      switch (alert.severity) {
        case 'critical':
          toast.error(toastMessage, { duration: 8000 });
          break;
        case 'high':
          toast.error(toastMessage, { duration: 6000 });
          break;
        case 'medium':
          toast(toastMessage, { icon: '⚠️', duration: 4000 });
          break;
        default:
          toast(toastMessage, { duration: 3000 });
      }

      // Update alerts query
      queryClient.invalidateQueries('active-alerts');
    };

    const handleAlertsUpdate = (data: { alerts: Alert[] }) => {
      queryClient.setQueryData('active-alerts', data);
    };

    websocketService.on('risk_alert', handleRiskAlert);
    websocketService.on('alerts_update', handleAlertsUpdate);

    return () => {
      websocketService.off('risk_alert', handleRiskAlert);
      websocketService.off('alerts_update', handleAlertsUpdate);
    };
  }, [queryClient]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    clearAlerts,
  };
}

export function useTokenUpdates(mintAddress?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!mintAddress) return;

    const handleTokenUpdate = (token: Token) => {
      if (token.mintAddress === mintAddress) {
        // Update token details query
        queryClient.setQueryData(['token-details', mintAddress], (oldData: any) => {
          if (oldData) {
            return {
              ...oldData,
              token,
            };
          }
          return oldData;
        });

        // Invalidate analysis history
        queryClient.invalidateQueries(['token-analysis-history', mintAddress]);
      }
    };

    websocketService.on('token_update', handleTokenUpdate);
    websocketService.subscribeToToken(mintAddress);

    return () => {
      websocketService.off('token_update', handleTokenUpdate);
    };
  }, [mintAddress, queryClient]);
}

export function useSimulationUpdates() {
  const [recentSimulations, setRecentSimulations] = useState<any[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleSimulationResult = (result: any) => {
      setRecentSimulations(prev => [result, ...prev.slice(0, 9)]); // Keep last 10
      
      // Show notification for avoid/flag decisions
      if (result.decision?.action === 'avoid') {
        toast.error(`Avoided: ${result.tokenAddress} - ${result.decision.reasoning}`, {
          duration: 4000,
        });
      } else if (result.decision?.action === 'flag') {
        toast(`Flagged: ${result.tokenAddress}`, {
          icon: '🚩',
          duration: 3000,
        });
      }

      // Update simulation insights
      queryClient.invalidateQueries('simulation-insights');
    };

    websocketService.on('simulation_result', handleSimulationResult);

    return () => {
      websocketService.off('simulation_result', handleSimulationResult);
    };
  }, [queryClient]);

  const clearSimulations = useCallback(() => {
    setRecentSimulations([]);
  }, []);

  return {
    recentSimulations,
    clearSimulations,
  };
}

export function useStatusUpdates() {
  const [monitoringStatus, setMonitoringStatus] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleStatusUpdate = (status: any) => {
      setMonitoringStatus(status);
      queryClient.setQueryData('monitoring-status', status);
    };

    websocketService.on('status_update', handleStatusUpdate);
    websocketService.getStatus(); // Request initial status

    return () => {
      websocketService.off('status_update', handleStatusUpdate);
    };
  }, [queryClient]);

  return {
    monitoringStatus,
  };
}

// Combined hook for all real-time features
export function useRealTimeUpdates(options: {
  enableOverview?: boolean;
  enableNewTokens?: boolean;
  enableAlerts?: boolean;
  enableSimulations?: boolean;
  enableStatus?: boolean;
  tokenAddress?: string;
} = {}) {
  const {
    enableOverview = true,
    enableNewTokens = true,
    enableAlerts = true,
    enableSimulations = true,
    enableStatus = true,
    tokenAddress,
  } = options;

  // Connection status
  const websocket = useWebSocket();

  // Overview updates
  if (enableOverview) {
    useSystemOverviewUpdates();
  }

  // New token alerts
  const newTokens = enableNewTokens ? useNewTokenAlerts() : { newTokens: [], clearNewTokens: () => {} };

  // Risk alerts
  const riskAlerts = enableAlerts ? useRiskAlerts() : { alerts: [], clearAlerts: () => {} };

  // Simulation updates
  const simulations = enableSimulations ? useSimulationUpdates() : { recentSimulations: [], clearSimulations: () => {} };

  // Status updates
  const status = enableStatus ? useStatusUpdates() : { monitoringStatus: null };

  // Token-specific updates
  if (tokenAddress) {
    useTokenUpdates(tokenAddress);
  }

  return {
    ...websocket,
    ...newTokens,
    ...riskAlerts,
    ...simulations,
    ...status,
  };
}