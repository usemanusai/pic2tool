import React, { useState, useEffect } from 'react';
import { VisionProvider, ModelConfiguration } from '../../modules/ComprehensiveVisionProviders';
import { ModelValidationResult, ModelDiscoveryResult } from '../../modules/ModelManagementService';

interface ModelConfigurationPanelProps {
  provider: VisionProvider;
  onModelChange: (providerId: string, modelName: string) => void;
  onClose?: () => void;
}

const ModelConfigurationPanel: React.FC<ModelConfigurationPanelProps> = ({
  provider,
  onModelChange,
  onClose,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(provider.defaultModel || '');
  const [customModel, setCustomModel] = useState<string>('');
  const [modelConfigurations, setModelConfigurations] = useState<ModelConfiguration[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>(provider.supportedModels || []);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ModelValidationResult | null>(null);
  const [discoveryResult, setDiscoveryResult] = useState<ModelDiscoveryResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  useEffect(() => {
    loadModelConfigurations();
    if (provider.customModelSupport) {
      discoverModels();
    }
  }, [provider.id]);

  const loadModelConfigurations = async () => {
    try {
      const configs = await window.electronAPI.getModelConfigurations(provider.id);
      setModelConfigurations(configs);
    } catch (error) {
      console.error('Failed to load model configurations:', error);
    }
  };

  const discoverModels = async () => {
    if (!provider.modelValidationEndpoint) return;

    setIsDiscovering(true);
    try {
      const result = await window.electronAPI.discoverModels(provider.id);
      setDiscoveryResult(result);
      if (result.availableModels.length > 0) {
        setAvailableModels([...(provider.supportedModels || []), ...result.availableModels]);
      }
    } catch (error) {
      console.error('Failed to discover models:', error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const validateCustomModel = async () => {
    if (!customModel.trim()) return;

    setIsValidating(true);
    try {
      const result = await window.electronAPI.validateModel(provider.id, customModel.trim());
      setValidationResult(result);

      if (result.isValid) {
        // Add to custom models
        await window.electronAPI.addCustomModel(
          provider.id,
          customModel.trim(),
          `Custom: ${customModel.trim()}`
        );
        await loadModelConfigurations();
        setCustomModel('');
      }
    } catch (error) {
      console.error('Failed to validate model:', error);
      setValidationResult({
        isValid: false,
        modelName: customModel.trim(),
        providerId: provider.id,
        error: 'Validation failed',
        lastValidated: new Date(),
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleModelSelect = (modelName: string) => {
    setSelectedModel(modelName);
    onModelChange(provider.id, modelName);
  };

  const removeCustomModel = async (modelName: string) => {
    try {
      await window.electronAPI.removeCustomModel(provider.id, modelName);
      await loadModelConfigurations();
    } catch (error) {
      console.error('Failed to remove custom model:', error);
    }
  };

  const getModelDisplayName = (modelName: string): string => {
    const config = modelConfigurations.find((c) => c.modelName === modelName);
    return config?.displayName || modelName;
  };

  const getModelStatus = (modelName: string): 'valid' | 'invalid' | 'unknown' => {
    const config = modelConfigurations.find((c) => c.modelName === modelName);
    if (!config) return 'unknown';
    return config.isValidated ? 'valid' : 'invalid';
  };

  return (
    <div className="model-configuration-panel">
      <div className="panel-header">
        <h3>🤖 Model Configuration: {provider.name}</h3>
        {onClose && (
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className="model-selection-section">
        <h4>Available Models</h4>
        <div className="model-list">
          {availableModels.map((modelName) => (
            <div
              key={modelName}
              className={`model-item ${selectedModel === modelName ? 'selected' : ''}`}
              onClick={() => handleModelSelect(modelName)}
            >
              <div className="model-info">
                <span className="model-name">{getModelDisplayName(modelName)}</span>
                <span className={`model-status ${getModelStatus(modelName)}`}>
                  {getModelStatus(modelName) === 'valid'
                    ? '✅'
                    : getModelStatus(modelName) === 'invalid'
                      ? '❌'
                      : '❓'}
                </span>
              </div>
              {modelName === provider.defaultModel && (
                <span className="default-badge">Default</span>
              )}
            </div>
          ))}
        </div>

        {isDiscovering && (
          <div className="discovery-status">
            <span className="loading-spinner">🔄</span>
            Discovering available models...
          </div>
        )}

        {discoveryResult?.error && (
          <div className="error-message">Failed to discover models: {discoveryResult.error}</div>
        )}
      </div>

      {provider.customModelSupport && (
        <div className="custom-model-section">
          <h4>Add Custom Model</h4>
          <div className="custom-model-input">
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="Enter custom model name (e.g., anthropic/claude-3.5-sonnet)"
              className="model-input"
            />
            <button
              onClick={validateCustomModel}
              disabled={!customModel.trim() || isValidating}
              className="validate-button"
            >
              {isValidating ? '🔄 Validating...' : '✅ Add & Validate'}
            </button>
          </div>

          {validationResult && (
            <div className={`validation-result ${validationResult.isValid ? 'success' : 'error'}`}>
              {validationResult.isValid ? (
                <span>✅ Model "{validationResult.modelName}" is valid and has been added!</span>
              ) : (
                <span>
                  ❌ Model "{validationResult.modelName}" validation failed:{' '}
                  {validationResult.error}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {modelConfigurations.filter((c) => c.isCustom).length > 0 && (
        <div className="custom-models-section">
          <h4>Custom Models</h4>
          <div className="custom-models-list">
            {modelConfigurations
              .filter((config) => config.isCustom)
              .map((config) => (
                <div key={config.modelName} className="custom-model-item">
                  <div className="model-info">
                    <span className="model-name">{config.displayName}</span>
                    <span
                      className={`validation-status ${config.isValidated ? 'valid' : 'invalid'}`}
                    >
                      {config.isValidated ? '✅ Valid' : '❌ Invalid'}
                    </span>
                    {config.performance && (
                      <span className="performance-info">
                        Quality: {config.performance.qualityScore}/10
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeCustomModel(config.modelName)}
                    className="remove-button"
                    title="Remove custom model"
                  >
                    🗑️
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="advanced-section">
        <button className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? '▼' : '▶'} Advanced Options
        </button>

        {showAdvanced && (
          <div className="advanced-options">
            <div className="option-group">
              <h5>Model Performance</h5>
              {selectedModel && (
                <div className="performance-metrics">
                  {modelConfigurations
                    .filter((c) => c.modelName === selectedModel)
                    .map((config) => (
                      <div key={config.modelName} className="metrics">
                        <div>Quality Score: {config.performance?.qualityScore || 'Unknown'}/10</div>
                        <div>
                          Avg Response Time: {config.performance?.avgResponseTime || 'Unknown'}ms
                        </div>
                        {config.performance?.costPerRequest && (
                          <div>Cost per Request: ${config.performance.costPerRequest}</div>
                        )}
                        <div>
                          Last Validated: {config.lastValidated?.toLocaleString() || 'Never'}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="option-group">
              <h5>Fallback Models</h5>
              <p>If the selected model fails, these models will be tried in order:</p>
              <div className="fallback-list">
                {availableModels
                  .filter((model) => model !== selectedModel)
                  .slice(0, 3)
                  .map((model, index) => (
                    <div key={model} className="fallback-item">
                      {index + 1}. {getModelDisplayName(model)}
                    </div>
                  ))}
              </div>
            </div>

            <div className="option-group">
              <h5>Actions</h5>
              <button onClick={discoverModels} disabled={isDiscovering} className="action-button">
                {isDiscovering ? '🔄 Discovering...' : '🔍 Refresh Available Models'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="panel-footer">
        <div className="selected-model-info">
          <strong>Selected Model:</strong> {getModelDisplayName(selectedModel)}
        </div>
      </div>
    </div>
  );
};

export default ModelConfigurationPanel;
