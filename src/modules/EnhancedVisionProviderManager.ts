/**
 * Enhanced Vision Provider Manager (2025 Edition)
 * Manages comprehensive ecosystem of vision providers with intelligent routing
 */

import { VisionProvider, COMPREHENSIVE_VISION_PROVIDERS } from './ComprehensiveVisionProviders';
import { SettingsManager } from '../shared/SettingsManager';
import { ErrorHandler } from '../shared/ErrorHandler';
import axios from 'axios';

export interface ProviderPreferences {
  mode: 'free_only' | 'hybrid' | 'premium_preferred';
  maxMonthlyBudget: number; // USD
  qualityThreshold: number; // 1-10
  speedThreshold: number; // max acceptable response time in ms
  preferredRegions: string[];
  blacklistedProviders: string[];
  whitelistedProviders: string[];
  enableSpecialized: boolean;
}

export interface UsageTracking {
  providerId: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  totalCost: number;
  lastUsed: Date;
  avgResponseTime: number;
  qualityRating: number;
}

export interface BudgetControl {
  monthlyBudget: number;
  currentSpend: number;
  remainingBudget: number;
  costPerRequest: Record<string, number>;
  projectedMonthlySpend: number;
}

export class EnhancedVisionProviderManager {
  private settingsManager: SettingsManager;
  private providers: Map<string, VisionProvider>;
  private preferences: ProviderPreferences;
  private usageTracking: Map<string, UsageTracking>;
  private budgetControl: BudgetControl;
  private currentProviderIndex: Map<string, number>;

  constructor() {
    this.settingsManager = new SettingsManager();
    this.providers = new Map();
    this.usageTracking = new Map();
    this.currentProviderIndex = new Map();
    
    this.preferences = {
      mode: 'free_only',
      maxMonthlyBudget: 0,
      qualityThreshold: 7.0,
      speedThreshold: 5000,
      preferredRegions: ['global'],
      blacklistedProviders: [],
      whitelistedProviders: [],
      enableSpecialized: true
    };

    this.budgetControl = {
      monthlyBudget: 0,
      currentSpend: 0,
      remainingBudget: 0,
      costPerRequest: {},
      projectedMonthlySpend: 0
    };

    this.initializeProviders();
    this.loadSettings();
  }

  /**
   * Initialize all providers from configuration
   */
  private initializeProviders(): void {
    COMPREHENSIVE_VISION_PROVIDERS.forEach(provider => {
      this.providers.set(provider.id, provider);
      
      // Initialize usage tracking
      this.usageTracking.set(provider.id, {
        providerId: provider.id,
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        totalCost: 0,
        lastUsed: new Date(),
        avgResponseTime: provider.avgResponseTime,
        qualityRating: provider.qualityScore
      });
    });
  }

  /**
   * Get optimal provider for a request based on preferences and constraints
   */
  public getOptimalProvider(imageSize: number, format: string, useCase?: string): VisionProvider | null {
    const eligibleProviders = this.getEligibleProviders(imageSize, format, useCase);
    
    if (eligibleProviders.length === 0) {
      return null;
    }

    // Sort by preference and quality
    const sortedProviders = this.sortProvidersByPreference(eligibleProviders);
    
    // Apply intelligent selection based on mode
    switch (this.preferences.mode) {
      case 'free_only':
        return this.selectFreeProvider(sortedProviders);
      case 'hybrid':
        return this.selectHybridProvider(sortedProviders);
      case 'premium_preferred':
        return this.selectPremiumProvider(sortedProviders);
      default:
        return sortedProviders[0];
    }
  }

  /**
   * Get providers eligible for the request
   */
  private getEligibleProviders(imageSize: number, format: string, useCase?: string): VisionProvider[] {
    return Array.from(this.providers.values()).filter(provider => {
      // Basic eligibility checks
      if (!provider.isAvailable) return false;
      if (provider.maxImageSize < imageSize) return false;
      if (!provider.supportedFormats.includes(format.toLowerCase())) return false;
      
      // Preference filters
      if (this.preferences.blacklistedProviders.includes(provider.id)) return false;
      if (this.preferences.whitelistedProviders.length > 0 && 
          !this.preferences.whitelistedProviders.includes(provider.id)) return false;
      if (!this.preferences.preferredRegions.includes(provider.region)) return false;
      
      // Quality threshold
      if (provider.qualityScore < this.preferences.qualityThreshold) return false;
      
      // Speed threshold
      if (provider.avgResponseTime > this.preferences.speedThreshold) return false;
      
      // Budget constraints for paid providers
      if (provider.costPerRequest && provider.costPerRequest > 0) {
        if (this.preferences.mode === 'free_only') return false;
        if (this.budgetControl.remainingBudget < provider.costPerRequest) return false;
      }
      
      // Use case specific filtering
      if (useCase) {
        switch (useCase) {
          case 'ocr':
            return provider.supportsOCR;
          case 'document':
            return provider.supportsDocumentAnalysis;
          case 'ui':
            return provider.supportsUIAnalysis;
          case 'scene':
            return provider.supportsSceneAnalysis;
          case 'object':
            return provider.supportsObjectDetection;
        }
      }
      
      return true;
    });
  }

  /**
   * Sort providers by preference and quality
   */
  private sortProvidersByPreference(providers: VisionProvider[]): VisionProvider[] {
    return providers.sort((a, b) => {
      // Priority 1: Free providers first (if in free_only or hybrid mode)
      if (this.preferences.mode !== 'premium_preferred') {
        const aIsFree = !a.costPerRequest || a.costPerRequest === 0;
        const bIsFree = !b.costPerRequest || b.costPerRequest === 0;
        if (aIsFree && !bIsFree) return -1;
        if (!aIsFree && bIsFree) return 1;
      }
      
      // Priority 2: Quality score
      const qualityDiff = b.qualityScore - a.qualityScore;
      if (Math.abs(qualityDiff) > 0.5) return qualityDiff;
      
      // Priority 3: Speed (lower response time is better)
      const speedDiff = a.avgResponseTime - b.avgResponseTime;
      if (Math.abs(speedDiff) > 500) return speedDiff;
      
      // Priority 4: Success rate from usage tracking
      const aUsage = this.usageTracking.get(a.id);
      const bUsage = this.usageTracking.get(b.id);
      if (aUsage && bUsage) {
        const aSuccessRate = aUsage.requestCount > 0 ? aUsage.successCount / aUsage.requestCount : 0.5;
        const bSuccessRate = bUsage.requestCount > 0 ? bUsage.successCount / bUsage.requestCount : 0.5;
        return bSuccessRate - aSuccessRate;
      }
      
      return 0;
    });
  }

  /**
   * Select provider for free-only mode
   */
  private selectFreeProvider(providers: VisionProvider[]): VisionProvider | null {
    const freeProviders = providers.filter(p => !p.costPerRequest || p.costPerRequest === 0);
    return freeProviders.length > 0 ? freeProviders[0] : null;
  }

  /**
   * Select provider for hybrid mode
   */
  private selectHybridProvider(providers: VisionProvider[]): VisionProvider | null {
    // Try free providers first
    const freeProvider = this.selectFreeProvider(providers);
    if (freeProvider) return freeProvider;
    
    // Fall back to paid if budget allows
    const paidProviders = providers.filter(p => p.costPerRequest && p.costPerRequest > 0);
    return paidProviders.length > 0 ? paidProviders[0] : null;
  }

  /**
   * Select provider for premium-preferred mode
   */
  private selectPremiumProvider(providers: VisionProvider[]): VisionProvider | null {
    // Prefer paid providers for quality
    const paidProviders = providers.filter(p => p.costPerRequest && p.costPerRequest > 0);
    if (paidProviders.length > 0) return paidProviders[0];
    
    // Fall back to free if no paid available
    return this.selectFreeProvider(providers);
  }

  /**
   * Track usage for a provider
   */
  public trackUsage(providerId: string, success: boolean, responseTime: number, cost: number = 0): void {
    const usage = this.usageTracking.get(providerId);
    if (usage) {
      usage.requestCount++;
      if (success) usage.successCount++;
      else usage.failureCount++;
      usage.totalCost += cost;
      usage.lastUsed = new Date();
      usage.avgResponseTime = (usage.avgResponseTime + responseTime) / 2;
      
      // Update budget tracking
      this.budgetControl.currentSpend += cost;
      this.budgetControl.remainingBudget = this.budgetControl.monthlyBudget - this.budgetControl.currentSpend;
    }
  }

  /**
   * Get provider statistics
   */
  public getProviderStatistics(): Map<string, UsageTracking> {
    return new Map(this.usageTracking);
  }

  /**
   * Get budget status
   */
  public getBudgetStatus(): BudgetControl {
    return { ...this.budgetControl };
  }

  /**
   * Update preferences
   */
  public updatePreferences(preferences: Partial<ProviderPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    this.budgetControl.monthlyBudget = this.preferences.maxMonthlyBudget;
    this.budgetControl.remainingBudget = this.budgetControl.monthlyBudget - this.budgetControl.currentSpend;
    this.saveSettings();
  }

  /**
   * Get all providers by category
   */
  public getProvidersByCategory(): Record<string, VisionProvider[]> {
    const categories: Record<string, VisionProvider[]> = {};
    
    Array.from(this.providers.values()).forEach(provider => {
      if (!categories[provider.category]) {
        categories[provider.category] = [];
      }
      categories[provider.category].push(provider);
    });
    
    return categories;
  }

  /**
   * Get provider recommendations based on use case
   */
  public getRecommendations(useCase: string): VisionProvider[] {
    const allProviders = Array.from(this.providers.values());
    
    switch (useCase) {
      case 'cost_optimization':
        return allProviders
          .filter(p => !p.costPerRequest || p.costPerRequest === 0)
          .sort((a, b) => b.qualityScore - a.qualityScore);
      
      case 'quality_focused':
        return allProviders
          .sort((a, b) => b.qualityScore - a.qualityScore)
          .slice(0, 5);
      
      case 'speed_focused':
        return allProviders
          .sort((a, b) => a.avgResponseTime - b.avgResponseTime)
          .slice(0, 5);
      
      case 'document_analysis':
        return allProviders
          .filter(p => p.supportsDocumentAnalysis)
          .sort((a, b) => b.qualityScore - a.qualityScore);
      
      case 'ui_analysis':
        return allProviders
          .filter(p => p.supportsUIAnalysis)
          .sort((a, b) => b.qualityScore - a.qualityScore);
      
      default:
        return allProviders.sort((a, b) => b.qualityScore - a.qualityScore);
    }
  }

  /**
   * Check provider availability
   */
  public async checkProviderAvailability(): Promise<void> {
    for (const provider of this.providers.values()) {
      try {
        if (provider.isLocal) {
          // Check local providers (e.g., Ollama)
          if (provider.id === 'ollama_llava') {
            const response = await axios.get('http://localhost:11434/api/tags', { timeout: 5000 });
            provider.isAvailable = response.status === 200;
          }
        } else {
          // For cloud providers, assume available unless proven otherwise
          provider.isAvailable = true;
        }
      } catch (error) {
        provider.isAvailable = false;
      }
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const settings = await this.settingsManager.get('enhancedVisionProviderSettings');
      if (settings) {
        this.preferences = { ...this.preferences, ...settings.preferences };
        this.budgetControl = { ...this.budgetControl, ...settings.budgetControl };
        if (settings.usageTracking) {
          this.usageTracking = new Map(Object.entries(settings.usageTracking));
        }
      }
    } catch (error) {
      ErrorHandler.logError('Failed to load enhanced provider settings', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const settings = {
        preferences: this.preferences,
        budgetControl: this.budgetControl,
        usageTracking: Object.fromEntries(this.usageTracking)
      };
      await this.settingsManager.set('enhancedVisionProviderSettings', settings);
    } catch (error) {
      ErrorHandler.logError('Failed to save enhanced provider settings', error);
    }
  }
}
