import * as fs from 'fs';
import * as log from 'electron-log';
import { FrameInfo } from './VideoProcessingModule';

export interface VisionService {
  name: string;
  setApiKey(key: string): void;
  analyzeFrame(frameBuffer: Buffer): Promise<FrameAnalysis>;
}

export interface FrameAnalysis {
  frameIndex: number;
  timestamp: number;
  elements: UIElement[];
  cursor?: CursorInfo;
  text?: string[];
  actions?: DetectedAction[];
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

export interface APIKeyConfig {
  service: 'openai' | 'google';
  key: string;
  enabled: boolean;
}

export class VisionAnalysisModule {
  private apiKeys: APIKeyConfig[] = [];
  private currentKeyIndex: number = 0;
  private visionServices: Map<string, VisionService> = new Map();

  constructor() {
    log.info('VisionAnalysisModule initialized');
    this.initializeServices();
  }

  private initializeServices(): void {
    // Initialize vision services (stubs for now)
    this.visionServices.set('openai', new OpenAIVisionService());
    this.visionServices.set('google', new GoogleVisionService());
  }

  public setAPIKeys(keys: APIKeyConfig[]): void {
    this.apiKeys = keys.filter(key => key.enabled && key.key.trim() !== '');
    this.currentKeyIndex = 0;

    // Configure services with API keys
    this.apiKeys.forEach(keyConfig => {
      const service = this.visionServices.get(keyConfig.service);
      if (service) {
        service.setApiKey(keyConfig.key);
      }
    });

    log.info(`Configured ${this.apiKeys.length} API keys`);
  }

  public async analyzeFrames(frames: FrameInfo[]): Promise<FrameAnalysis[]> {
    try {
      log.info(`Starting analysis of ${frames.length} frames`);
      
      if (this.apiKeys.length === 0) {
        throw new Error('No API keys configured for vision analysis');
      }

      const results: FrameAnalysis[] = [];
      
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        log.debug(`Analyzing frame ${i + 1}/${frames.length}: ${frame.path}`);
        
        try {
          const frameBuffer = fs.readFileSync(frame.path);
          const analysis = await this.analyzeFrame(frameBuffer, frame);
          results.push(analysis);
          
          // Add small delay to avoid rate limiting
          await this.delay(100);
          
        } catch (error) {
          log.error(`Error analyzing frame ${i}:`, error);
          
          // Try rotating API key if we hit rate limits
          if (this.isRateLimitError(error)) {
            this.rotateAPIKey();
            // Retry the frame
            i--;
            continue;
          }
          
          // Create a fallback analysis for failed frames
          results.push(this.createFallbackAnalysis(frame));
        }
      }

      log.info(`Completed analysis of ${results.length} frames`);
      return results;

    } catch (error) {
      log.error('Error in frame analysis:', error);
      throw error;
    }
  }

  private async analyzeFrame(frameBuffer: Buffer, frameInfo: FrameInfo): Promise<FrameAnalysis> {
    const currentKey = this.getCurrentAPIKey();
    const service = this.visionServices.get(currentKey.service);
    
    if (!service) {
      throw new Error(`Vision service ${currentKey.service} not available`);
    }

    try {
      const analysis = await service.analyzeFrame(frameBuffer);
      analysis.frameIndex = frameInfo.index;
      analysis.timestamp = frameInfo.timestamp;
      
      return analysis;
    } catch (error) {
      log.error('Vision service error:', error);
      throw error;
    }
  }

  private getCurrentAPIKey(): APIKeyConfig {
    if (this.apiKeys.length === 0) {
      throw new Error('No API keys available');
    }
    return this.apiKeys[this.currentKeyIndex];
  }

  private rotateAPIKey(): void {
    if (this.apiKeys.length > 1) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      log.info(`Rotated to API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
    }
  }

  private isRateLimitError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    return errorMessage.includes('rate limit') || 
           errorMessage.includes('quota') || 
           errorMessage.includes('429');
  }

  private createFallbackAnalysis(frameInfo: FrameInfo): FrameAnalysis {
    return {
      frameIndex: frameInfo.index,
      timestamp: frameInfo.timestamp,
      elements: [],
      text: [],
      actions: []
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Real implementations for vision services
class OpenAIVisionService implements VisionService {
  name = 'OpenAI GPT-4V';
  private apiKey: string = '';

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async analyzeFrame(frameBuffer: Buffer): Promise<FrameAnalysis> {
    try {
      const base64Image = frameBuffer.toString('base64');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this screenshot and identify UI elements, cursor position, and any user actions. Return a JSON object with:
                  - elements: array of UI elements with type, bounds (x,y,width,height), text, and confidence
                  - cursor: object with x, y, visible, and type
                  - text: array of visible text strings
                  - actions: array of detected actions with type and confidence

                  UI element types: button, input, dropdown, window, menu, text, image, other
                  Cursor types: arrow, hand, text, wait
                  Action types: click, type, scroll, drag, key_press`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000
        })
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
        actions: analysis.actions || []
      };

    } catch (error) {
      log.error('OpenAI vision analysis error:', error);
      throw error;
    }
  }
}

class GoogleVisionService implements VisionService {
  name = 'Google Vision API';
  private apiKey: string = '';

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async analyzeFrame(frameBuffer: Buffer): Promise<FrameAnalysis> {
    try {
      const base64Image = frameBuffer.toString('base64');

      // Use Google Vision API for text detection and object detection
      const textResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image
              },
              features: [
                { type: 'TEXT_DETECTION', maxResults: 50 },
                { type: 'OBJECT_LOCALIZATION', maxResults: 50 }
              ]
            }
          ]
        })
      });

      if (!textResponse.ok) {
        throw new Error(`Google Vision API error: ${textResponse.status} ${textResponse.statusText}`);
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
            width: Math.max(...vertices.map((v: any) => v.x || 0)) - Math.min(...vertices.map((v: any) => v.x || 0)),
            height: Math.max(...vertices.map((v: any) => v.y || 0)) - Math.min(...vertices.map((v: any) => v.y || 0))
          };

          elements.push({
            type: 'text',
            bounds,
            text: annotation.description,
            confidence: 0.9
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
            height: Math.round((vertices[2].y - vertices[0].y) * 1080)
          };

          let elementType: UIElement['type'] = 'other';
          if (obj.name.toLowerCase().includes('button')) elementType = 'button';
          else if (obj.name.toLowerCase().includes('window')) elementType = 'window';
          else if (obj.name.toLowerCase().includes('menu')) elementType = 'menu';

          elements.push({
            type: elementType,
            bounds,
            text: obj.name,
            confidence: obj.score
          });
        });
      }

      return {
        frameIndex: 0,
        timestamp: 0,
        elements,
        cursor: { x: 0, y: 0, visible: false }, // Google Vision doesn't detect cursor
        text: textStrings,
        actions: [] // Google Vision doesn't detect actions directly
      };

    } catch (error) {
      log.error('Google vision analysis error:', error);
      throw error;
    }
  }
}
