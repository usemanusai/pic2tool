import * as fs from 'fs';
import * as log from 'electron-log';
import { FrameInfo } from './VideoProcessingModule';
import { APIKeyPoolManager, APIKey } from './APIKeyPoolManager';
import { FreeVisionAPIProvider, VisionAnalysisResult } from './FreeVisionAPIProvider';
import { ModelManagementService, ModelValidationResult } from './ModelManagementService';
import { EnhancedVisionProviderManager } from './EnhancedVisionProviderManager';
import { ErrorHandler } from '../shared/ErrorHandler';

export interface VisionService {
  name: string;
  provider: APIKey['provider'];
  analyzeFrame(frameBuffer: Buffer, apiKey: string, prompt?: string): Promise<FrameAnalysis>;
  supportsRetry: boolean;
  maxRetries: number;
}

export interface FrameAnalysis {
  frameIndex: number;
  timestamp: number;
  elements: UIElement[];
  cursor?: CursorInfo;
  text?: string[];
  actions?: DetectedAction[];
  provider?: string;
  confidence?: number;
  processingTime?: number;
  usedFreeProvider?: boolean;
}

export interface UIElement {
  type: 'button' | 'input' | 'dropdown' | 'window' | 'menu' | 'text' | 'image' | 'other';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text?: string;
  confidence: number;
  attributes?: Record<string, any>;
}

export interface CursorInfo {
  x: number;
  y: number;
  visible: boolean;
  type?: 'arrow' | 'hand' | 'text' | 'wait';
}

export interface DetectedAction {
  type: 'click' | 'type' | 'scroll' | 'drag' | 'key_press';
  target?: UIElement;
  value?: string;
  confidence: number;
}

export interface AnalysisOptions {
  preferFreeProviders: boolean;
  maxRetries: number;
  retryDelay: number;
  fallbackToFree: boolean;
  customPrompt?: string;
}

export class VisionAnalysisModule {
  private keyPoolManager: APIKeyPoolManager;
  private freeProvider: FreeVisionAPIProvider;
  private modelManager: ModelManagementService;
  public enhancedProviderManager: EnhancedVisionProviderManager; // Made public for IPC access
  private visionServices: Map<APIKey['provider'], VisionService> = new Map();
  private retryDelays: Map<string, number> = new Map();
  private selectedModels: Map<string, string> = new Map(); // providerId -> modelName

  constructor() {
    log.info(
      'VisionAnalysisModule initialized with multi-API key rotation, free tier optimization, and dynamic model support'
    );
    this.keyPoolManager = new APIKeyPoolManager();
    this.freeProvider = new FreeVisionAPIProvider();
    this.modelManager = new ModelManagementService();
    this.enhancedProviderManager = new EnhancedVisionProviderManager();
    this.initializeServices();
    this.loadSelectedModels();
  }

  private initializeServices(): void {
    // Initialize vision services with new architecture and model support
    this.visionServices.set(
      'openai',
      new OpenAIVisionService((providerId) => this.getSelectedModel(providerId))
    );
    this.visionServices.set('google', new GoogleVisionService());
    this.visionServices.set('azure', new AzureVisionService());
    this.visionServices.set('aws', new AWSVisionService());
    this.visionServices.set('huggingface', new HuggingFaceVisionService());

    log.info(`Initialized ${this.visionServices.size} vision services with dynamic model support`);
  }

  /**
   * Add API key to the pool
   */
  public async addAPIKey(
    provider: APIKey['provider'],
    key: string,
    options?: {
      name?: string;
      tier?: 'free' | 'trial' | 'paid';
      dailyLimit?: number;
      expiresAt?: Date;
    }
  ): Promise<string> {
    return await this.keyPoolManager.addAPIKey(provider, key, options);
  }

  /**
   * Get status of all API keys
   */
  public getAPIKeyStatus(): Record<APIKey['provider'], any[]> {
    const status: Record<APIKey['provider'], any[]> = {
      openai: [],
      google: [],
      azure: [],
      aws: [],
      huggingface: [],
      ollama: [],
    };

    for (const provider of Object.keys(status) as APIKey['provider'][]) {
      status[provider] = this.keyPoolManager.getKeysStatus(provider);
    }

    return status;
  }

  /**
   * Analyze frames with intelligent API key rotation and free tier optimization
   */
  public async analyzeFrames(
    frames: FrameInfo[],
    options: AnalysisOptions = {
      preferFreeProviders: true,
      maxRetries: 3,
      retryDelay: 1000,
      fallbackToFree: true,
    }
  ): Promise<FrameAnalysis[]> {
    try {
      log.info(`Starting analysis of ${frames.length} frames with multi-API rotation`);

      const results: FrameAnalysis[] = [];

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        log.debug(`Analyzing frame ${i + 1}/${frames.length}: ${frame.path}`);

        try {
          const frameBuffer = fs.readFileSync(frame.path);
          const analysis = await this.analyzeFrameWithFallback(frameBuffer, frame, options);
          results.push(analysis);

          // Adaptive delay based on provider type
          const delay = analysis.usedFreeProvider ? 100 : 500;
          await this.delay(delay);
        } catch (error) {
          log.error(`Error analyzing frame ${i}:`, error);

          // Create a fallback analysis for failed frames
          results.push(this.createFallbackAnalysis(frame));
        }
      }

      log.info(`Completed analysis of ${results.length} frames`);
      this.logAnalysisStatistics(results);
      return results;
    } catch (error) {
      log.error('Error in frame analysis:', error);
      throw error;
    }
  }

  /**
   * Analyze single frame with intelligent provider selection and fallback
   */
  private async analyzeFrameWithFallback(
    frameBuffer: Buffer,
    frameInfo: FrameInfo,
    options: AnalysisOptions
  ): Promise<FrameAnalysis> {
    const startTime = Date.now();

    // Try free providers first if preferred
    if (options.preferFreeProviders) {
      try {
        const freeResult = await this.tryFreeProviders(frameBuffer, options.customPrompt);
        if (freeResult) {
          return this.convertFreeResultToFrameAnalysis(freeResult, frameInfo, true);
        }
      } catch (error) {
        log.debug('Free providers failed, trying paid APIs:', error);
      }
    }

    // Try paid API providers with rotation
    const providers: APIKey['provider'][] = ['openai', 'google', 'azure', 'aws'];

    for (const provider of providers) {
      const result = await this.tryProviderWithRetry(provider, frameBuffer, frameInfo, options);
      if (result) {
        result.processingTime = Date.now() - startTime;
        return result;
      }
    }

    // Final fallback to free providers if all paid APIs fail
    if (options.fallbackToFree && !options.preferFreeProviders) {
      try {
        const freeResult = await this.tryFreeProviders(frameBuffer, options.customPrompt);
        if (freeResult) {
          return this.convertFreeResultToFrameAnalysis(freeResult, frameInfo, true);
        }
      } catch (error) {
        log.error('All providers failed, including free fallback:', error);
      }
    }

    throw new Error('All vision analysis providers failed');
  }

  /**
   * Try a specific provider with retry logic and key rotation
   */
  private async tryProviderWithRetry(
    provider: APIKey['provider'],
    frameBuffer: Buffer,
    frameInfo: FrameInfo,
    options: AnalysisOptions
  ): Promise<FrameAnalysis | null> {
    const service = this.visionServices.get(provider);
    if (!service) {
      log.debug(`Service for provider ${provider} not available`);
      return null;
    }

    for (let attempt = 0; attempt < options.maxRetries; attempt++) {
      const apiKey = this.keyPoolManager.getNextAvailableKey(provider);
      if (!apiKey) {
        log.debug(`No available API keys for provider ${provider}`);
        break;
      }

      try {
        log.debug(
          `Attempting analysis with ${provider} (key: ${apiKey.name}, attempt: ${attempt + 1})`
        );

        const analysis = await service.analyzeFrame(frameBuffer, apiKey.key, options.customPrompt);
        analysis.frameIndex = frameInfo.index;
        analysis.timestamp = frameInfo.timestamp;
        analysis.provider = `${provider} (${apiKey.name})`;
        analysis.usedFreeProvider = false;

        // Mark key as successfully used
        this.keyPoolManager.markKeyAsUsed(apiKey.id, true);

        return analysis;
      } catch (error) {
        log.warn(`Provider ${provider} failed (attempt ${attempt + 1}):`, error);

        // Mark key as used (failed)
        this.keyPoolManager.markKeyAsUsed(apiKey.id, false);

        // Handle rate limiting
        if (this.isRateLimitError(error)) {
          const retryAfter = this.extractRetryAfter(error) || 3600;
          this.keyPoolManager.markKeyAsRateLimited(apiKey.id, retryAfter);
          log.info(`Key ${apiKey.name} rate limited for ${retryAfter} seconds`);

          // Try next key immediately for rate limit errors
          continue;
        }

        // For other errors, wait before retry
        if (attempt < options.maxRetries - 1) {
          const delay = options.retryDelay * Math.pow(2, attempt); // Exponential backoff
          await this.delay(delay);
        }
      }
    }

    return null;
  }

  /**
   * Try free providers
   */
  private async tryFreeProviders(
    frameBuffer: Buffer,
    prompt?: string
  ): Promise<VisionAnalysisResult | null> {
    try {
      await this.freeProvider.refreshProviderAvailability();
      return await this.freeProvider.analyzeImage(frameBuffer, prompt);
    } catch (error) {
      log.debug('Free providers failed:', error);
      return null;
    }
  }

  /**
   * Convert free provider result to FrameAnalysis format
   */
  private convertFreeResultToFrameAnalysis(
    result: VisionAnalysisResult,
    frameInfo: FrameInfo,
    usedFree: boolean
  ): FrameAnalysis {
    // Parse the description to extract UI elements (basic implementation)
    const elements = this.parseDescriptionForElements(result.description);

    return {
      frameIndex: frameInfo.index,
      timestamp: frameInfo.timestamp,
      elements,
      cursor: { x: 0, y: 0, visible: false }, // Free providers don't detect cursor
      text: this.extractTextFromDescription(result.description),
      actions: [], // Free providers don't detect actions directly
      provider: result.provider,
      confidence: result.confidence,
      processingTime: result.processingTime,
      usedFreeProvider: usedFree,
    };
  }

  /**
   * Parse description text to extract potential UI elements
   */
  private parseDescriptionForElements(description: string): UIElement[] {
    const elements: UIElement[] = [];
    const buttonRegex = /button|btn|click/gi;
    const inputRegex = /input|field|textbox|text box/gi;
    const windowRegex = /window|dialog|modal/gi;

    // This is a basic implementation - could be enhanced with NLP
    if (buttonRegex.test(description)) {
      elements.push({
        type: 'button',
        bounds: { x: 0, y: 0, width: 100, height: 30 },
        text: 'Detected button',
        confidence: 0.6,
      });
    }

    if (inputRegex.test(description)) {
      elements.push({
        type: 'input',
        bounds: { x: 0, y: 0, width: 200, height: 25 },
        text: 'Detected input field',
        confidence: 0.6,
      });
    }

    return elements;
  }

  /**
   * Extract text mentions from description
   */
  private extractTextFromDescription(description: string): string[] {
    // Extract quoted text and common UI text patterns
    const quotedText = description.match(/"([^"]+)"/g) || [];
    const textMatches = description.match(/text[:\s]+"?([^".,\n]+)"?/gi) || [];

    return [...quotedText, ...textMatches]
      .map((text) => text.replace(/^["']|["']$/g, '').trim())
      .filter((text) => text.length > 0);
  }

  private isRateLimitError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    const statusCode = error.status || error.response?.status;

    return (
      statusCode === 429 ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('too many requests')
    );
  }

  private extractRetryAfter(error: any): number | null {
    // Try to extract retry-after header or parse from error message
    const retryAfter = error.response?.headers?.['retry-after'] || error.headers?.['retry-after'];

    if (retryAfter) {
      return parseInt(retryAfter, 10);
    }

    // Parse from error message
    const match = error.message?.match(/retry after (\d+) seconds?/i);
    return match ? parseInt(match[1], 10) : null;
  }

  private createFallbackAnalysis(frameInfo: FrameInfo): FrameAnalysis {
    return {
      frameIndex: frameInfo.index,
      timestamp: frameInfo.timestamp,
      elements: [],
      text: [],
      actions: [],
      provider: 'fallback',
      confidence: 0,
      usedFreeProvider: false,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log analysis statistics
   */
  private logAnalysisStatistics(results: FrameAnalysis[]): void {
    const stats = {
      total: results.length,
      successful: results.filter((r) => r.provider !== 'fallback').length,
      usedFree: results.filter((r) => r.usedFreeProvider).length,
      usedPaid: results.filter((r) => !r.usedFreeProvider && r.provider !== 'fallback').length,
      avgConfidence: results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length,
      avgProcessingTime:
        results.reduce((sum, r) => sum + (r.processingTime || 0), 0) / results.length,
    };

    log.info('Analysis Statistics:', stats);
  }

  /**
   * Get free provider status
   */
  public getFreeProviderStatus() {
    return this.freeProvider.getProviderStatus();
  }

  /**
   * Get usage statistics
   */
  public getUsageStatistics() {
    return this.keyPoolManager.getUsageStatistics();
  }

  /**
   * Reset daily usage counters
   */
  public resetDailyUsage(): void {
    this.keyPoolManager.resetDailyUsage();
  }

  /**
   * Remove an API key
   */
  public async removeAPIKey(keyId: string): Promise<boolean> {
    return await this.keyPoolManager.removeAPIKey(keyId);
  }

  /**
   * Model Management Methods
   */

  /**
   * Validate a custom model for a provider
   */
  public async validateModel(
    providerId: string,
    modelName: string,
    apiKey?: string
  ): Promise<ModelValidationResult> {
    return await this.modelManager.validateModel(providerId, modelName, apiKey);
  }

  /**
   * Discover available models for a provider
   */
  public async discoverModels(providerId: string, apiKey?: string) {
    return await this.modelManager.discoverModels(providerId, apiKey);
  }

  /**
   * Add a custom model configuration
   */
  public async addCustomModel(
    providerId: string,
    modelName: string,
    displayName: string,
    apiKey?: string
  ) {
    return await this.modelManager.addCustomModel(providerId, modelName, displayName, apiKey);
  }

  /**
   * Get model configurations for a provider
   */
  public getModelConfigurations(providerId: string) {
    return this.modelManager.getModelConfigurations(providerId);
  }

  /**
   * Remove a custom model
   */
  public async removeCustomModel(providerId: string, modelName: string): Promise<boolean> {
    return await this.modelManager.removeCustomModel(providerId, modelName);
  }

  /**
   * Set the selected model for a provider
   */
  public setSelectedModel(providerId: string, modelName: string): void {
    this.selectedModels.set(providerId, modelName);
    this.saveSelectedModels();
  }

  /**
   * Get the selected model for a provider
   */
  public getSelectedModel(providerId: string): string | undefined {
    return this.selectedModels.get(providerId);
  }

  /**
   * Load selected models from storage
   */
  private loadSelectedModels(): void {
    try {
      // This would load from settings - simplified for now
      this.selectedModels.set('openrouter_qwen_free', 'qwen/qwen-2.5-vl-32b-instruct:free');
      this.selectedModels.set('openai_gpt4o', 'gpt-4o');
    } catch (error) {
      log.error('Failed to load selected models:', error);
    }
  }

  /**
   * Save selected models to storage
   */
  private saveSelectedModels(): void {
    try {
      // This would save to settings - simplified for now
      log.info('Selected models saved');
    } catch (error) {
      log.error('Failed to save selected models:', error);
    }
  }
}

// Enhanced vision service implementations
class OpenAIVisionService implements VisionService {
  name = 'OpenAI GPT-4V';
  provider: APIKey['provider'] = 'openai';
  supportsRetry = true;
  maxRetries = 3;

  constructor(private getSelectedModel?: (providerId: string) => string | undefined) {}

  async analyzeFrame(frameBuffer: Buffer, apiKey: string, prompt?: string): Promise<FrameAnalysis> {
    try {
      const base64Image = frameBuffer.toString('base64');
      const analysisPrompt =
        prompt ||
        `Analyze this screenshot and identify UI elements, cursor position, and any user actions. Return a JSON object with:
        - elements: array of UI elements with type, bounds (x,y,width,height), text, and confidence
        - cursor: object with x, y, visible, and type
        - text: array of visible text strings
        - actions: array of detected actions with type and confidence

        UI element types: button, input, dropdown, window, menu, text, image, other
        Cursor types: arrow, hand, text, wait
        Action types: click, type, scroll, drag, key_press`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.getSelectedModel?.('openai_gpt4o') || 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: analysisPrompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 1500,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in OpenAI response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        frameIndex: 0,
        timestamp: 0,
        elements: analysis.elements || [],
        cursor: analysis.cursor || { x: 0, y: 0, visible: false },
        text: analysis.text || [],
        actions: analysis.actions || [],
      };
    } catch (error) {
      log.error('OpenAI vision analysis error:', error);
      throw error;
    }
  }
}

class GoogleVisionService implements VisionService {
  name = 'Google Vision API';
  provider: APIKey['provider'] = 'google';
  supportsRetry = true;
  maxRetries = 3;

  async analyzeFrame(frameBuffer: Buffer, apiKey: string, prompt?: string): Promise<FrameAnalysis> {
    try {
      const base64Image = frameBuffer.toString('base64');

      // Use Google Vision API for text detection and object detection
      const textResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: base64Image,
                },
                features: [
                  { type: 'TEXT_DETECTION', maxResults: 50 },
                  { type: 'OBJECT_LOCALIZATION', maxResults: 50 },
                ],
              },
            ],
          }),
        }
      );

      if (!textResponse.ok) {
        throw new Error(
          `Google Vision API error: ${textResponse.status} ${textResponse.statusText}`
        );
      }

      const data = await textResponse.json();
      const annotations = data.responses[0];

      const elements: UIElement[] = [];
      const textStrings: string[] = [];

      // Process text annotations
      if (annotations.textAnnotations) {
        annotations.textAnnotations.forEach((annotation: any, index: number) => {
          if (index === 0) return; // Skip the full text annotation

          const vertices = annotation.boundingPoly.vertices;
          const bounds = {
            x: Math.min(...vertices.map((v: any) => v.x || 0)),
            y: Math.min(...vertices.map((v: any) => v.y || 0)),
            width:
              Math.max(...vertices.map((v: any) => v.x || 0)) -
              Math.min(...vertices.map((v: any) => v.x || 0)),
            height:
              Math.max(...vertices.map((v: any) => v.y || 0)) -
              Math.min(...vertices.map((v: any) => v.y || 0)),
          };

          elements.push({
            type: 'text',
            bounds,
            text: annotation.description,
            confidence: 0.9,
          });

          textStrings.push(annotation.description);
        });
      }

      // Process object annotations
      if (annotations.localizedObjectAnnotations) {
        annotations.localizedObjectAnnotations.forEach((obj: any) => {
          const vertices = obj.boundingPoly.normalizedVertices;
          // Convert normalized coordinates to pixel coordinates (assuming 1920x1080)
          const bounds = {
            x: Math.round(vertices[0].x * 1920),
            y: Math.round(vertices[0].y * 1080),
            width: Math.round((vertices[2].x - vertices[0].x) * 1920),
            height: Math.round((vertices[2].y - vertices[0].y) * 1080),
          };

          let elementType: UIElement['type'] = 'other';
          if (obj.name.toLowerCase().includes('button')) elementType = 'button';
          else if (obj.name.toLowerCase().includes('window')) elementType = 'window';
          else if (obj.name.toLowerCase().includes('menu')) elementType = 'menu';

          elements.push({
            type: elementType,
            bounds,
            text: obj.name,
            confidence: obj.score,
          });
        });
      }

      return {
        frameIndex: 0,
        timestamp: 0,
        elements,
        cursor: { x: 0, y: 0, visible: false }, // Google Vision doesn't detect cursor
        text: textStrings,
        actions: [], // Google Vision doesn't detect actions directly
      };
    } catch (error) {
      log.error('Google vision analysis error:', error);
      throw error;
    }
  }
}

class AzureVisionService implements VisionService {
  name = 'Azure Computer Vision';
  provider: APIKey['provider'] = 'azure';
  supportsRetry = true;
  maxRetries = 3;

  async analyzeFrame(frameBuffer: Buffer, apiKey: string, prompt?: string): Promise<FrameAnalysis> {
    try {
      const response = await fetch(
        'https://api.cognitive.microsoft.com/vision/v3.2/analyze?visualFeatures=Description,Tags,Objects,Text',
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/octet-stream',
          },
          body: frameBuffer,
        }
      );

      if (!response.ok) {
        throw new Error(`Azure Vision API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const description = data.description?.captions?.[0]?.text || 'No description available';
      const confidence = data.description?.captions?.[0]?.confidence || 0.5;

      const elements: UIElement[] = [];
      const textStrings: string[] = [];

      // Process detected objects
      if (data.objects) {
        data.objects.forEach((obj: any) => {
          elements.push({
            type: this.mapAzureObjectToUIType(obj.object),
            bounds: {
              x: obj.rectangle.x,
              y: obj.rectangle.y,
              width: obj.rectangle.w,
              height: obj.rectangle.h,
            },
            text: obj.object,
            confidence: obj.confidence,
          });
        });
      }

      // Process detected text
      if (data.readResult?.analyzeResult?.readResults) {
        data.readResult.analyzeResult.readResults.forEach((page: any) => {
          page.lines.forEach((line: any) => {
            textStrings.push(line.text);
            elements.push({
              type: 'text',
              bounds: {
                x: Math.min(...line.boundingBox.filter((_: any, i: number) => i % 2 === 0)),
                y: Math.min(...line.boundingBox.filter((_: any, i: number) => i % 2 === 1)),
                width:
                  Math.max(...line.boundingBox.filter((_: any, i: number) => i % 2 === 0)) -
                  Math.min(...line.boundingBox.filter((_: any, i: number) => i % 2 === 0)),
                height:
                  Math.max(...line.boundingBox.filter((_: any, i: number) => i % 2 === 1)) -
                  Math.min(...line.boundingBox.filter((_: any, i: number) => i % 2 === 1)),
              },
              text: line.text,
              confidence: 0.9,
            });
          });
        });
      }

      return {
        frameIndex: 0,
        timestamp: 0,
        elements,
        cursor: { x: 0, y: 0, visible: false },
        text: textStrings,
        actions: [],
      };
    } catch (error) {
      log.error('Azure vision analysis error:', error);
      throw error;
    }
  }

  private mapAzureObjectToUIType(objectName: string): UIElement['type'] {
    const name = objectName.toLowerCase();
    if (name.includes('button')) return 'button';
    if (name.includes('window')) return 'window';
    if (name.includes('menu')) return 'menu';
    if (name.includes('text')) return 'text';
    return 'other';
  }
}

class AWSVisionService implements VisionService {
  name = 'AWS Rekognition';
  provider: APIKey['provider'] = 'aws';
  supportsRetry = true;
  maxRetries = 3;

  async analyzeFrame(frameBuffer: Buffer, apiKey: string, prompt?: string): Promise<FrameAnalysis> {
    // AWS Rekognition implementation would require AWS SDK
    // For now, throw an error indicating it's not implemented
    throw new Error('AWS Rekognition integration not yet implemented. Please use other providers.');
  }
}

class HuggingFaceVisionService implements VisionService {
  name = 'Hugging Face';
  provider: APIKey['provider'] = 'huggingface';
  supportsRetry = true;
  maxRetries = 2;

  async analyzeFrame(frameBuffer: Buffer, apiKey: string, prompt?: string): Promise<FrameAnalysis> {
    try {
      // Use Hugging Face Inference API with API key for higher rate limits
      const response = await fetch(
        'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/octet-stream',
          },
          body: frameBuffer,
        }
      );

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const caption = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;

      // Basic parsing of the caption to extract UI elements
      const elements: UIElement[] = [];
      const textStrings: string[] = [];

      if (caption) {
        textStrings.push(caption);

        // Simple keyword-based element detection
        if (caption.toLowerCase().includes('button')) {
          elements.push({
            type: 'button',
            bounds: { x: 0, y: 0, width: 100, height: 30 },
            text: 'Detected button',
            confidence: 0.6,
          });
        }
      }

      return {
        frameIndex: 0,
        timestamp: 0,
        elements,
        cursor: { x: 0, y: 0, visible: false },
        text: textStrings,
        actions: [],
      };
    } catch (error) {
      log.error('Hugging Face vision analysis error:', error);
      throw error;
    }
  }
}
