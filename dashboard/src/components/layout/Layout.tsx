import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Shield, 
  Activity, 
  BarChart3, 
  Search, 
  Settings, 
  Menu,
  X,
  Wifi,
  WifiOff,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useActiveAlerts } from '@/hooks/useApi';
import { Badge } from '@/components/common/Badge';
import { IconButton } from '@/components/common/Button';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Token Watchlist', href: '/', icon: Shield },
  { name: 'Trade Log', href: '/trades', icon: Activity },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Manual Lookup', href: '/lookup', icon: Search },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { isConnected, connectionStatus } = useWebSocket();
  const { data: alertsData } = useActiveAlerts();

  const unreadAlerts = alertsData?.alerts?.filter(alert => 
    alert.severity === 'high' || alert.severity === 'critical'
  ).length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:fixed",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-primary-600" />
            <span className="text-lg font-semibold text-gray-900">
              Security Monitor
            </span>
          </div>
          
          <IconButton
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            variant="ghost"
            size="sm"
          >
            <X className="w-5 h-5" />
          </IconButton>
        </div>

        {/* Connection Status */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className={cn(
              "text-sm font-medium",
              isConnected ? "text-green-700" : "text-red-700"
            )}>
              {connectionStatus === 'connected' ? 'Live Updates' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "sidebar-item",
                    isActive ? "sidebar-item-active" : "sidebar-item-inactive"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  {item.name}
                  {item.name === 'Analytics' && unreadAlerts > 0 && (
                    <Badge variant="error" size="sm" className="ml-auto">
                      {unreadAlerts}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* System Status */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <div className="flex items-center justify-between mb-1">
              <span>System Status</span>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-400" : "bg-red-400"
              )} />
            </div>
            <div className="text-gray-400">
              {process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0'}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
          <div className="flex items-center">
            <IconButton
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              variant="ghost"
              size="sm"
            >
              <Menu className="w-5 h-5" />
            </IconButton>
            
            <h1 className="ml-4 text-lg font-semibold text-gray-900 lg:ml-0">
              {getPageTitle(router.pathname)}
            </h1>
          </div>

          {/* Alerts indicator */}
          {unreadAlerts > 0 && (
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-amber-700">
                {unreadAlerts} active alert{unreadAlerts > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Page content */}
        <main className="flex-1 py-6 px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  switch (pathname) {
    case '/':
      return 'Token Watchlist';
    case '/trades':
      return 'Simulated Trade Log';
    case '/analytics':
      return 'System Analytics';
    case '/lookup':
      return 'Manual Token Lookup';
    case '/settings':
      return 'Settings';
    case '/token/[address]':
      return 'Token Details';
    default:
      return 'Solana Security Monitor';
  }
}