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
      // Local providers (highest priority - unlimited and free)
      {
        name: 'Ollama LLaVA',
        endpoint: 'http://localhost:11434/api/generate',
        isLocal: true,
        isAvailable: false,
        maxImageSize: 10 * 1024 * 1024, // 10MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
      },

      // New 2025 Free Cloud Providers (high priority)
      {
        name: 'Google Gemini 2.5 Flash Free',
        endpoint:
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        isLocal: false,
        isAvailable: false,
        maxImageSize: 20 * 1024 * 1024, // 20MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
      },
      {
        name: 'OpenRouter Qwen2.5-VL Free',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        isLocal: false,
        isAvailable: false,
        maxImageSize: 10 * 1024 * 1024, // 10MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
      },
      {
        name: 'Groq LLaVA Free',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        isLocal: false,
        isAvailable: false,
        maxImageSize: 8 * 1024 * 1024, // 8MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
      },
      {
        name: 'Together AI Vision Free',
        endpoint: 'https://api.together.xyz/v1/chat/completions',
        isLocal: false,
        isAvailable: false,
        maxImageSize: 10 * 1024 * 1024, // 10MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
      },
      {
        name: 'Fireworks AI Vision Free',
        endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
        isLocal: false,
        isAvailable: false,
        maxImageSize: 8 * 1024 * 1024, // 8MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
      },
      {
        name: 'DeepInfra Vision Free',
        endpoint: 'https://api.deepinfra.com/v1/openai/chat/completions',
        isLocal: false,
        isAvailable: false,
        maxImageSize: 10 * 1024 * 1024, // 10MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
      },

      // Existing providers (lower priority)
      {
        name: 'Hugging Face Inference API',
        endpoint:
          'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large',
        isLocal: false,
        isAvailable: false,
        maxImageSize: 5 * 1024 * 1024, // 5MB
        supportedFormats: ['jpg', 'jpeg', 'png'],
      },
      {
        name: 'Azure Computer Vision Free Tier',
        endpoint: 'https://api.cognitive.microsoft.com/vision/v3.2/analyze',
        isLocal: false,
        isAvailable: false,
        maxImageSize: 4 * 1024 * 1024, // 4MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp'],
      },
      {
        name: 'AWS Rekognition Free Tier',
        endpoint: 'https://rekognition.us-east-1.amazonaws.com/',
        isLocal: false,
        isAvailable: false,
        maxImageSize: 5 * 1024 * 1024, // 5MB
        supportedFormats: ['jpg', 'jpeg', 'png'],
      },
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
  private async analyzeWithOllama(
    imageData: Buffer,
    prompt?: string
  ): Promise<VisionAnalysisResult> {
    const base64Image = imageData.toString('base64');
    const analysisPrompt =
      prompt ||
      'Describe what you see in this image in detail. Focus on any text, UI elements, buttons, or interactive components that might be relevant for automation.';

    const response = await axios.post(
      'http://localhost:11434/api/generate',
      {
        model: 'llava',
        prompt: analysisPrompt,
        images: [base64Image],
        stream: false,
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      description: response.data.response,
      confidence: 0.9, // Ollama doesn't provide confidence scores
      provider: 'Ollama LLaVA',
      processingTime: 0,
      metadata: {
        model: 'llava',
        local: true,
      },
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
          'Content-Type': 'application/octet-stream',
        },
      }
    );

    const caption = Array.isArray(response.data)
      ? response.data[0]?.generated_text
      : response.data.generated_text;

    return {
      description: caption || 'Unable to generate description',
      confidence: 0.8,
      provider: 'Hugging Face BLIP',
      processingTime: 0,
      metadata: {
        model: 'Salesforce/blip-image-captioning-large',
        free: true,
      },
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
          'Content-Type': 'application/octet-stream',
        },
      }
    );

    const description =
      response.data.description?.captions?.[0]?.text || 'No description available';
    const confidence = response.data.description?.captions?.[0]?.confidence || 0.5;

    return {
      description,
      confidence,
      provider: 'Azure Computer Vision',
      processingTime: 0,
      metadata: {
        tags: response.data.tags,
        objects: response.data.objects,
        text: response.data.readResult,
      },
    };
  }

  /**
   * Analyze image with AWS Rekognition Free Tier
   */
  private async analyzeWithAWS(
    imageData: Buffer,
    accessKey: string,
    secretKey: string,
    region: string = 'us-east-1'
  ): Promise<VisionAnalysisResult> {
    // Note: This would require AWS SDK implementation
    // For now, return a placeholder
    throw new Error('AWS Rekognition integration not yet implemented');
  }

  /**
   * Get next available provider using round-robin
   */
  private getNextAvailableProvider(): FreeAPIProvider | null {
    const availableProviders = this.providers.filter((p) => p.isAvailable);
    if (availableProviders.length === 0) return null;

    const provider = availableProviders[this.currentProviderIndex % availableProviders.length];
    this.currentProviderIndex = (this.currentProviderIndex + 1) % availableProviders.length;
    return provider;
  }

  /**
   * Analyze with specific provider
   */
  private async analyzeWithProvider(
    provider: FreeAPIProvider,
    imageData: Buffer,
    prompt?: string
  ): Promise<VisionAnalysisResult> {
    switch (provider.name) {
      case 'Ollama LLaVA':
        return this.analyzeWithOllama(imageData, prompt);
      case 'Google Gemini 2.5 Flash Free':
        return this.analyzeWithGeminiFlash(imageData, prompt);
      case 'OpenRouter Qwen2.5-VL Free':
        return this.analyzeWithOpenRouter(imageData, prompt);
      case 'Groq LLaVA Free':
        return this.analyzeWithGroq(imageData, prompt);
      case 'Together AI Vision Free':
        return this.analyzeWithTogether(imageData, prompt);
      case 'Fireworks AI Vision Free':
        return this.analyzeWithFireworks(imageData, prompt);
      case 'DeepInfra Vision Free':
        return this.analyzeWithDeepInfra(imageData, prompt);
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
   * Analyze image with Google Gemini 2.5 Flash (free tier)
   */
  private async analyzeWithGeminiFlash(
    imageData: Buffer,
    prompt?: string
  ): Promise<VisionAnalysisResult> {
    const base64Image = imageData.toString('base64');
    const analysisPrompt =
      prompt ||
      'Describe what you see in this image in detail. Focus on any text, UI elements, buttons, or interactive components that might be relevant for automation.';

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        contents: [
          {
            parts: [
              { text: analysisPrompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const description =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate description';

    return {
      description,
      confidence: 0.9,
      provider: 'Google Gemini 2.5 Flash Free',
      processingTime: 0,
      metadata: {
        model: 'gemini-2.5-flash',
        free: true,
        tier: 'free',
      },
    };
  }

  /**
   * Analyze image with OpenRouter Qwen2.5-VL (free tier)
   */
  private async analyzeWithOpenRouter(
    imageData: Buffer,
    prompt?: string
  ): Promise<VisionAnalysisResult> {
    const base64Image = imageData.toString('base64');
    const analysisPrompt =
      prompt ||
      'Describe what you see in this image in detail. Focus on any text, UI elements, buttons, or interactive components that might be relevant for automation.';

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'qwen/qwen-2.5-vl-32b-instruct:free',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const description =
      response.data.choices?.[0]?.message?.content || 'Unable to generate description';

    return {
      description,
      confidence: 0.9,
      provider: 'OpenRouter Qwen2.5-VL Free',
      processingTime: 0,
      metadata: {
        model: 'qwen-2.5-vl-32b-instruct',
        free: true,
        tier: 'free',
      },
    };
  }

  /**
   * Analyze image with Groq LLaVA (free tier)
   */
  private async analyzeWithGroq(imageData: Buffer, prompt?: string): Promise<VisionAnalysisResult> {
    const base64Image = imageData.toString('base64');
    const analysisPrompt =
      prompt ||
      'Describe what you see in this image in detail. Focus on any text, UI elements, buttons, or interactive components that might be relevant for automation.';

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llava-v1.5-7b-4096-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const description =
      response.data.choices?.[0]?.message?.content || 'Unable to generate description';

    return {
      description,
      confidence: 0.85,
      provider: 'Groq LLaVA Free',
      processingTime: 0,
      metadata: {
        model: 'llava-v1.5-7b-4096-preview',
        free: true,
        tier: 'free',
      },
    };
  }

  /**
   * Analyze image with Together AI Vision (free tier)
   */
  private async analyzeWithTogether(
    imageData: Buffer,
    prompt?: string
  ): Promise<VisionAnalysisResult> {
    const base64Image = imageData.toString('base64');
    const analysisPrompt =
      prompt ||
      'Describe what you see in this image in detail. Focus on any text, UI elements, buttons, or interactive components that might be relevant for automation.';

    const response = await axios.post(
      'https://api.together.xyz/v1/chat/completions',
      {
        model: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const description =
      response.data.choices?.[0]?.message?.content || 'Unable to generate description';

    return {
      description,
      confidence: 0.85,
      provider: 'Together AI Vision Free',
      processingTime: 0,
      metadata: {
        model: 'Llama-3.2-11B-Vision-Instruct-Turbo',
        free: true,
        tier: 'free',
      },
    };
  }

  /**
   * Analyze image with Fireworks AI Vision (free tier)
   */
  private async analyzeWithFireworks(
    imageData: Buffer,
    prompt?: string
  ): Promise<VisionAnalysisResult> {
    const base64Image = imageData.toString('base64');
    const analysisPrompt =
      prompt ||
      'Describe what you see in this image in detail. Focus on any text, UI elements, buttons, or interactive components that might be relevant for automation.';

    const response = await axios.post(
      'https://api.fireworks.ai/inference/v1/chat/completions',
      {
        model: 'accounts/fireworks/models/llava-v15-13b-fireworks',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const description =
      response.data.choices?.[0]?.message?.content || 'Unable to generate description';

    return {
      description,
      confidence: 0.8,
      provider: 'Fireworks AI Vision Free',
      processingTime: 0,
      metadata: {
        model: 'llava-v15-13b-fireworks',
        free: true,
        tier: 'free',
      },
    };
  }

  /**
   * Analyze image with DeepInfra Vision (free tier)
   */
  private async analyzeWithDeepInfra(
    imageData: Buffer,
    prompt?: string
  ): Promise<VisionAnalysisResult> {
    const base64Image = imageData.toString('base64');
    const analysisPrompt =
      prompt ||
      'Describe what you see in this image in detail. Focus on any text, UI elements, buttons, or interactive components that might be relevant for automation.';

    const response = await axios.post(
      'https://api.deepinfra.com/v1/openai/chat/completions',
      {
        model: 'llava-hf/llava-1.5-7b-hf',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const description =
      response.data.choices?.[0]?.message?.content || 'Unable to generate description';

    return {
      description,
      confidence: 0.8,
      provider: 'DeepInfra Vision Free',
      processingTime: 0,
      metadata: {
        model: 'llava-1.5-7b-hf',
        free: true,
        tier: 'free',
      },
    };
  }

  /**
   * Check which providers are available
   */
  private async checkProviderAvailability(): Promise<void> {
    // Check Ollama
    try {
      await axios.get('http://localhost:11434/api/tags', { timeout: 5000 });
      const ollamaProvider = this.providers.find((p) => p.name === 'Ollama LLaVA');
      if (ollamaProvider) {
        ollamaProvider.isAvailable = true;
      }
    } catch (error) {
      // Ollama not available
    }

    // Check new 2025 free providers (most are always available but may have rate limits)
    const alwaysAvailableProviders = [
      'Google Gemini 2.5 Flash Free',
      'OpenRouter Qwen2.5-VL Free',
      'Groq LLaVA Free',
      'Together AI Vision Free',
      'Fireworks AI Vision Free',
      'DeepInfra Vision Free',
      'Hugging Face Inference API',
    ];

    alwaysAvailableProviders.forEach((providerName) => {
      const provider = this.providers.find((p) => p.name === providerName);
      if (provider) {
        provider.isAvailable = true;
      }
    });

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
    return (
      imageSize <= provider.maxImageSize && provider.supportedFormats.includes(format.toLowerCase())
    );
  }

  /**
   * Get recommended provider for image
   */
  getRecommendedProvider(imageSize: number, format: string): FreeAPIProvider | null {
    const suitableProviders = this.providers.filter(
      (p) => p.isAvailable && this.isImageSupported(p, imageSize, format)
    );

    if (suitableProviders.length === 0) return null;

    // Prefer local providers for privacy and speed
    const localProvider = suitableProviders.find((p) => p.isLocal);
    if (localProvider) return localProvider;

    // Otherwise return first available
    return suitableProviders[0];
  }
}
