/**
 * API Key Pool Manager
 * Manages multiple API keys with rotation, rate limiting, and fallback mechanisms
 */

import { SettingsManager } from '../shared/SettingsManager';
import { ErrorHandler } from '../shared/ErrorHandler';

export interface APIKey {
  id: string;
  provider: 'openai' | 'google' | 'azure' | 'aws' | 'huggingface' | 'ollama';
  key: string;
  name?: string;
  isActive: boolean;
  rateLimitedUntil?: Date;
  usageCount: number;
  dailyLimit: number;
  lastUsed?: Date;
  createdAt: Date;
  metadata?: {
    tier: 'free' | 'trial' | 'paid';
    expiresAt?: Date;
    region?: string;
  };
}

export interface APIKeyPool {
  openai: APIKey[];
  google: APIKey[];
  azure: APIKey[];
  aws: APIKey[];
  huggingface: APIKey[];
  ollama: APIKey[];
}

export interface UsageStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  rateLimitHits: number;
  lastReset: Date;
}

export class APIKeyPoolManager {
  private settingsManager: SettingsManager;
  private keyPools: APIKeyPool;
  private usageStats: Map<string, UsageStats>;
  private currentKeyIndex: Map<string, number>;
  private retryDelays: Map<string, number>;

  constructor() {
    this.settingsManager = new SettingsManager();
    this.keyPools = {
      openai: [],
      google: [],
      azure: [],
      aws: [],
      huggingface: [],
      ollama: []
    };
    this.usageStats = new Map();
    this.currentKeyIndex = new Map();
    this.retryDelays = new Map();
    
    this.loadKeyPools();
    this.initializeUsageTracking();
  }

  /**
   * Add a new API key to the pool
   */
  async addAPIKey(provider: APIKey['provider'], key: string, options?: {
    name?: string;
    tier?: 'free' | 'trial' | 'paid';
    dailyLimit?: number;
    expiresAt?: Date;
    region?: string;
  }): Promise<string> {
    const keyId = this.generateKeyId();
    const apiKey: APIKey = {
      id: keyId,
      provider,
      key,
      name: options?.name || `${provider}-${keyId.slice(-4)}`,
      isActive: true,
      usageCount: 0,
      dailyLimit: options?.dailyLimit || this.getDefaultDailyLimit(provider, options?.tier || 'free'),
      createdAt: new Date(),
      metadata: {
        tier: options?.tier || 'free',
        expiresAt: options?.expiresAt,
        region: options?.region
      }
    };

    this.keyPools[provider].push(apiKey);
    await this.saveKeyPools();
    
    // Initialize usage stats
    this.usageStats.set(keyId, {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rateLimitHits: 0,
      lastReset: new Date()
    });

    return keyId;
  }

  /**
   * Get the next available API key for a provider
   */
  getNextAvailableKey(provider: APIKey['provider']): APIKey | null {
    const keys = this.keyPools[provider].filter(key => 
      key.isActive && 
      !this.isRateLimited(key) && 
      !this.isExpired(key) &&
      !this.isDailyLimitExceeded(key)
    );

    if (keys.length === 0) {
      return null;
    }

    // Round-robin selection
    const currentIndex = this.currentKeyIndex.get(provider) || 0;
    const selectedKey = keys[currentIndex % keys.length];
    this.currentKeyIndex.set(provider, (currentIndex + 1) % keys.length);

    return selectedKey;
  }

  /**
   * Mark a key as rate limited
   */
  markKeyAsRateLimited(keyId: string, retryAfterSeconds: number = 3600): void {
    const key = this.findKeyById(keyId);
    if (key) {
      key.rateLimitedUntil = new Date(Date.now() + retryAfterSeconds * 1000);
      this.updateUsageStats(keyId, 'rateLimitHit');
      this.saveKeyPools();
    }
  }

  /**
   * Mark a key as used
   */
  markKeyAsUsed(keyId: string, success: boolean = true): void {
    const key = this.findKeyById(keyId);
    if (key) {
      key.usageCount++;
      key.lastUsed = new Date();
      this.updateUsageStats(keyId, success ? 'success' : 'failure');
      this.saveKeyPools();
    }
  }

  /**
   * Get all keys for a provider with their status
   */
  getKeysStatus(provider: APIKey['provider']): Array<{
    id: string;
    name: string;
    isActive: boolean;
    isRateLimited: boolean;
    isExpired: boolean;
    isDailyLimitExceeded: boolean;
    usageCount: number;
    dailyLimit: number;
    tier: string;
  }> {
    return this.keyPools[provider].map(key => ({
      id: key.id,
      name: key.name || key.id,
      isActive: key.isActive,
      isRateLimited: this.isRateLimited(key),
      isExpired: this.isExpired(key),
      isDailyLimitExceeded: this.isDailyLimitExceeded(key),
      usageCount: key.usageCount,
      dailyLimit: key.dailyLimit,
      tier: key.metadata?.tier || 'unknown'
    }));
  }

  /**
   * Remove an API key
   */
  async removeAPIKey(keyId: string): Promise<boolean> {
    for (const provider in this.keyPools) {
      const keys = this.keyPools[provider as keyof APIKeyPool];
      const index = keys.findIndex(key => key.id === keyId);
      if (index !== -1) {
        keys.splice(index, 1);
        this.usageStats.delete(keyId);
        await this.saveKeyPools();
        return true;
      }
    }
    return false;
  }

  /**
   * Get usage statistics for all keys
   */
  getUsageStatistics(): Map<string, UsageStats> {
    return new Map(this.usageStats);
  }

  /**
   * Reset daily usage counters
   */
  resetDailyUsage(): void {
    for (const provider in this.keyPools) {
      this.keyPools[provider as keyof APIKeyPool].forEach(key => {
        key.usageCount = 0;
      });
    }
    
    this.usageStats.forEach(stats => {
      stats.lastReset = new Date();
    });
    
    this.saveKeyPools();
  }

  // Private helper methods
  private generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultDailyLimit(provider: APIKey['provider'], tier: string): number {
    const limits = {
      openai: { free: 100, trial: 1000, paid: 10000 },
      google: { free: 1000, trial: 5000, paid: 50000 },
      azure: { free: 5000, trial: 20000, paid: 100000 },
      aws: { free: 1000, trial: 5000, paid: 50000 },
      huggingface: { free: 1000, trial: 10000, paid: 100000 },
      ollama: { free: Infinity, trial: Infinity, paid: Infinity }
    };
    
    return limits[provider]?.[tier as keyof typeof limits.openai] || 100;
  }

  private isRateLimited(key: APIKey): boolean {
    return key.rateLimitedUntil ? new Date() < key.rateLimitedUntil : false;
  }

  private isExpired(key: APIKey): boolean {
    return key.metadata?.expiresAt ? new Date() > key.metadata.expiresAt : false;
  }

  private isDailyLimitExceeded(key: APIKey): boolean {
    return key.usageCount >= key.dailyLimit;
  }

  private findKeyById(keyId: string): APIKey | null {
    for (const provider in this.keyPools) {
      const key = this.keyPools[provider as keyof APIKeyPool].find(k => k.id === keyId);
      if (key) return key;
    }
    return null;
  }

  private updateUsageStats(keyId: string, type: 'success' | 'failure' | 'rateLimitHit'): void {
    const stats = this.usageStats.get(keyId);
    if (stats) {
      stats.totalCalls++;
      if (type === 'success') stats.successfulCalls++;
      if (type === 'failure') stats.failedCalls++;
      if (type === 'rateLimitHit') stats.rateLimitHits++;
    }
  }

  private async loadKeyPools(): Promise<void> {
    try {
      const savedPools = await this.settingsManager.get('apiKeyPools');
      if (savedPools) {
        this.keyPools = savedPools;
      }
    } catch (error) {
      ErrorHandler.logError('Failed to load API key pools', error);
    }
  }

  private async saveKeyPools(): Promise<void> {
    try {
      await this.settingsManager.set('apiKeyPools', this.keyPools);
    } catch (error) {
      ErrorHandler.logError('Failed to save API key pools', error);
    }
  }

  private initializeUsageTracking(): void {
    // Initialize usage stats for existing keys
    for (const provider in this.keyPools) {
      this.keyPools[provider as keyof APIKeyPool].forEach(key => {
        if (!this.usageStats.has(key.id)) {
          this.usageStats.set(key.id, {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            rateLimitHits: 0,
            lastReset: new Date()
          });
        }
      });
    }

    // Reset daily usage at midnight
    this.scheduleDailyReset();
  }

  private scheduleDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyUsage();
      // Schedule next reset
      setInterval(() => this.resetDailyUsage(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }
}
