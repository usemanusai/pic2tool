import React, { useState, useEffect } from 'react';

interface APIKey {
  id: string;
  provider: 'openai' | 'google' | 'azure' | 'aws' | 'huggingface' | 'ollama';
  key: string;
  name?: string;
  isActive: boolean;
  isRateLimited: boolean;
  isExpired: boolean;
  isDailyLimitExceeded: boolean;
  usageCount: number;
  dailyLimit: number;
  tier: string;
}

interface FreeProvider {
  name: string;
  isLocal: boolean;
  isAvailable: boolean;
  maxImageSize: number;
  supportedFormats: string[];
}

interface UsageStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  rateLimitHits: number;
  lastReset: Date;
}

const ConfigPanel: React.FC = () => {
  const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, APIKey[]>>({});
  const [freeProviders, setFreeProviders] = useState<FreeProvider[]>([]);
  const [usageStats, setUsageStats] = useState<Map<string, UsageStats>>(new Map());
  const [newKey, setNewKey] = useState({
    provider: 'openai' as APIKey['provider'],
    key: '',
    name: '',
    tier: 'free' as 'free' | 'trial' | 'paid',
    dailyLimit: 100
  });
  const [settings, setSettings] = useState({
    frameRate: 2,
    skipSimilarFrames: true,
    similarityThreshold: 0.95,
    maxFrames: 1000,
    preferFreeProviders: true,
    fallbackToFree: true,
    maxRetries: 3
  });
  const [activeTab, setActiveTab] = useState<'keys' | 'free' | 'settings' | 'stats'>('keys');

  useEffect(() => {
    loadSettings();
    loadAPIKeyStatus();
    loadFreeProviders();
    loadUsageStats();

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      loadAPIKeyStatus();
      loadFreeProviders();
      loadUsageStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await window.electronAPI.getSettings();
      if (savedSettings.processing) {
        setSettings(prev => ({ ...prev, ...savedSettings.processing }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadAPIKeyStatus = async () => {
    try {
      const status = await window.electronAPI.getAPIKeyStatus();
      setApiKeyStatus(status);
    } catch (error) {
      console.error('Failed to load API key status:', error);
    }
  };

  const loadFreeProviders = async () => {
    try {
      const providers = await window.electronAPI.getFreeProviderStatus();
      setFreeProviders(providers);
    } catch (error) {
      console.error('Failed to load free providers:', error);
    }
  };

  const loadUsageStats = async () => {
    try {
      const stats = await window.electronAPI.getUsageStatistics();
      setUsageStats(new Map(Object.entries(stats)));
    } catch (error) {
      console.error('Failed to load usage statistics:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await window.electronAPI.saveSettings({ processing: settings });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
  };

  const addApiKey = async () => {
    if (!newKey.key.trim()) {
      alert('Please enter an API key');
      return;
    }

    try {
      await window.electronAPI.addAPIKey(newKey.provider, newKey.key.trim(), {
        name: newKey.name || undefined,
        tier: newKey.tier,
        dailyLimit: newKey.dailyLimit
      });

      setNewKey({
        provider: 'openai',
        key: '',
        name: '',
        tier: 'free',
        dailyLimit: 100
      });

      // Refresh API key status
      await loadAPIKeyStatus();
      alert('API key added successfully!');
    } catch (error) {
      console.error('Failed to add API key:', error);
      alert('Failed to add API key');
    }
  };

  const removeApiKey = async (keyId: string) => {
    try {
      await window.electronAPI.removeAPIKey(keyId);
      await loadAPIKeyStatus();
      alert('API key removed successfully!');
    } catch (error) {
      console.error('Failed to remove API key:', error);
      alert('Failed to remove API key');
    }
  };

  const resetDailyUsage = async () => {
    try {
      await window.electronAPI.resetDailyUsage();
      await loadAPIKeyStatus();
      await loadUsageStats();
      alert('Daily usage counters reset successfully!');
    } catch (error) {
      console.error('Failed to reset daily usage:', error);
      alert('Failed to reset daily usage');
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
  };

  const getStatusIcon = (apiKey: APIKey) => {
    if (!apiKey.isActive) return '⏸️';
    if (apiKey.isRateLimited) return '⏳';
    if (apiKey.isExpired) return '⚠️';
    if (apiKey.isDailyLimitExceeded) return '🚫';
    return '✅';
  };

  const getStatusText = (apiKey: APIKey) => {
    if (!apiKey.isActive) return 'Inactive';
    if (apiKey.isRateLimited) return 'Rate Limited';
    if (apiKey.isExpired) return 'Expired';
    if (apiKey.isDailyLimitExceeded) return 'Daily Limit Exceeded';
    return 'Active';
  };

  return (
    <div className="config-panel">
      <h3>🔧 Multi-API Configuration & Free Tier Optimization</h3>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab ${activeTab === 'keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('keys')}
        >
          🔑 API Keys
        </button>
        <button
          className={`tab ${activeTab === 'free' ? 'active' : ''}`}
          onClick={() => setActiveTab('free')}
        >
          🆓 Free Providers
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
        <button
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Usage Stats
        </button>
      </div>

      {/* API Keys Tab */}
      {activeTab === 'keys' && (
        <div className="config-section">
          <h4>🔑 API Key Pool Management</h4>
          <p>Add multiple API keys for automatic rotation and rate limit avoidance</p>

          {Object.entries(apiKeyStatus).map(([provider, keys]) => (
            <div key={provider} className="provider-section">
              <h5>{provider.toUpperCase()} Keys ({keys.length})</h5>

              {keys.length === 0 ? (
                <p className="no-keys">No keys configured for this provider</p>
              ) : (
                <div className="api-keys-list">
                  {keys.map((apiKey) => (
                    <div key={apiKey.id} className="api-key-item">
                      <div className="api-key-info">
                        <span className="status-icon" title={getStatusText(apiKey)}>
                          {getStatusIcon(apiKey)}
                        </span>
                        <span className="key-name">{apiKey.name || apiKey.id}</span>
                        <span className="tier-badge">{apiKey.tier}</span>
                        <span className="usage-info">
                          {apiKey.usageCount}/{apiKey.dailyLimit}
                        </span>
                      </div>
                      <button
                        className="remove-button"
                        onClick={() => removeApiKey(apiKey.id)}
                        title="Remove API key"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="add-api-key">
            <h5>Add New API Key</h5>
            <div className="form-row">
              <select
                value={newKey.provider}
                onChange={(e) => setNewKey(prev => ({ ...prev, provider: e.target.value as APIKey['provider'] }))}
              >
                <option value="openai">OpenAI GPT-4V</option>
                <option value="google">Google Vision</option>
                <option value="azure">Azure Computer Vision</option>
                <option value="aws">AWS Rekognition</option>
                <option value="huggingface">Hugging Face</option>
              </select>
              <input
                type="text"
                value={newKey.name}
                onChange={(e) => setNewKey(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Key name (optional)"
              />
            </div>
            <div className="form-row">
              <input
                type="password"
                value={newKey.key}
                onChange={(e) => setNewKey(prev => ({ ...prev, key: e.target.value }))}
                placeholder="Enter API key"
              />
              <select
                value={newKey.tier}
                onChange={(e) => setNewKey(prev => ({ ...prev, tier: e.target.value as 'free' | 'trial' | 'paid' }))}
              >
                <option value="free">Free Tier</option>
                <option value="trial">Trial Account</option>
                <option value="paid">Paid Account</option>
              </select>
            </div>
            <div className="form-row">
              <input
                type="number"
                value={newKey.dailyLimit}
                onChange={(e) => setNewKey(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) }))}
                placeholder="Daily limit"
                min="1"
                max="10000"
              />
              <button onClick={addApiKey}>Add Key</button>
            </div>
          </div>

          <div className="key-actions">
            <button onClick={resetDailyUsage} className="reset-button">
              🔄 Reset Daily Usage
            </button>
          </div>
        </div>
      )}

      {/* Free Providers Tab */}
      {activeTab === 'free' && (
        <div className="config-section">
          <h4>🆓 Free Vision API Providers</h4>
          <p>Completely free alternatives that don't require API keys</p>

          <div className="free-providers-list">
            {freeProviders.map((provider, index) => (
              <div key={index} className="provider-item">
                <div className="provider-info">
                  <span className="provider-name">{provider.name}</span>
                  <span className={`provider-type ${provider.isLocal ? 'local' : 'cloud'}`}>
                    {provider.isLocal ? '💻 Local' : '☁️ Cloud'}
                  </span>
                  <span className={`availability ${provider.isAvailable ? 'available' : 'unavailable'}`}>
                    {provider.isAvailable ? '✅ Available' : '❌ Unavailable'}
                  </span>
                </div>
                <div className="provider-details">
                  <span>Max size: {(provider.maxImageSize / 1024 / 1024).toFixed(1)}MB</span>
                  <span>Formats: {provider.supportedFormats.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="free-provider-info">
            <h5>📋 Setup Instructions:</h5>
            <ul>
              <li><strong>Ollama LLaVA (Recommended):</strong> Install Ollama and run <code>ollama pull llava</code></li>
              <li><strong>Hugging Face:</strong> No setup required, but has rate limits</li>
              <li><strong>Azure/AWS Free Tier:</strong> Add free tier API keys above</li>
            </ul>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="config-section">
          <h4>⚙️ Analysis Settings</h4>

          <div className="setting-group">
            <h5>🎬 Video Processing</h5>
            <div className="setting-item">
              <label>Frame Rate (frames per second):</label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.frameRate}
                onChange={(e) => setSettings(prev => ({ ...prev, frameRate: parseInt(e.target.value) }))}
              />
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.skipSimilarFrames}
                  onChange={(e) => setSettings(prev => ({ ...prev, skipSimilarFrames: e.target.checked }))}
                />
                Skip similar frames
              </label>
            </div>

            {settings.skipSimilarFrames && (
              <div className="setting-item">
                <label>Similarity threshold:</label>
                <input
                  type="range"
                  min="0.8"
                  max="0.99"
                  step="0.01"
                  value={settings.similarityThreshold}
                  onChange={(e) => setSettings(prev => ({ ...prev, similarityThreshold: parseFloat(e.target.value) }))}
                />
                <span>{settings.similarityThreshold}</span>
              </div>
            )}

            <div className="setting-item">
              <label>Maximum frames to process:</label>
              <input
                type="number"
                min="100"
                max="5000"
                step="100"
                value={settings.maxFrames}
                onChange={(e) => setSettings(prev => ({ ...prev, maxFrames: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <div className="setting-group">
            <h5>🤖 AI Provider Strategy</h5>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.preferFreeProviders}
                  onChange={(e) => setSettings(prev => ({ ...prev, preferFreeProviders: e.target.checked }))}
                />
                Prefer free providers (saves API costs)
              </label>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.fallbackToFree}
                  onChange={(e) => setSettings(prev => ({ ...prev, fallbackToFree: e.target.checked }))}
                />
                Fallback to free providers when paid APIs fail
              </label>
            </div>

            <div className="setting-item">
              <label>Maximum retries per provider:</label>
              <input
                type="number"
                min="1"
                max="5"
                value={settings.maxRetries}
                onChange={(e) => setSettings(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Usage Stats Tab */}
      {activeTab === 'stats' && (
        <div className="config-section">
          <h4>📊 Usage Statistics</h4>

          <div className="stats-overview">
            <div className="stat-card">
              <h5>Total API Keys</h5>
              <span className="stat-value">
                {Object.values(apiKeyStatus).reduce((sum, keys) => sum + keys.length, 0)}
              </span>
            </div>
            <div className="stat-card">
              <h5>Active Keys</h5>
              <span className="stat-value">
                {Object.values(apiKeyStatus).reduce((sum, keys) =>
                  sum + keys.filter(k => k.isActive && !k.isRateLimited && !k.isDailyLimitExceeded).length, 0
                )}
              </span>
            </div>
            <div className="stat-card">
              <h5>Free Providers</h5>
              <span className="stat-value">
                {freeProviders.filter(p => p.isAvailable).length}/{freeProviders.length}
              </span>
            </div>
          </div>

          <div className="usage-details">
            {Array.from(usageStats.entries()).map(([keyId, stats]) => (
              <div key={keyId} className="usage-item">
                <div className="usage-header">
                  <span className="key-id">{keyId}</span>
                  <span className="success-rate">
                    {stats.totalCalls > 0 ?
                      `${Math.round((stats.successfulCalls / stats.totalCalls) * 100)}% success` :
                      'No calls'
                    }
                  </span>
                </div>
                <div className="usage-stats">
                  <span>Total: {stats.totalCalls}</span>
                  <span>Success: {stats.successfulCalls}</span>
                  <span>Failed: {stats.failedCalls}</span>
                  <span>Rate Limited: {stats.rateLimitHits}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="config-actions">
        <button className="save-button" onClick={saveSettings}>
          💾 Save Settings
        </button>
      </div>

      <div className="config-info">
        <h4>💡 Free Tier Optimization Tips:</h4>
        <div className="info-grid">
          <div className="info-section">
            <h5>🆓 Completely Free Options:</h5>
            <ul>
              <li><strong>Ollama LLaVA:</strong> Best option - runs locally, unlimited usage</li>
              <li><strong>Hugging Face:</strong> Cloud-based, rate limited but free</li>
              <li><strong>Multiple Free Trial Accounts:</strong> Create multiple accounts for each provider</li>
            </ul>
          </div>

          <div className="info-section">
            <h5>🔑 API Key Strategy:</h5>
            <ul>
              <li><strong>OpenAI:</strong> $5 free credit for new accounts</li>
              <li><strong>Google Vision:</strong> 1000 free requests/month</li>
              <li><strong>Azure:</strong> 5000 free requests/month</li>
              <li><strong>AWS:</strong> 1000 free requests/month</li>
              <li><strong>Hugging Face:</strong> Higher rate limits with free account</li>
            </ul>
          </div>

          <div className="info-section">
            <h5>⚡ Smart Features:</h5>
            <ul>
              <li><strong>Automatic Key Rotation:</strong> Switches keys when rate limited</li>
              <li><strong>Free Provider Priority:</strong> Uses free options first</li>
              <li><strong>Intelligent Fallback:</strong> Falls back to free providers</li>
              <li><strong>Usage Tracking:</strong> Monitors daily limits</li>
              <li><strong>Secure Storage:</strong> Keys encrypted locally</li>
            </ul>
          </div>
        </div>

        <div className="cost-savings">
          <h5>💰 Estimated Cost Savings:</h5>
          <p>With this multi-API rotation system and free provider integration, you can analyze thousands of frames completely free by:</p>
          <ol>
            <li>Using Ollama LLaVA for unlimited local analysis</li>
            <li>Rotating through multiple free trial accounts</li>
            <li>Staying within free tier limits of each provider</li>
            <li>Automatic fallback to free alternatives</li>
          </ol>
          <p><strong>Result:</strong> $0 cost instead of $50-200+ per month for heavy usage!</p>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;
