/**
 * Free Vision API Provider
 * Implements completely free computer vision alternatives
 */

import axios from 'axios';
import { ErrorHandler } from '../shared/ErrorHandler';

export interface VisionAnalysisResult {
  description: string;
  confidence: number;
  provider: string;
  processingTime: number;
  metadata?: any;
}

export interface FreeAPIProvider {
  name: string;
  endpoint: string;
  isLocal: boolean;
  isAvailable: boolean;
  maxImageSize: number;
  supportedFormats: string[];
}

export class FreeVisionAPIProvider {
  private providers: FreeAPIProvider[];
  private currentProviderIndex: number;

  constructor() {
    this.providers = [
      {
        name: 'Ollama LLaVA',
        endpoint: 'http://localhost:11434/api/generate',
        isLocal: true,
        isAvailable: false,
        maxImageSize: 10 * 1024 * 1024, // 10MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
      },
      {
        name: 'Hugging Face Inference API',
        endpoint: 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large',
        isLocal: false,
        isAvailable: false,
        maxImageSize: 5 * 1024 * 1024, // 5MB
        supportedFormats: ['jpg', 'jpeg', 'png']
      },
      {
        name: 'Azure Computer Vision Free Tier',
        endpoint: 'https://api.cognitive.microsoft.com/vision/v3.2/analyze',
        isLocal: false,
        isAvailable: false,
        maxImageSize: 4 * 1024 * 1024, // 4MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp']
      },
      {
        name: 'AWS Rekognition Free Tier',
        endpoint: 'https://rekognition.us-east-1.amazonaws.com/',
        isLocal: false,
        isAvailable: false,
        maxImageSize: 5 * 1024 * 1024, // 5MB
        supportedFormats: ['jpg', 'jpeg', 'png']
      }
    ];
    this.currentProviderIndex = 0;
    this.checkProviderAvailability();
  }

  /**
   * Analyze image using free providers
   */
  async analyzeImage(imageData: Buffer, prompt?: string): Promise<VisionAnalysisResult> {
    const startTime = Date.now();
    
    // Try each available provider
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.getNextAvailableProvider();
      if (!provider) {
        throw new Error('No free vision providers available');
      }

      try {
        const result = await this.analyzeWithProvider(provider, imageData, prompt);
        result.processingTime = Date.now() - startTime;
        return result;
      } catch (error) {
        ErrorHandler.logError(`Failed to analyze with ${provider.name}`, error);
        // Continue to next provider
      }
    }

    throw new Error('All free vision providers failed');
  }

  /**
   * Analyze image with Ollama LLaVA (local)
   */
  private async analyzeWithOllama(imageData: Buffer, prompt?: string): Promise<VisionAnalysisResult> {
    const base64Image = imageData.toString('base64');
    const analysisPrompt = prompt || 'Describe what you see in this image in detail. Focus on any text, UI elements, buttons, or interactive components that might be relevant for automation.';

    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llava',
      prompt: analysisPrompt,
      images: [base64Image],
      stream: false
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return {
      description: response.data.response,
      confidence: 0.9, // Ollama doesn't provide confidence scores
      provider: 'Ollama LLaVA',
      processingTime: 0,
      metadata: {
        model: 'llava',
        local: true
      }
    };
  }

  /**
   * Analyze image with Hugging Face Inference API (free)
   */
  private async analyzeWithHuggingFace(imageData: Buffer): Promise<VisionAnalysisResult> {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large',
      imageData,
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      }
    );

    const caption = Array.isArray(response.data) ? response.data[0]?.generated_text : response.data.generated_text;

    return {
      description: caption || 'Unable to generate description',
      confidence: 0.8,
      provider: 'Hugging Face BLIP',
      processingTime: 0,
      metadata: {
        model: 'Salesforce/blip-image-captioning-large',
        free: true
      }
    };
  }

  /**
   * Analyze image with Azure Computer Vision Free Tier
   */
  private async analyzeWithAzure(imageData: Buffer, apiKey: string): Promise<VisionAnalysisResult> {
    const response = await axios.post(
      'https://api.cognitive.microsoft.com/vision/v3.2/analyze?visualFeatures=Description,Tags,Objects,Text',
      imageData,
      {
        timeout: 30000,
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/octet-stream'
        }
      }
    );

    const description = response.data.description?.captions?.[0]?.text || 'No description available';
    const confidence = response.data.description?.captions?.[0]?.confidence || 0.5;

    return {
      description,
      confidence,
      provider: 'Azure Computer Vision',
      processingTime: 0,
      metadata: {
        tags: response.data.tags,
        objects: response.data.objects,
        text: response.data.readResult
      }
    };
  }

  /**
   * Analyze image with AWS Rekognition Free Tier
   */
  private async analyzeWithAWS(imageData: Buffer, accessKey: string, secretKey: string, region: string = 'us-east-1'): Promise<VisionAnalysisResult> {
    // Note: This would require AWS SDK implementation
    // For now, return a placeholder
    throw new Error('AWS Rekognition integration not yet implemented');
  }

  /**
   * Get next available provider using round-robin
   */
  private getNextAvailableProvider(): FreeAPIProvider | null {
    const availableProviders = this.providers.filter(p => p.isAvailable);
    if (availableProviders.length === 0) return null;

    const provider = availableProviders[this.currentProviderIndex % availableProviders.length];
    this.currentProviderIndex = (this.currentProviderIndex + 1) % availableProviders.length;
    return provider;
  }

  /**
   * Analyze with specific provider
   */
  private async analyzeWithProvider(provider: FreeAPIProvider, imageData: Buffer, prompt?: string): Promise<VisionAnalysisResult> {
    switch (provider.name) {
      case 'Ollama LLaVA':
        return this.analyzeWithOllama(imageData, prompt);
      case 'Hugging Face Inference API':
        return this.analyzeWithHuggingFace(imageData);
      case 'Azure Computer Vision Free Tier':
        // Would need API key from pool
        throw new Error('Azure integration requires API key');
      case 'AWS Rekognition Free Tier':
        // Would need AWS credentials from pool
        throw new Error('AWS integration requires credentials');
      default:
        throw new Error(`Unknown provider: ${provider.name}`);
    }
  }

  /**
   * Check which providers are available
   */
  private async checkProviderAvailability(): Promise<void> {
    // Check Ollama
    try {
      await axios.get('http://localhost:11434/api/tags', { timeout: 5000 });
      const ollamaProvider = this.providers.find(p => p.name === 'Ollama LLaVA');
      if (ollamaProvider) {
        ollamaProvider.isAvailable = true;
      }
    } catch (error) {
      // Ollama not available
    }

    // Check Hugging Face (always available, but may have rate limits)
    const hfProvider = this.providers.find(p => p.name === 'Hugging Face Inference API');
    if (hfProvider) {
      hfProvider.isAvailable = true;
    }

    // Azure and AWS would be available if API keys are configured
    // This will be handled by the main vision analysis module
  }

  /**
   * Get status of all providers
   */
  getProviderStatus(): FreeAPIProvider[] {
    return [...this.providers];
  }

  /**
   * Refresh provider availability
   */
  async refreshProviderAvailability(): Promise<void> {
    await this.checkProviderAvailability();
  }

  /**
   * Check if image is supported by provider
   */
  isImageSupported(provider: FreeAPIProvider, imageSize: number, format: string): boolean {
    return imageSize <= provider.maxImageSize && 
           provider.supportedFormats.includes(format.toLowerCase());
  }

  /**
   * Get recommended provider for image
   */
  getRecommendedProvider(imageSize: number, format: string): FreeAPIProvider | null {
    const suitableProviders = this.providers.filter(p => 
      p.isAvailable && this.isImageSupported(p, imageSize, format)
    );

    if (suitableProviders.length === 0) return null;

    // Prefer local providers for privacy and speed
    const localProvider = suitableProviders.find(p => p.isLocal);
    if (localProvider) return localProvider;

    // Otherwise return first available
    return suitableProviders[0];
  }
}
