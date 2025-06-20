/**
 * Model Management Service
 * Handles dynamic AI model support, validation, and discovery
 */

import axios from 'axios';
import { VisionProvider, ModelConfiguration } from './ComprehensiveVisionProviders';
import { SettingsManager } from '../shared/SettingsManager';
import { ErrorHandler } from '../shared/ErrorHandler';

export interface ModelValidationResult {
  isValid: boolean;
  modelName: string;
  providerId: string;
  error?: string;
  performance?: {
    qualityScore: number;
    avgResponseTime: number;
    costPerRequest?: number;
  };
  lastValidated: Date;
}

export interface ModelDiscoveryResult {
  providerId: string;
  availableModels: string[];
  lastUpdated: Date;
  error?: string;
}

export class ModelManagementService {
  private settingsManager: SettingsManager;
  private modelConfigurations: Map<string, ModelConfiguration[]>;
  private validationCache: Map<string, ModelValidationResult>;
  private discoveryCache: Map<string, ModelDiscoveryResult>;

  constructor() {
    this.settingsManager = new SettingsManager();
    this.modelConfigurations = new Map();
    this.validationCache = new Map();
    this.discoveryCache = new Map();
    this.loadModelConfigurations();
  }

  /**
   * Validate a custom model for a specific provider
   */
  async validateModel(
    providerId: string,
    modelName: string,
    apiKey?: string
  ): Promise<ModelValidationResult> {
    const cacheKey = `${providerId}:${modelName}`;

    // Check cache first (valid for 1 hour)
    const cached = this.validationCache.get(cacheKey);
    if (cached && Date.now() - cached.lastValidated.getTime() < 3600000) {
      return cached;
    }

    try {
      const result = await this.performModelValidation(providerId, modelName, apiKey);
      this.validationCache.set(cacheKey, result);
      return result;
    } catch (error) {
      const errorResult: ModelValidationResult = {
        isValid: false,
        modelName,
        providerId,
        error: error instanceof Error ? error.message : 'Unknown validation error',
        lastValidated: new Date(),
      };
      this.validationCache.set(cacheKey, errorResult);
      return errorResult;
    }
  }

  /**
   * Discover available models for a provider
   */
  async discoverModels(providerId: string, apiKey?: string): Promise<ModelDiscoveryResult> {
    // Check cache first (valid for 24 hours)
    const cached = this.discoveryCache.get(providerId);
    if (cached && Date.now() - cached.lastUpdated.getTime() < 86400000) {
      return cached;
    }

    try {
      const result = await this.performModelDiscovery(providerId, apiKey);
      this.discoveryCache.set(providerId, result);
      return result;
    } catch (error) {
      const errorResult: ModelDiscoveryResult = {
        providerId,
        availableModels: [],
        lastUpdated: new Date(),
        error: error instanceof Error ? error.message : 'Unknown discovery error',
      };
      this.discoveryCache.set(providerId, errorResult);
      return errorResult;
    }
  }

  /**
   * Add a custom model configuration
   */
  async addCustomModel(
    providerId: string,
    modelName: string,
    displayName: string,
    apiKey?: string
  ): Promise<ModelConfiguration> {
    // Validate the model first
    const validation = await this.validateModel(providerId, modelName, apiKey);

    const config: ModelConfiguration = {
      providerId,
      modelName,
      displayName,
      isCustom: true,
      isValidated: validation.isValid,
      lastValidated: validation.lastValidated,
      validationError: validation.error,
      performance: validation.performance,
    };

    // Store the configuration
    const providerConfigs = this.modelConfigurations.get(providerId) || [];
    providerConfigs.push(config);
    this.modelConfigurations.set(providerId, providerConfigs);

    // Save to persistent storage
    await this.saveModelConfigurations();

    return config;
  }

  /**
   * Get all model configurations for a provider
   */
  getModelConfigurations(providerId: string): ModelConfiguration[] {
    return this.modelConfigurations.get(providerId) || [];
  }

  /**
   * Remove a custom model configuration
   */
  async removeCustomModel(providerId: string, modelName: string): Promise<boolean> {
    const providerConfigs = this.modelConfigurations.get(providerId) || [];
    const filteredConfigs = providerConfigs.filter(
      (config) => !(config.modelName === modelName && config.isCustom)
    );

    if (filteredConfigs.length !== providerConfigs.length) {
      this.modelConfigurations.set(providerId, filteredConfigs);
      await this.saveModelConfigurations();
      return true;
    }

    return false;
  }

  /**
   * Get intelligent fallback models for a provider
   */
  getFallbackModels(providerId: string, originalModel: string): string[] {
    const configs = this.getModelConfigurations(providerId);
    const validConfigs = configs.filter(
      (config) => config.isValidated && config.modelName !== originalModel
    );

    // Sort by performance score if available
    validConfigs.sort((a, b) => {
      const scoreA = a.performance?.qualityScore || 0;
      const scoreB = b.performance?.qualityScore || 0;
      return scoreB - scoreA;
    });

    return validConfigs.map((config) => config.modelName);
  }

  /**
   * Perform actual model validation based on provider
   */
  private async performModelValidation(
    providerId: string,
    modelName: string,
    apiKey?: string
  ): Promise<ModelValidationResult> {
    const startTime = Date.now();

    switch (providerId) {
      case 'openrouter_qwen_free':
        return await this.validateOpenRouterModel(modelName, apiKey);
      case 'openai_gpt4o':
        return await this.validateOpenAIModel(modelName, apiKey);
      default:
        throw new Error(`Model validation not implemented for provider: ${providerId}`);
    }
  }

  /**
   * Perform model discovery based on provider
   */
  private async performModelDiscovery(
    providerId: string,
    apiKey?: string
  ): Promise<ModelDiscoveryResult> {
    switch (providerId) {
      case 'openrouter_qwen_free':
        return await this.discoverOpenRouterModels(apiKey);
      case 'openai_gpt4o':
        return await this.discoverOpenAIModels(apiKey);
      default:
        throw new Error(`Model discovery not implemented for provider: ${providerId}`);
    }
  }

  /**
   * Validate OpenRouter model
   */
  private async validateOpenRouterModel(
    modelName: string,
    apiKey?: string
  ): Promise<ModelValidationResult> {
    try {
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        timeout: 10000,
      });

      const models = response.data.data || [];
      const modelExists = models.some((model: any) => model.id === modelName);

      return {
        isValid: modelExists,
        modelName,
        providerId: 'openrouter_qwen_free',
        error: modelExists ? undefined : 'Model not found in OpenRouter catalog',
        lastValidated: new Date(),
      };
    } catch (error) {
      throw new Error(
        `OpenRouter validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate OpenAI model
   */
  private async validateOpenAIModel(
    modelName: string,
    apiKey?: string
  ): Promise<ModelValidationResult> {
    if (!apiKey) {
      throw new Error('API key required for OpenAI model validation');
    }

    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000,
      });

      const models = response.data.data || [];
      const modelExists = models.some((model: any) => model.id === modelName);

      return {
        isValid: modelExists,
        modelName,
        providerId: 'openai_gpt4o',
        error: modelExists ? undefined : 'Model not found in OpenAI catalog',
        lastValidated: new Date(),
      };
    } catch (error) {
      throw new Error(
        `OpenAI validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Discover OpenRouter models
   */
  private async discoverOpenRouterModels(apiKey?: string): Promise<ModelDiscoveryResult> {
    try {
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        timeout: 15000,
      });

      const models = response.data.data || [];
      const visionModels = models
        .filter(
          (model: any) =>
            model.id.includes('vision') ||
            model.id.includes('llava') ||
            model.id.includes('qwen') ||
            model.id.includes('claude') ||
            model.id.includes('gemini')
        )
        .map((model: any) => model.id);

      return {
        providerId: 'openrouter_qwen_free',
        availableModels: visionModels,
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new Error(
        `OpenRouter discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Discover OpenAI models
   */
  private async discoverOpenAIModels(apiKey?: string): Promise<ModelDiscoveryResult> {
    if (!apiKey) {
      throw new Error('API key required for OpenAI model discovery');
    }

    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 15000,
      });

      const models = response.data.data || [];
      const visionModels = models
        .filter(
          (model: any) =>
            model.id.includes('gpt-4') &&
            (model.id.includes('vision') ||
              model.id.includes('turbo') ||
              model.id === 'gpt-4o' ||
              model.id === 'gpt-4o-mini')
        )
        .map((model: any) => model.id);

      return {
        providerId: 'openai_gpt4o',
        availableModels: visionModels,
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new Error(
        `OpenAI discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Load model configurations from storage
   */
  private loadModelConfigurations(): void {
    try {
      const settings = this.settingsManager.getSettings();
      const modelConfigs = (settings as any).modelConfigurations || {};

      for (const [providerId, configs] of Object.entries(modelConfigs)) {
        this.modelConfigurations.set(providerId, configs as ModelConfiguration[]);
      }
    } catch (error) {
      ErrorHandler.logError('Failed to load model configurations', error);
    }
  }

  /**
   * Save model configurations to storage
   */
  private async saveModelConfigurations(): Promise<void> {
    try {
      const settings = this.settingsManager.getSettings();
      const modelConfigs: Record<string, ModelConfiguration[]> = {};

      for (const [providerId, configs] of this.modelConfigurations.entries()) {
        modelConfigs[providerId] = configs;
      }

      (settings as any).modelConfigurations = modelConfigs;
      this.settingsManager.saveSettings(settings);
    } catch (error) {
      ErrorHandler.logError('Failed to save model configurations', error);
      throw error;
    }
  }
}
