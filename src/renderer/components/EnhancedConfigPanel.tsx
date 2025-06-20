import React, { useState, useEffect } from 'react';
import { VisionProvider } from '../../modules/ComprehensiveVisionProviders';
import {
  ProviderPreferences,
  UsageTracking,
  BudgetControl,
} from '../../modules/EnhancedVisionProviderManager';

interface EnhancedConfigPanelProps {
  onClose?: () => void;
}

const EnhancedConfigPanel: React.FC<EnhancedConfigPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<
    'providers' | 'preferences' | 'budget' | 'analytics' | 'recommendations'
  >('providers');
  const [providers, setProviders] = useState<Record<string, VisionProvider[]>>({});
  const [preferences, setPreferences] = useState<ProviderPreferences>({
    mode: 'free_only',
    maxMonthlyBudget: 0,
    qualityThreshold: 7.0,
    speedThreshold: 5000,
    preferredRegions: ['global'],
    blacklistedProviders: [],
    whitelistedProviders: [],
    enableSpecialized: true,
  });
  const [usageStats, setUsageStats] = useState<Map<string, UsageTracking>>(new Map());
  const [budgetControl, setBudgetControl] = useState<BudgetControl>({
    monthlyBudget: 0,
    currentSpend: 0,
    remainingBudget: 0,
    costPerRequest: {},
    projectedMonthlySpend: 0,
  });
  const [recommendations, setRecommendations] = useState<Record<string, VisionProvider[]>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [providersData, preferencesData, statsData, budgetData, recommendationsData] =
        await Promise.all([
          window.electronAPI.getProvidersByCategory(),
          window.electronAPI.getProviderPreferences(),
          window.electronAPI.getProviderStatistics(),
          window.electronAPI.getBudgetStatus(),
          window.electronAPI.getProviderRecommendations(),
        ]);

      setProviders(providersData);
      setPreferences(preferencesData);
      setUsageStats(new Map(Object.entries(statsData)));
      setBudgetControl(budgetData);
      setRecommendations(recommendationsData);
    } catch (error) {
      console.error('Failed to load enhanced config data:', error);
    }
  };

  const updatePreferences = async (newPreferences: Partial<ProviderPreferences>) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      await window.electronAPI.updateProviderPreferences(updatedPreferences);
      setPreferences(updatedPreferences);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'completely_free':
        return '🆓';
      case 'free_trial':
        return '🎁';
      case 'freemium':
        return '⚡';
      case 'premium_optional':
        return '💎';
      case 'specialized':
        return '🔧';
      default:
        return '📊';
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'local':
        return <span className="tier-badge local">💻 Local</span>;
      case 'free_cloud':
        return <span className="tier-badge free-cloud">☁️ Free Cloud</span>;
      case 'free_credits':
        return <span className="tier-badge free-credits">🎁 Free Credits</span>;
      case 'freemium':
        return <span className="tier-badge freemium">⚡ Freemium</span>;
      case 'premium':
        return <span className="tier-badge premium">💎 Premium</span>;
      default:
        return <span className="tier-badge unknown">❓ Unknown</span>;
    }
  };

  const getQualityStars = (score: number) => {
    const stars = Math.round(score);
    return '⭐'.repeat(Math.min(stars, 10));
  };

  const formatCost = (cost: number) => {
    if (cost === 0) return 'Free';
    if (cost < 0.001) return '<$0.001';
    return `$${cost.toFixed(3)}`;
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="enhanced-config-panel">
      <div className="panel-header">
        <h2>🚀 Comprehensive AI Vision Configuration (2025 Edition)</h2>
        {onClose && (
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab ${activeTab === 'providers' ? 'active' : ''}`}
          onClick={() => setActiveTab('providers')}
        >
          🔍 Providers
        </button>
        <button
          className={`tab ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          ⚙️ Preferences
        </button>
        <button
          className={`tab ${activeTab === 'budget' ? 'active' : ''}`}
          onClick={() => setActiveTab('budget')}
        >
          💰 Budget
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>
        <button
          className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          🎯 Recommendations
        </button>
      </div>

      {/* Providers Tab */}
      {activeTab === 'providers' && (
        <div className="tab-content">
          <div className="providers-overview">
            <h3>📋 Available Providers ({Object.values(providers).flat().length} total)</h3>

            {Object.entries(providers).map(([category, categoryProviders]) => (
              <div key={category} className="provider-category">
                <h4>
                  {getCategoryIcon(category)} {category.replace('_', ' ').toUpperCase()}
                  <span className="provider-count">({categoryProviders.length})</span>
                </h4>

                <div className="providers-grid">
                  {categoryProviders.map((provider) => (
                    <div key={provider.id} className="provider-card">
                      <div className="provider-header">
                        <h5>{provider.name}</h5>
                        {getTierBadge(provider.tier)}
                        <span
                          className={`availability ${provider.isAvailable ? 'available' : 'unavailable'}`}
                        >
                          {provider.isAvailable ? '✅' : '❌'}
                        </span>
                      </div>

                      <div className="provider-details">
                        <div className="detail-row">
                          <span>Quality:</span>
                          <span>
                            {getQualityStars(provider.qualityScore)} ({provider.qualityScore}/10)
                          </span>
                        </div>
                        <div className="detail-row">
                          <span>Speed:</span>
                          <span>{formatResponseTime(provider.avgResponseTime)}</span>
                        </div>
                        <div className="detail-row">
                          <span>Cost:</span>
                          <span>{formatCost(provider.costPerRequest || 0)}</span>
                        </div>
                        {provider.dailyLimit && (
                          <div className="detail-row">
                            <span>Daily Limit:</span>
                            <span>{provider.dailyLimit.toLocaleString()}</span>
                          </div>
                        )}
                        {provider.monthlyLimit && (
                          <div className="detail-row">
                            <span>Monthly Limit:</span>
                            <span>{provider.monthlyLimit.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="provider-capabilities">
                        {provider.supportsOCR && <span className="capability">📝 OCR</span>}
                        {provider.supportsUIAnalysis && <span className="capability">🖥️ UI</span>}
                        {provider.supportsDocumentAnalysis && (
                          <span className="capability">📄 Docs</span>
                        )}
                        {provider.supportsObjectDetection && (
                          <span className="capability">🎯 Objects</span>
                        )}
                        {provider.supportsSceneAnalysis && (
                          <span className="capability">🌄 Scenes</span>
                        )}
                      </div>

                      <div className="provider-description">
                        <p>{provider.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="tab-content">
          <div className="preferences-section">
            <h3>⚙️ Provider Preferences</h3>

            <div className="preference-group">
              <h4>🎯 Operation Mode</h4>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="mode"
                    value="free_only"
                    checked={preferences.mode === 'free_only'}
                    onChange={(e) => updatePreferences({ mode: e.target.value as any })}
                  />
                  🆓 Free Only - Use only free providers
                </label>
                <label>
                  <input
                    type="radio"
                    name="mode"
                    value="hybrid"
                    checked={preferences.mode === 'hybrid'}
                    onChange={(e) => updatePreferences({ mode: e.target.value as any })}
                  />
                  ⚡ Hybrid - Free first, paid if needed
                </label>
                <label>
                  <input
                    type="radio"
                    name="mode"
                    value="premium_preferred"
                    checked={preferences.mode === 'premium_preferred'}
                    onChange={(e) => updatePreferences({ mode: e.target.value as any })}
                  />
                  💎 Premium Preferred - Best quality available
                </label>
              </div>
            </div>

            <div className="preference-group">
              <h4>🎚️ Quality & Performance Thresholds</h4>
              <div className="slider-group">
                <label>
                  Quality Threshold: {preferences.qualityThreshold}/10
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.1"
                    value={preferences.qualityThreshold}
                    onChange={(e) =>
                      updatePreferences({ qualityThreshold: parseFloat(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Max Response Time: {formatResponseTime(preferences.speedThreshold)}
                  <input
                    type="range"
                    min="500"
                    max="10000"
                    step="100"
                    value={preferences.speedThreshold}
                    onChange={(e) =>
                      updatePreferences({ speedThreshold: parseInt(e.target.value) })
                    }
                  />
                </label>
              </div>
            </div>

            <div className="preference-group">
              <h4>🌍 Regional Preferences</h4>
              <div className="checkbox-group">
                {['global', 'us', 'eu', 'asia'].map((region) => (
                  <label key={region}>
                    <input
                      type="checkbox"
                      checked={preferences.preferredRegions.includes(region)}
                      onChange={(e) => {
                        const regions = e.target.checked
                          ? [...preferences.preferredRegions, region]
                          : preferences.preferredRegions.filter((r) => r !== region);
                        updatePreferences({ preferredRegions: regions });
                      }}
                    />
                    {region.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>

            <div className="preference-group">
              <h4>🔧 Advanced Options</h4>
              <label>
                <input
                  type="checkbox"
                  checked={preferences.enableSpecialized}
                  onChange={(e) => updatePreferences({ enableSpecialized: e.target.checked })}
                />
                Enable specialized providers (OCR, document analysis)
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Budget Tab */}
      {activeTab === 'budget' && (
        <div className="tab-content">
          <div className="budget-section">
            <h3>💰 Budget Control</h3>

            <div className="budget-overview">
              <div className="budget-card">
                <h4>Monthly Budget</h4>
                <div className="budget-amount">${budgetControl.monthlyBudget.toFixed(2)}</div>
              </div>
              <div className="budget-card">
                <h4>Current Spend</h4>
                <div className="budget-amount">${budgetControl.currentSpend.toFixed(2)}</div>
              </div>
              <div className="budget-card">
                <h4>Remaining</h4>
                <div className="budget-amount">${budgetControl.remainingBudget.toFixed(2)}</div>
              </div>
              <div className="budget-card">
                <h4>Projected</h4>
                <div className="budget-amount">
                  ${budgetControl.projectedMonthlySpend.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="budget-controls">
              <h4>💳 Set Monthly Budget</h4>
              <div className="budget-input">
                <label>
                  Monthly Budget (USD):
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={preferences.maxMonthlyBudget}
                    onChange={(e) =>
                      updatePreferences({ maxMonthlyBudget: parseFloat(e.target.value) || 0 })
                    }
                  />
                </label>
              </div>

              <div className="budget-presets">
                <h5>Quick Presets:</h5>
                <button onClick={() => updatePreferences({ maxMonthlyBudget: 0 })}>
                  🆓 Free Only ($0)
                </button>
                <button onClick={() => updatePreferences({ maxMonthlyBudget: 10 })}>
                  💡 Light Usage ($10)
                </button>
                <button onClick={() => updatePreferences({ maxMonthlyBudget: 50 })}>
                  ⚡ Medium Usage ($50)
                </button>
                <button onClick={() => updatePreferences({ maxMonthlyBudget: 200 })}>
                  🚀 Heavy Usage ($200)
                </button>
              </div>
            </div>

            <div className="cost-breakdown">
              <h4>📊 Cost Per Provider</h4>
              <div className="cost-table">
                {Object.entries(budgetControl.costPerRequest).map(([providerId, cost]) => (
                  <div key={providerId} className="cost-row">
                    <span>{providerId}</span>
                    <span>{formatCost(cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="tab-content">
          <div className="analytics-section">
            <h3>📊 Usage Analytics</h3>

            <div className="analytics-overview">
              <div className="analytics-summary">
                <div className="summary-card">
                  <h4>Total Requests</h4>
                  <div className="summary-value">
                    {Array.from(usageStats.values())
                      .reduce((sum, stat) => sum + stat.requestCount, 0)
                      .toLocaleString()}
                  </div>
                </div>
                <div className="summary-card">
                  <h4>Success Rate</h4>
                  <div className="summary-value">
                    {(() => {
                      const total = Array.from(usageStats.values()).reduce(
                        (sum, stat) => sum + stat.requestCount,
                        0
                      );
                      const success = Array.from(usageStats.values()).reduce(
                        (sum, stat) => sum + stat.successCount,
                        0
                      );
                      return total > 0 ? `${Math.round((success / total) * 100)}%` : '0%';
                    })()}
                  </div>
                </div>
                <div className="summary-card">
                  <h4>Total Cost</h4>
                  <div className="summary-value">
                    $
                    {Array.from(usageStats.values())
                      .reduce((sum, stat) => sum + stat.totalCost, 0)
                      .toFixed(2)}
                  </div>
                </div>
                <div className="summary-card">
                  <h4>Avg Response Time</h4>
                  <div className="summary-value">
                    {(() => {
                      const stats = Array.from(usageStats.values()).filter(
                        (s) => s.requestCount > 0
                      );
                      const avgTime =
                        stats.reduce((sum, stat) => sum + stat.avgResponseTime, 0) / stats.length;
                      return formatResponseTime(avgTime || 0);
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="provider-analytics">
              <h4>📈 Provider Performance</h4>
              <div className="analytics-table">
                <div className="table-header">
                  <span>Provider</span>
                  <span>Requests</span>
                  <span>Success Rate</span>
                  <span>Avg Time</span>
                  <span>Total Cost</span>
                  <span>Quality</span>
                </div>
                {Array.from(usageStats.entries()).map(([providerId, stats]) => (
                  <div key={providerId} className="table-row">
                    <span>{providerId}</span>
                    <span>{stats.requestCount.toLocaleString()}</span>
                    <span>
                      {stats.requestCount > 0
                        ? `${Math.round((stats.successCount / stats.requestCount) * 100)}%`
                        : '0%'}
                    </span>
                    <span>{formatResponseTime(stats.avgResponseTime)}</span>
                    <span>${stats.totalCost.toFixed(2)}</span>
                    <span>{getQualityStars(stats.qualityRating)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="tab-content">
          <div className="recommendations-section">
            <h3>🎯 Provider Recommendations</h3>

            {Object.entries(recommendations).map(([useCase, providers]) => (
              <div key={useCase} className="recommendation-group">
                <h4>
                  {useCase === 'cost_optimization' && '💰 Cost Optimization'}
                  {useCase === 'quality_focused' && '🎯 Quality Focused'}
                  {useCase === 'speed_focused' && '⚡ Speed Focused'}
                  {useCase === 'document_analysis' && '📄 Document Analysis'}
                  {useCase === 'ui_analysis' && '🖥️ UI Analysis'}
                </h4>

                <div className="recommendation-list">
                  {providers.slice(0, 3).map((provider, index) => (
                    <div key={provider.id} className="recommendation-item">
                      <div className="rank">#{index + 1}</div>
                      <div className="provider-info">
                        <h5>{provider.name}</h5>
                        <div className="provider-stats">
                          <span>Quality: {provider.qualityScore}/10</span>
                          <span>Speed: {formatResponseTime(provider.avgResponseTime)}</span>
                          <span>Cost: {formatCost(provider.costPerRequest || 0)}</span>
                        </div>
                      </div>
                      {getTierBadge(provider.tier)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedConfigPanel;
