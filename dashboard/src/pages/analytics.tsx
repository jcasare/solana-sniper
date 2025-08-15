import React, { useState } from 'react';
import Head from 'next/head';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  BarChart3,
  PieChart,
  Target,
  Clock,
  Calendar,
  DollarSign,
  Shield,
  AlertTriangle,
  CheckCircle,
  Zap,
  Eye,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useSystemOverview } from '@/hooks/useApi';
import { formatCurrency, formatTimeAgo, formatPercentage, cn } from '@/utils';

interface AnalyticsData {
  totalTokensAnalyzed: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  detectionStats: {
    honeypots: number;
    rugpulls: number;
    abandoned: number;
    suspicious: number;
  };
  performanceMetrics: {
    accuracy: number;
    falsePositives: number;
    detectionRate: number;
    avgAnalysisTime: number;
  };
  timeSeriesData: Array<{
    date: string;
    tokensAnalyzed: number;
    riskDetected: number;
    accuracy: number;
  }>;
}

// Mock analytics data
const mockAnalytics: AnalyticsData = {
  totalTokensAnalyzed: 15247,
  riskDistribution: {
    low: 8945,
    medium: 4234,
    high: 1678,
    critical: 390
  },
  detectionStats: {
    honeypots: 234,
    rugpulls: 89,
    abandoned: 156,
    suspicious: 445
  },
  performanceMetrics: {
    accuracy: 0.94,
    falsePositives: 0.08,
    detectionRate: 0.87,
    avgAnalysisTime: 2.3
  },
  timeSeriesData: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
    tokensAnalyzed: Math.floor(Math.random() * 500) + 200,
    riskDetected: Math.floor(Math.random() * 100) + 20,
    accuracy: 0.85 + Math.random() * 0.15
  }))
};

function AnalyticsContent() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('30d');
  const [metric, setMetric] = useState<'accuracy' | 'detections' | 'volume'>('accuracy');
  const { data: overview, isLoading } = useSystemOverview();

  const data = {
    totalTokensAnalyzed: overview?.tokens?.total || mockAnalytics.totalTokensAnalyzed || 0,
    riskDistribution: overview?.tokens?.riskDistribution || mockAnalytics.riskDistribution || {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    },
    detectionStats: mockAnalytics.detectionStats,
    performanceMetrics: {
      accuracy: overview?.simulation?.accuracy || mockAnalytics.performanceMetrics.accuracy || 0,
      falsePositives: mockAnalytics.performanceMetrics.falsePositives || 0,
      detectionRate: mockAnalytics.performanceMetrics.detectionRate || 0,
      avgAnalysisTime: mockAnalytics.performanceMetrics.avgAnalysisTime || 0
    },
    timeSeriesData: mockAnalytics.timeSeriesData
  };
  
  const totalRiskyTokens = (data.riskDistribution?.high || 0) + (data.riskDistribution?.critical || 0);
  const riskPercentage = data.totalTokensAnalyzed ? (totalRiskyTokens / data.totalTokensAnalyzed) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold gradient-text">Security Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive insights into token security analysis</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            size="sm"
          >
            Export Report
          </Button>
          
          <Button
            variant="primary"
            icon={<RefreshCw className="w-4 h-4" />}
            size="sm"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Total Analyzed</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {(data.totalTokensAnalyzed || 0).toLocaleString()}
              </p>
              <p className="text-xs text-blue-600 mt-1">+234 today</p>
            </div>
            <div className="p-4 bg-blue-100 rounded-xl">
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-600 uppercase tracking-wide">Detection Accuracy</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {formatPercentage(data.performanceMetrics?.accuracy || 0)}
              </p>
              <p className="text-xs text-green-600 mt-1">↑ 2.3% this week</p>
            </div>
            <div className="p-4 bg-green-100 rounded-xl">
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-red-50 to-orange-50 border-red-200 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-600 uppercase tracking-wide">High Risk Tokens</p>
              <p className="text-3xl font-bold text-red-900 mt-1">
                {(totalRiskyTokens || 0).toLocaleString()}
              </p>
              <p className="text-xs text-red-600 mt-1">{riskPercentage.toFixed(1)}% of total</p>
            </div>
            <div className="p-4 bg-red-100 rounded-xl">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-purple-600 uppercase tracking-wide">Avg Analysis Time</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">
                {data.performanceMetrics?.avgAnalysisTime || 0}s
              </p>
              <p className="text-xs text-purple-600 mt-1">↓ 0.4s faster</p>
            </div>
            <div className="p-4 bg-purple-100 rounded-xl">
              <Zap className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Analytics Period</h3>
          </div>
          
          <div className="flex space-x-2">
            {(['24h', '7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  timeRange === range
                    ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {range === '24h' ? 'Last 24 Hours' :
                 range === '7d' ? 'Last 7 Days' :
                 range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Risk Distribution Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Risk Distribution</h3>
            <PieChart className="w-6 h-6 text-gray-500" />
          </div>
          
          <div className="space-y-4">
            {Object.entries(data.riskDistribution || {}).map(([risk, count]) => {
              const numCount = typeof count === 'number' ? count : 0;
              const percentage = data.totalTokensAnalyzed > 0 ? (numCount / data.totalTokensAnalyzed) * 100 : 0;
              const colors = {
                low: 'from-green-500 to-emerald-500',
                medium: 'from-yellow-500 to-amber-500', 
                high: 'from-red-500 to-orange-500',
                critical: 'from-red-600 to-red-800'
              };
              
              return (
                <div key={risk} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-4 h-4 rounded-full bg-gradient-to-r",
                        colors[risk as keyof typeof colors]
                      )} />
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {risk} Risk
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">
                        {numCount.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full bg-gradient-to-r transition-all duration-500",
                        colors[risk as keyof typeof colors]
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detection Statistics */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Threat Detection</h3>
            <AlertTriangle className="w-6 h-6 text-gray-500" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(data.detectionStats || {}).map(([type, count]) => {
              const icons = {
                honeypots: <Shield className="w-5 h-5" />,
                rugpulls: <TrendingDown className="w-5 h-5" />,
                abandoned: <Clock className="w-5 h-5" />,
                suspicious: <Eye className="w-5 h-5" />
              };
              
              const colors = {
                honeypots: 'text-red-600 bg-red-50 border-red-200',
                rugpulls: 'text-orange-600 bg-orange-50 border-orange-200',
                abandoned: 'text-gray-600 bg-gray-50 border-gray-200',
                suspicious: 'text-yellow-600 bg-yellow-50 border-yellow-200'
              };
              
              return (
                <div key={type} className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105",
                  colors[type as keyof typeof colors]
                )}>
                  <div className="flex items-center space-x-3">
                    {icons[type as keyof typeof icons]}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                        {type}
                      </p>
                      <p className="text-2xl font-bold">
                        {count.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">System Performance</h3>
          <BarChart3 className="w-6 h-6 text-gray-500" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Accuracy Rate</p>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {formatPercentage(data.performanceMetrics.accuracy)}
            </p>
            <p className="text-xs text-blue-600 mt-1">Industry leading precision</p>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-green-600 uppercase tracking-wide">Detection Rate</p>
            <p className="text-3xl font-bold text-green-900 mt-2">
              {formatPercentage(data.performanceMetrics?.detectionRate || 0)}
            </p>
            <p className="text-xs text-green-600 mt-1">Threats successfully identified</p>
          </div>
          
          <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide">False Positive Rate</p>
            <p className="text-3xl font-bold text-amber-900 mt-2">
              {formatPercentage(data.performanceMetrics?.falsePositives || 0)}
            </p>
            <p className="text-xs text-amber-600 mt-1">Minimal false alarms</p>
          </div>
        </div>
      </div>

      {/* Time Series Chart Placeholder */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Analysis Trends</h3>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select 
              value={metric}
              onChange={(e) => setMetric(e.target.value as any)}
              className="input w-40"
            >
              <option value="accuracy">Accuracy</option>
              <option value="detections">Detections</option>
              <option value="volume">Volume</option>
            </select>
          </div>
        </div>
        
        <div className="h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Interactive time series chart</p>
            <p className="text-sm text-gray-400 mt-1">Chart visualization coming soon...</p>
          </div>
        </div>
      </div>

      {/* Recent Insights */}
      <div className="card p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Security Insights</h3>
        
        <div className="space-y-4">
          {[
            {
              type: 'success',
              title: 'Detection Model Update',
              description: 'Honeypot detection accuracy improved by 3.2% with latest ML model update',
              time: '2 hours ago',
              icon: <CheckCircle className="w-5 h-5" />
            },
            {
              type: 'warning', 
              title: 'New Attack Pattern Identified',
              description: 'Emerging liquidity drain technique detected in 12 recent token launches',
              time: '4 hours ago',
              icon: <AlertTriangle className="w-5 h-5" />
            },
            {
              type: 'info',
              title: 'Analysis Volume Spike',
              description: 'Processing 40% more tokens than usual - possibly due to market conditions',
              time: '6 hours ago',
              icon: <TrendingUp className="w-5 h-5" />
            }
          ].map((insight, index) => {
            const colors = {
              success: 'text-green-600 bg-green-50 border-green-200',
              warning: 'text-amber-600 bg-amber-50 border-amber-200',
              info: 'text-blue-600 bg-blue-50 border-blue-200'
            };
            
            return (
              <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                <div className={cn(
                  "p-2 rounded-lg border",
                  colors[insight.type as keyof typeof colors]
                )}>
                  {insight.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  <p className="text-xs text-gray-400 mt-2">{insight.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <>
      <Head>
        <title>Analytics - Solana Security Monitor</title>
        <meta name="description" content="Comprehensive security analytics and insights" />
      </Head>

      <Layout>
        <ErrorBoundary>
          <AnalyticsContent />
        </ErrorBoundary>
      </Layout>
    </>
  );
}