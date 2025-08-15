import React from 'react';
import { cn, getRiskColor, getSimulationActionColor } from '@/utils';
import type { RiskLevel } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'risk' | 'simulation' | 'success' | 'warning' | 'error';
  riskLevel?: RiskLevel;
  simulationAction?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base',
};

const variantClasses = {
  default: 'badge bg-gray-100 text-gray-800 border border-gray-200',
  success: 'badge bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200',
  warning: 'badge bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border border-yellow-200',
  error: 'badge bg-gradient-to-r from-red-50 to-orange-50 text-red-700 border border-red-200',
  risk: 'badge',
  simulation: 'badge',
};

export function Badge({
  children,
  variant = 'default',
  riskLevel,
  simulationAction,
  size = 'sm',
  className,
}: BadgeProps) {
  let colorClasses = '';

  if (variant === 'risk' && riskLevel) {
    const colors = getRiskColor(riskLevel);
    colorClasses = `${colors.bg} ${colors.text}`;
  } else if (variant === 'simulation' && simulationAction) {
    const colors = getSimulationActionColor(simulationAction);
    colorClasses = `${colors.bg} ${colors.text}`;
  } else {
    colorClasses = variantClasses[variant];
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold transition-all duration-200',
        sizeClasses[size],
        colorClasses,
        className
      )}
    >
      {children}
    </span>
  );
}

export function RiskBadge({ 
  riskLevel, 
  riskScore, 
  size = 'sm' 
}: { 
  riskLevel: RiskLevel; 
  riskScore: number; 
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <Badge variant="risk" riskLevel={riskLevel} size={size}>
      {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} ({Math.round(riskScore * 100)}%)
    </Badge>
  );
}

export function SimulationBadge({ 
  action, 
  size = 'sm' 
}: { 
  action: string; 
  size?: 'sm' | 'md' | 'lg';
}) {
  const actionText = action.charAt(0).toUpperCase() + action.slice(1);
  
  return (
    <Badge variant="simulation" simulationAction={action} size={size}>
      {actionText}
    </Badge>
  );
}

export function StatusBadge({ 
  status, 
  size = 'sm' 
}: { 
  status: 'active' | 'inactive' | 'processing' | 'error'; 
  size?: 'sm' | 'md' | 'lg';
}) {
  const variantMap = {
    active: 'success' as const,
    inactive: 'default' as const,
    processing: 'warning' as const,
    error: 'error' as const,
  };

  return (
    <Badge variant={variantMap[status]} size={size}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}