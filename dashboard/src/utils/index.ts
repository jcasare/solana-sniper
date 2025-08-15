import { type ClassValue, clsx } from 'clsx';
import type { RiskLevel } from '@/types';

// Utility function for combining CSS classes
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Format currency values
export function formatCurrency(
  value: number,
  currency = 'USD',
  minimumFractionDigits = 2,
  maximumFractionDigits = 2
): string {
  if (value === 0) return '$0.00';
  
  if (value < 0.01) {
    return `< $0.01`;
  }
  
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

// Format large numbers
export function formatNumber(value: number, decimals = 0): string {
  if (value === 0) return '0';
  
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(decimals)}B`;
  }
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(decimals)}M`;
  }
  
  if (value >= 1000) {
    return `${(value / 1000).toFixed(decimals)}K`;
  }
  
  return value.toLocaleString();
}

// Format percentage
export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// Format risk score
export function formatRiskScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

// Get risk color classes
export function getRiskColor(riskLevel: RiskLevel): {
  bg: string;
  text: string;
  border: string;
  indicator: string;
} {
  switch (riskLevel) {
    case 'low':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
        indicator: 'bg-green-500',
      };
    case 'medium':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
        indicator: 'bg-yellow-500',
      };
    case 'high':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
        indicator: 'bg-red-500',
      };
    case 'critical':
      return {
        bg: 'bg-red-900',
        text: 'text-red-100',
        border: 'border-red-900',
        indicator: 'bg-red-900',
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
        indicator: 'bg-gray-500',
      };
  }
}

// Format time ago
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays}d ago`;
  }
  
  return date.toLocaleDateString();
}

// Format duration
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

// Truncate address
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'absolute';
      textArea.style.left = '-999999px';
      document.body.prepend(textArea);
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
      return true;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

// Validate Solana address
export function isValidSolanaAddress(address: string): boolean {
  // Basic validation for Solana address format
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// Get simulation action color
export function getSimulationActionColor(action: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (action) {
    case 'avoid':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
      };
    case 'flag':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300',
      };
    case 'monitor':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-300',
      };
    case 'investigate':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
      };
  }
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

// Generate chart data for risk score over time
export function generateRiskChartData(analyses: any[]): Array<{ timestamp: string; riskScore: number; riskLevel: string }> {
  return analyses
    .sort((a, b) => new Date(a.analysisTimestamp).getTime() - new Date(b.analysisTimestamp).getTime())
    .map(analysis => ({
      timestamp: analysis.analysisTimestamp,
      riskScore: analysis.overallRiskScore * 100,
      riskLevel: analysis.riskLevel,
    }));
}

// Calculate percentage change
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Get status indicator color
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
    case 'connected':
    case 'healthy':
      return 'text-green-500';
    case 'warning':
    case 'degraded':
      return 'text-yellow-500';
    case 'error':
    case 'disconnected':
    case 'failed':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}