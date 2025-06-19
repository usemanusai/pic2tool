import Store from 'electron-store';
import { safeStorage } from 'electron';
import * as log from 'electron-log';

export interface APIKeyConfig {
  id: string;
  service: 'openai' | 'google';
  key: string;
  enabled: boolean;
  name?: string;
}

export interface ProcessingSettings {
  frameRate: number;
  skipSimilarFrames: boolean;
  similarityThreshold: number;
  maxFrames: number;
  outputQuality: 'low' | 'medium' | 'high';
}

export interface AppSettings {
  apiKeys: APIKeyConfig[];
  processing: ProcessingSettings;
  ui: {
    theme: 'light' | 'dark';
    autoSave: boolean;
    showTips: boolean;
  };
  paths: {
    defaultProjectPath: string;
    defaultOutputPath: string;
  };
}

const defaultSettings: AppSettings = {
  apiKeys: [],
  processing: {
    frameRate: 2,
    skipSimilarFrames: true,
    similarityThreshold: 0.95,
    maxFrames: 1000,
    outputQuality: 'medium'
  },
  ui: {
    theme: 'light',
    autoSave: true,
    showTips: true
  },
  paths: {
    defaultProjectPath: '',
    defaultOutputPath: ''
  }
};

export class SettingsManager {
  private store: Store<AppSettings>;
  private encryptionAvailable: boolean;

  constructor() {
    this.store = new Store<AppSettings>({
      defaults: defaultSettings,
      name: 'app-settings'
    });

    this.encryptionAvailable = safeStorage.isEncryptionAvailable();
    if (!this.encryptionAvailable) {
      log.warn('Encryption not available, API keys will be stored in plain text');
    }
  }

  public getSettings(): AppSettings {
    try {
      const settings = this.store.store;
      
      // Decrypt API keys if encryption is available
      if (this.encryptionAvailable && settings.apiKeys) {
        settings.apiKeys = settings.apiKeys.map(keyConfig => ({
          ...keyConfig,
          key: this.decryptApiKey(keyConfig.key)
        }));
      }

      return settings;
    } catch (error) {
      log.error('Error loading settings:', error);
      return defaultSettings;
    }
  }

  public saveSettings(settings: AppSettings): void {
    try {
      // Encrypt API keys if encryption is available
      const settingsToSave = { ...settings };
      if (this.encryptionAvailable && settingsToSave.apiKeys) {
        settingsToSave.apiKeys = settingsToSave.apiKeys.map(keyConfig => ({
          ...keyConfig,
          key: this.encryptApiKey(keyConfig.key)
        }));
      }

      this.store.store = settingsToSave;
      log.info('Settings saved successfully');
    } catch (error) {
      log.error('Error saving settings:', error);
      throw error;
    }
  }

  public addApiKey(service: 'openai' | 'google', key: string, name?: string): string {
    try {
      const settings = this.getSettings();
      const id = Date.now().toString();
      
      const newApiKey: APIKeyConfig = {
        id,
        service,
        key,
        enabled: true,
        name: name || `${service.toUpperCase()} Key`
      };

      settings.apiKeys.push(newApiKey);
      this.saveSettings(settings);
      
      return id;
    } catch (error) {
      log.error('Error adding API key:', error);
      throw error;
    }
  }

  public removeApiKey(id: string): void {
    try {
      const settings = this.getSettings();
      settings.apiKeys = settings.apiKeys.filter(key => key.id !== id);
      this.saveSettings(settings);
    } catch (error) {
      log.error('Error removing API key:', error);
      throw error;
    }
  }

  public updateApiKey(id: string, updates: Partial<APIKeyConfig>): void {
    try {
      const settings = this.getSettings();
      const keyIndex = settings.apiKeys.findIndex(key => key.id === id);
      
      if (keyIndex === -1) {
        throw new Error(`API key with id ${id} not found`);
      }

      settings.apiKeys[keyIndex] = { ...settings.apiKeys[keyIndex], ...updates };
      this.saveSettings(settings);
    } catch (error) {
      log.error('Error updating API key:', error);
      throw error;
    }
  }

  public getEnabledApiKeys(): APIKeyConfig[] {
    const settings = this.getSettings();
    return settings.apiKeys.filter(key => key.enabled && key.key.trim() !== '');
  }

  public updateProcessingSettings(updates: Partial<ProcessingSettings>): void {
    try {
      const settings = this.getSettings();
      settings.processing = { ...settings.processing, ...updates };
      this.saveSettings(settings);
    } catch (error) {
      log.error('Error updating processing settings:', error);
      throw error;
    }
  }

  public updateUISettings(updates: Partial<AppSettings['ui']>): void {
    try {
      const settings = this.getSettings();
      settings.ui = { ...settings.ui, ...updates };
      this.saveSettings(settings);
    } catch (error) {
      log.error('Error updating UI settings:', error);
      throw error;
    }
  }

  public updatePaths(updates: Partial<AppSettings['paths']>): void {
    try {
      const settings = this.getSettings();
      settings.paths = { ...settings.paths, ...updates };
      this.saveSettings(settings);
    } catch (error) {
      log.error('Error updating paths:', error);
      throw error;
    }
  }

  public resetToDefaults(): void {
    try {
      this.store.clear();
      log.info('Settings reset to defaults');
    } catch (error) {
      log.error('Error resetting settings:', error);
      throw error;
    }
  }

  public exportSettings(): string {
    try {
      const settings = this.getSettings();
      // Remove sensitive data for export
      const exportData = {
        ...settings,
        apiKeys: settings.apiKeys.map(key => ({
          ...key,
          key: '***REDACTED***'
        }))
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      log.error('Error exporting settings:', error);
      throw error;
    }
  }

  public importSettings(settingsJson: string): void {
    try {
      const importedSettings = JSON.parse(settingsJson);
      
      // Validate the imported settings structure
      if (!this.validateSettings(importedSettings)) {
        throw new Error('Invalid settings format');
      }

      // Don't import API keys for security
      const currentSettings = this.getSettings();
      const newSettings = {
        ...importedSettings,
        apiKeys: currentSettings.apiKeys
      };

      this.saveSettings(newSettings);
      log.info('Settings imported successfully');
    } catch (error) {
      log.error('Error importing settings:', error);
      throw error;
    }
  }

  private encryptApiKey(key: string): string {
    if (!this.encryptionAvailable) return key;
    
    try {
      const encrypted = safeStorage.encryptString(key);
      return encrypted.toString('base64');
    } catch (error) {
      log.error('Error encrypting API key:', error);
      return key;
    }
  }

  private decryptApiKey(encryptedKey: string): string {
    if (!this.encryptionAvailable) return encryptedKey;
    
    try {
      const buffer = Buffer.from(encryptedKey, 'base64');
      return safeStorage.decryptString(buffer);
    } catch (error) {
      log.error('Error decrypting API key:', error);
      return encryptedKey;
    }
  }

  private validateSettings(settings: any): boolean {
    try {
      return (
        typeof settings === 'object' &&
        typeof settings.processing === 'object' &&
        typeof settings.ui === 'object' &&
        typeof settings.paths === 'object' &&
        Array.isArray(settings.apiKeys)
      );
    } catch {
      return false;
    }
  }
}
