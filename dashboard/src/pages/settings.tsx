import React, { useState } from 'react';
import Head from 'next/head';
import { Save, RefreshCw, Bell, Shield, TrendingUp } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/common/Button';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useSettings } from '@/hooks/useApi';
import type { UserSettings } from '@/types';
import toast from 'react-hot-toast';

function SettingsContent() {
  const { settings, loading, updateSettings } = useSettings();
  const [formData, setFormData] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize form data when settings load
  React.useEffect(() => {
    if (settings && !formData) {
      setFormData(settings);
    }
  }, [settings, formData]);

  const handleSave = async () => {
    if (!formData) return;

    setSaving(true);
    try {
      await updateSettings(formData);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setFormData({ ...settings });
      toast.success('Settings reset to saved values');
    }
  };

  const updateFormData = (section: keyof UserSettings, key: string, value: any) => {
    if (!formData) return;
    
    setFormData({
      ...formData,
      [section]: {
        ...formData[section],
        [key]: value,
      },
    });
  };

  if (loading || !formData) {
    return (
      <div className="card p-8 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(formData);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure your security monitoring preferences</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={!hasChanges}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Reset
          </Button>
          
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges}
            icon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Risk Thresholds */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-medium text-gray-900">Risk Thresholds</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              High Risk Threshold (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="5"
              value={formData.riskThresholds.high * 100}
              onChange={(e) => updateFormData('riskThresholds', 'high', Number(e.target.value) / 100)}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tokens above this score are considered high risk
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medium Risk Threshold (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="5"
              value={formData.riskThresholds.medium * 100}
              onChange={(e) => updateFormData('riskThresholds', 'medium', Number(e.target.value) / 100)}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tokens above this score are considered medium risk
            </p>
          </div>
        </div>
      </div>

      {/* Minimum Requirements */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-medium text-gray-900">Minimum Requirements</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Liquidity (USD)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={formData.minimums.liquidityUSD}
              onChange={(e) => updateFormData('minimums', 'liquidityUSD', Number(e.target.value))}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tokens below this liquidity are flagged as high risk
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Holders
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={formData.minimums.holders}
              onChange={(e) => updateFormData('minimums', 'holders', Number(e.target.value))}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tokens with fewer holders are considered higher risk
            </p>
          </div>
        </div>
      </div>

      {/* Alert Settings */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Bell className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-medium text-gray-900">Alert Preferences</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">High Risk Token Alerts</h3>
              <p className="text-sm text-gray-500">
                Get notified when high-risk tokens are detected
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.alerts.highRiskTokens}
                onChange={(e) => updateFormData('alerts', 'highRiskTokens', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Rugpull Alerts</h3>
              <p className="text-sm text-gray-500">
                Get notified when potential rugpulls are identified
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.alerts.rugPullAlerts}
                onChange={(e) => updateFormData('alerts', 'rugPullAlerts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Honeypot Alerts</h3>
              <p className="text-sm text-gray-500">
                Get notified when honeypots are detected
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.alerts.honeypotAlerts}
                onChange={(e) => updateFormData('alerts', 'honeypotAlerts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Simulation Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Simulation Preferences</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Risk Profile
            </label>
            <select
              value={formData.simulation.defaultProfile}
              onChange={(e) => updateFormData('simulation', 'defaultProfile', e.target.value)}
              className="input"
            >
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Default profile for simulation scenarios
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Investment (USD)
            </label>
            <input
              type="number"
              min="100"
              step="100"
              value={formData.simulation.maxInvestment}
              onChange={(e) => updateFormData('simulation', 'maxInvestment', Number(e.target.value))}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum amount for simulation scenarios
            </p>
          </div>
        </div>
      </div>

      {/* Save Status */}
      {hasChanges && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-sm text-amber-800">You have unsaved changes</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <Head>
        <title>Settings - Solana Security Monitor</title>
        <meta name="description" content="Configure your security monitoring preferences" />
      </Head>

      <Layout>
        <ErrorBoundary>
          <SettingsContent />
        </ErrorBoundary>
      </Layout>
    </>
  );
}