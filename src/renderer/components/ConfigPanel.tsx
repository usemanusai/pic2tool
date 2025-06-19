import React, { useState, useEffect } from 'react';

interface APIKey {
  id: string;
  service: 'openai' | 'google';
  key: string;
  enabled: boolean;
}

const ConfigPanel: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [newKey, setNewKey] = useState({ service: 'openai' as 'openai' | 'google', key: '' });
  const [settings, setSettings] = useState({
    frameRate: 2,
    skipSimilarFrames: true,
    similarityThreshold: 0.95,
    maxFrames: 1000
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await window.electronAPI.getSettings();
      if (savedSettings.apiKeys) {
        setApiKeys(savedSettings.apiKeys);
      }
      if (savedSettings.processing) {
        setSettings(prev => ({ ...prev, ...savedSettings.processing }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const settingsToSave = {
        apiKeys,
        processing: settings
      };
      await window.electronAPI.saveSettings(settingsToSave);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
  };

  const addApiKey = () => {
    if (!newKey.key.trim()) {
      alert('Please enter an API key');
      return;
    }

    const apiKey: APIKey = {
      id: Date.now().toString(),
      service: newKey.service,
      key: newKey.key.trim(),
      enabled: true
    };

    setApiKeys(prev => [...prev, apiKey]);
    setNewKey({ service: 'openai', key: '' });
  };

  const removeApiKey = (id: string) => {
    setApiKeys(prev => prev.filter(key => key.id !== id));
  };

  const toggleApiKey = (id: string) => {
    setApiKeys(prev => prev.map(key => 
      key.id === id ? { ...key, enabled: !key.enabled } : key
    ));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
  };

  return (
    <div className="config-panel">
      <h3>Configuration</h3>

      {/* API Keys Section */}
      <div className="config-section">
        <h4>API Keys</h4>
        
        <div className="api-keys-list">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="api-key-item">
              <div className="api-key-info">
                <span className="service-badge">{apiKey.service.toUpperCase()}</span>
                <span className="api-key-value">{maskApiKey(apiKey.key)}</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={apiKey.enabled}
                    onChange={() => toggleApiKey(apiKey.id)}
                  />
                  <span className="toggle-slider"></span>
                </label>
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

        <div className="add-api-key">
          <select
            value={newKey.service}
            onChange={(e) => setNewKey(prev => ({ ...prev, service: e.target.value as 'openai' | 'google' }))}
          >
            <option value="openai">OpenAI</option>
            <option value="google">Google Vision</option>
          </select>
          <input
            type="password"
            value={newKey.key}
            onChange={(e) => setNewKey(prev => ({ ...prev, key: e.target.value }))}
            placeholder="Enter API key"
          />
          <button onClick={addApiKey}>Add Key</button>
        </div>
      </div>

      {/* Processing Settings */}
      <div className="config-section">
        <h4>Processing Settings</h4>
        
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

      <div className="config-actions">
        <button className="save-button" onClick={saveSettings}>
          💾 Save Settings
        </button>
      </div>

      <div className="config-info">
        <h4>API Key Information:</h4>
        <ul>
          <li><strong>OpenAI:</strong> Requires GPT-4V API access</li>
          <li><strong>Google Vision:</strong> Requires Google Cloud Vision API key</li>
          <li>API keys are stored securely on your local machine</li>
          <li>Multiple keys enable automatic rotation to avoid rate limits</li>
        </ul>
      </div>
    </div>
  );
};

export default ConfigPanel;
