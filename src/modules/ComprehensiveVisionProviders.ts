/**
 * Comprehensive AI Vision Providers Configuration (2025 Edition)
 * Complete ecosystem of free, freemium, and premium vision APIs
 */

export interface VisionProvider {
  id: string;
  name: string;
  category: 'completely_free' | 'free_trial' | 'freemium' | 'premium_optional' | 'specialized';
  tier: 'local' | 'free_cloud' | 'free_credits' | 'freemium' | 'premium';
  endpoint: string;
  region: 'global' | 'us' | 'eu' | 'asia' | 'china';
  isLocal: boolean;
  isAvailable: boolean;

  // Capacity and limits
  dailyLimit?: number;
  monthlyLimit?: number;
  freeCredits?: number;
  creditValue?: number; // USD value of free credits

  // Technical specs
  maxImageSize: number;
  supportedFormats: string[];
  maxConcurrentRequests: number;
  avgResponseTime: number; // milliseconds

  // Quality and features
  qualityScore: number; // 1-10
  supportsOCR: boolean;
  supportsObjectDetection: boolean;
  supportsSceneAnalysis: boolean;
  supportsUIAnalysis: boolean;
  supportsDocumentAnalysis: boolean;

  // Pricing (for premium tiers)
  costPerRequest?: number; // USD
  costPer1000Requests?: number; // USD

  // Configuration
  requiresApiKey: boolean;
  requiresCreditCard: boolean;
  setupComplexity: 'none' | 'easy' | 'medium' | 'complex';

  // Dynamic Model Support (NEW)
  supportedModels?: string[]; // Available models for this provider
  defaultModel?: string; // Default model to use
  customModelSupport?: boolean; // Whether provider supports custom model names
  modelValidationEndpoint?: string; // Endpoint to validate model availability

  // Metadata
  description: string;
  strengths: string[];
  limitations: string[];
  bestUseCases: string[];
  addedDate: string;
}

// New interface for model configuration
export interface ModelConfiguration {
  providerId: string;
  modelName: string;
  displayName: string;
  isCustom: boolean;
  isValidated: boolean;
  lastValidated?: Date;
  validationError?: string;
  performance?: {
    qualityScore: number;
    avgResponseTime: number;
    costPerRequest?: number;
  };
}

export const COMPREHENSIVE_VISION_PROVIDERS: VisionProvider[] = [
  // ===== TIER 1: COMPLETELY FREE (NO LIMITS) =====
  {
    id: 'ollama_llava',
    name: 'Ollama LLaVA',
    category: 'completely_free',
    tier: 'local',
    endpoint: 'http://localhost:11434/api/generate',
    region: 'global',
    isLocal: true,
    isAvailable: false,
    maxImageSize: 20 * 1024 * 1024,
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    maxConcurrentRequests: 4,
    avgResponseTime: 2500,
    qualityScore: 8.5,
    supportsOCR: true,
    supportsObjectDetection: true,
    supportsSceneAnalysis: true,
    supportsUIAnalysis: true,
    supportsDocumentAnalysis: true,
    requiresApiKey: false,
    requiresCreditCard: false,
    setupComplexity: 'medium',
    description: 'Local unlimited vision analysis with complete privacy',
    strengths: ['Unlimited usage', 'Complete privacy', 'No internet required', 'High quality'],
    limitations: ['Requires local installation', 'Uses system resources'],
    bestUseCases: ['Privacy-sensitive analysis', 'High-volume processing', 'Offline usage'],
    addedDate: '2024-01-01',
  },

  // ===== TIER 2: FREE CLOUD (HIGH LIMITS) =====
  {
    id: 'gemini_flash_free',
    name: 'Google Gemini 2.5 Flash Free',
    category: 'completely_free',
    tier: 'free_cloud',
    endpoint:
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    region: 'global',
    isLocal: false,
    isAvailable: true,
    dailyLimit: 500,
    monthlyLimit: 15000,
    maxImageSize: 20 * 1024 * 1024,
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    maxConcurrentRequests: 10,
    avgResponseTime: 1800,
    qualityScore: 9.2,
    supportsOCR: true,
    supportsObjectDetection: true,
    supportsSceneAnalysis: true,
    supportsUIAnalysis: true,
    supportsDocumentAnalysis: true,
    requiresApiKey: false,
    requiresCreditCard: false,
    setupComplexity: 'none',
    description: 'State-of-the-art vision model with generous free tier',
    strengths: ['Excellent quality', 'High daily limits', 'Fast processing', 'No setup required'],
    limitations: ['Daily rate limits', 'Requires internet'],
    bestUseCases: ['High-quality analysis', 'Complex scene understanding', 'Document processing'],
    addedDate: '2025-01-01',
  },

  {
    id: 'openrouter_qwen_free',
    name: 'OpenRouter Qwen2.5-VL Free',
    category: 'completely_free',
    tier: 'free_cloud',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    region: 'global',
    isLocal: false,
    isAvailable: true,
    dailyLimit: 100,
    monthlyLimit: 3000,
    maxImageSize: 10 * 1024 * 1024,
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    maxConcurrentRequests: 5,
    avgResponseTime: 2100,
    qualityScore: 9.0,
    supportsOCR: true,
    supportsObjectDetection: true,
    supportsSceneAnalysis: true,
    supportsUIAnalysis: true,
    supportsDocumentAnalysis: true,
    requiresApiKey: false,
    requiresCreditCard: false,
    setupComplexity: 'none',
    // Dynamic Model Support
    supportedModels: [
      'qwen/qwen-2.5-vl-32b-instruct:free',
      'qwen/qwen-2.5-vl-7b-instruct:free',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-haiku',
      'google/gemini-2.0-flash-exp',
      'meta-llama/llama-3.2-90b-vision-instruct',
      'microsoft/phi-3.5-vision-instruct',
    ],
    defaultModel: 'qwen/qwen-2.5-vl-32b-instruct:free',
    customModelSupport: true,
    modelValidationEndpoint: 'https://openrouter.ai/api/v1/models',
    description: 'Advanced Qwen2.5-VL model with excellent reasoning and custom model support',
    strengths: [
      'Advanced reasoning',
      'Excellent for UI analysis',
      'High accuracy',
      'Custom model support',
      'Multiple model options',
    ],
    limitations: ['Lower daily limits', 'Slower than Groq', 'Some models require API key'],
    bestUseCases: [
      'UI analysis',
      'Complex reasoning tasks',
      'Document understanding',
      'Model experimentation',
    ],
    addedDate: '2025-01-01',
  },

  {
    id: 'groq_llava_free',
    name: 'Groq LLaVA Free',
    category: 'completely_free',
    tier: 'free_cloud',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    region: 'global',
    isLocal: false,
    isAvailable: true,
    dailyLimit: 100,
    monthlyLimit: 3000,
    maxImageSize: 8 * 1024 * 1024,
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    maxConcurrentRequests: 8,
    avgResponseTime: 800,
    qualityScore: 7.8,
    supportsOCR: true,
    supportsObjectDetection: true,
    supportsSceneAnalysis: true,
    supportsUIAnalysis: true,
    supportsDocumentAnalysis: false,
    requiresApiKey: false,
    requiresCreditCard: false,
    setupComplexity: 'none',
    description: 'Ultra-fast vision analysis with sub-second response times',
    strengths: ['Ultra-fast inference', 'Low latency', 'Good quality'],
    limitations: ['Smaller image size limit', 'Limited document analysis'],
    bestUseCases: ['Real-time analysis', 'Speed-critical applications', 'Interactive demos'],
    addedDate: '2025-01-01',
  },

  // ===== TIER 3: FREE CREDITS (MONTHLY ALLOWANCE) =====
  {
    id: 'together_ai_free',
    name: 'Together AI Vision Free',
    category: 'free_trial',
    tier: 'free_credits',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    region: 'global',
    isLocal: false,
    isAvailable: true,
    freeCredits: 5,
    creditValue: 5,
    monthlyLimit: 200,
    maxImageSize: 10 * 1024 * 1024,
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    maxConcurrentRequests: 5,
    avgResponseTime: 2000,
    qualityScore: 8.2,
    supportsOCR: true,
    supportsObjectDetection: true,
    supportsSceneAnalysis: true,
    supportsUIAnalysis: true,
    supportsDocumentAnalysis: true,
    requiresApiKey: false,
    requiresCreditCard: false,
    setupComplexity: 'easy',
    description: 'Llama 3.2 Vision model with monthly free credits',
    strengths: ['Latest Meta model', 'Good monthly allowance', 'High quality'],
    limitations: ['Monthly credit limit', 'Requires account'],
    bestUseCases: ['High-quality analysis', 'Meta model preference', 'Monthly usage'],
    addedDate: '2025-01-01',
  },

  {
    id: 'deepinfra_free',
    name: 'DeepInfra Vision Free',
    category: 'free_trial',
    tier: 'free_credits',
    endpoint: 'https://api.deepinfra.com/v1/openai/chat/completions',
    region: 'global',
    isLocal: false,
    isAvailable: true,
    freeCredits: 5,
    creditValue: 5,
    monthlyLimit: 500,
    maxImageSize: 10 * 1024 * 1024,
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    maxConcurrentRequests: 3,
    avgResponseTime: 1500,
    qualityScore: 7.5,
    supportsOCR: true,
    supportsObjectDetection: true,
    supportsSceneAnalysis: true,
    supportsUIAnalysis: true,
    supportsDocumentAnalysis: false,
    requiresApiKey: false,
    requiresCreditCard: false,
    setupComplexity: 'easy',
    description: 'Cost-effective vision analysis with multiple model options',
    strengths: ['Cost-effective', 'Multiple models', 'Good value'],
    limitations: ['Lower quality than premium', 'Credit-based'],
    bestUseCases: ['Cost-conscious analysis', 'Bulk processing', 'Testing'],
    addedDate: '2025-01-01',
  },

  {
    id: 'fireworks_ai_free',
    name: 'Fireworks AI Vision Free',
    category: 'free_trial',
    tier: 'free_credits',
    endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
    region: 'global',
    isLocal: false,
    isAvailable: true,
    freeCredits: 1,
    creditValue: 1,
    monthlyLimit: 50,
    maxImageSize: 8 * 1024 * 1024,
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    maxConcurrentRequests: 2,
    avgResponseTime: 1700,
    qualityScore: 7.8,
    supportsOCR: true,
    supportsObjectDetection: true,
    supportsSceneAnalysis: true,
    supportsUIAnalysis: true,
    supportsDocumentAnalysis: false,
    requiresApiKey: false,
    requiresCreditCard: false,
    setupComplexity: 'easy',
    description: 'Enterprise-grade infrastructure with free tier',
    strengths: ['Enterprise reliability', 'Fast inference', 'Good quality'],
    limitations: ['Limited free credits', 'Lower monthly allowance'],
    bestUseCases: ['Enterprise testing', 'Reliable processing', 'Quality analysis'],
    addedDate: '2025-01-01',
  },

  // ===== TIER 4: FREEMIUM (FREE + PAID OPTIONS) =====
  {
    id: 'huggingface_inference',
    name: 'Hugging Face Inference API',
    category: 'freemium',
    tier: 'freemium',
    endpoint: 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large',
    region: 'global',
    isLocal: false,
    isAvailable: true,
    dailyLimit: 1000,
    maxImageSize: 5 * 1024 * 1024,
    supportedFormats: ['jpg', 'jpeg', 'png'],
    maxConcurrentRequests: 2,
    avgResponseTime: 3200,
    qualityScore: 6.5,
    supportsOCR: false,
    supportsObjectDetection: false,
    supportsSceneAnalysis: true,
    supportsUIAnalysis: false,
    supportsDocumentAnalysis: false,
    requiresApiKey: false,
    requiresCreditCard: false,
    setupComplexity: 'none',
    description: 'BLIP image captioning with rate-limited free tier',
    strengths: ['Always available', 'No setup required', 'Reliable fallback'],
    limitations: ['Basic captioning only', 'Rate limited', 'Lower quality'],
    bestUseCases: ['Basic image description', 'Fallback option', 'Simple analysis'],
    addedDate: '2024-01-01',
  },

  {
    id: 'replicate_free',
    name: 'Replicate Vision Models',
    category: 'freemium',
    tier: 'freemium',
    endpoint: 'https://api.replicate.com/v1/predictions',
    region: 'global',
    isLocal: false,
    isAvailable: true,
    freeCredits: 0.1,
    creditValue: 0.1,
    monthlyLimit: 10,
    maxImageSize: 10 * 1024 * 1024,
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    maxConcurrentRequests: 1,
    avgResponseTime: 4000,
    qualityScore: 8.0,
    supportsOCR: true,
    supportsObjectDetection: true,
    supportsSceneAnalysis: true,
    supportsUIAnalysis: true,
    supportsDocumentAnalysis: true,
    costPerRequest: 0.01,
    costPer1000Requests: 10,
    requiresApiKey: true,
    requiresCreditCard: true,
    setupComplexity: 'medium',
    description: 'Access to various open-source vision models',
    strengths: ['Multiple model options', 'Open-source models', 'Flexible'],
    limitations: ['Very limited free tier', 'Requires credit card', 'Slower'],
    bestUseCases: ['Model experimentation', 'Specific model requirements', 'Research'],
    addedDate: '2025-01-01',
  },

  // ===== TIER 5: PREMIUM OPTIONAL (HIGH QUALITY PAID) =====
  {
    id: 'openai_gpt4o',
    name: 'OpenAI GPT-4o Vision',
    category: 'premium_optional',
    tier: 'premium',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    region: 'global',
    isLocal: false,
    isAvailable: true,
    maxImageSize: 20 * 1024 * 1024,
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    maxConcurrentRequests: 20,
    avgResponseTime: 2500,
    qualityScore: 9.5,
    supportsOCR: true,
    supportsObjectDetection: true,
    supportsSceneAnalysis: true,
    supportsUIAnalysis: true,
    supportsDocumentAnalysis: true,
    costPerRequest: 0.015,
    costPer1000Requests: 15,
    requiresApiKey: true,
    requiresCreditCard: true,
    setupComplexity: 'easy',
    // Dynamic Model Support
    supportedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-vision-preview'],
    defaultModel: 'gpt-4o',
    customModelSupport: true,
    modelValidationEndpoint: 'https://api.openai.com/v1/models',
    description: 'Premium OpenAI vision model with excellent quality and custom model support',
    strengths: [
      'Excellent quality',
      'Fast processing',
      'Comprehensive analysis',
      'Reliable',
      'Multiple model options',
    ],
    limitations: ['Paid only', 'Requires API key', 'Higher cost'],
    bestUseCases: [
      'Professional analysis',
      'High-quality requirements',
      'Production use',
      'Model experimentation',
    ],
    addedDate: '2025-01-01',
  },

  {
    id: 'anthropic_claude_sonnet',
    name: 'Anthropic Claude 3.5 Sonnet Vision',
    category: 'premium_optional',
    tier: 'premium',
    endpoint: 'https://api.anthropic.com/v1/messages',
    region: 'global',
    isLocal: false,
    isAvailable: true,
    maxImageSize: 100 * 1024 * 1024,
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    maxConcurrentRequests: 15,
    avgResponseTime: 3000,
    qualityScore: 9.7,
    supportsOCR: true,
    supportsObjectDetection: true,
    supportsSceneAnalysis: true,
    supportsUIAnalysis: true,
    supportsDocumentAnalysis: true,
    costPerRequest: 0.018,
    costPer1000Requests: 18,
    requiresApiKey: true,
    requiresCreditCard: true,
    setupComplexity: 'easy',
    description: 'Premium Anthropic vision model with exceptional reasoning',
    strengths: [
      'Exceptional reasoning',
      'Large image support',
      'Detailed analysis',
      'Safety-focused',
    ],
    limitations: ['Paid only', 'Higher cost', 'Slower than GPT-4o'],
    bestUseCases: ['Complex reasoning', 'Large documents', 'Safety-critical analysis', 'Research'],
    addedDate: '2025-01-01',
  },

  {
    id: 'google_gemini_pro',
    name: 'Google Gemini 2.5 Pro Vision',
    category: 'premium_optional',
    tier: 'premium',
    endpoint:
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
    region: 'global',
    isLocal: false,
    isAvailable: true,
    maxImageSize: 20 * 1024 * 1024,
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    maxConcurrentRequests: 25,
    avgResponseTime: 2200,
    qualityScore: 9.6,
    supportsOCR: true,
    supportsObjectDetection: true,
    supportsSceneAnalysis: true,
    supportsUIAnalysis: true,
    supportsDocumentAnalysis: true,
    costPerRequest: 0.012,
    costPer1000Requests: 12,
    requiresApiKey: true,
    requiresCreditCard: true,
    setupComplexity: 'easy',
    description: 'Premium Google vision model with excellent performance',
    strengths: ['Excellent quality', 'Fast processing', 'Good value', 'Multimodal'],
    limitations: ['Paid only', 'Requires API key'],
    bestUseCases: ['Production applications', 'High-volume processing', 'Cost-effective premium'],
    addedDate: '2025-01-01',
  },

  // ===== TIER 6: SPECIALIZED PROVIDERS =====
  {
    id: 'azure_document_intelligence',
    name: 'Azure Document Intelligence',
    category: 'specialized',
    tier: 'freemium',
    endpoint:
      'https://api.cognitive.microsoft.com/formrecognizer/documentModels/prebuilt-layout:analyze',
    region: 'global',
    isLocal: false,
    isAvailable: true,
    monthlyLimit: 500,
    maxImageSize: 50 * 1024 * 1024,
    supportedFormats: ['jpg', 'jpeg', 'png', 'pdf', 'tiff'],
    maxConcurrentRequests: 5,
    avgResponseTime: 5000,
    qualityScore: 9.0,
    supportsOCR: true,
    supportsObjectDetection: false,
    supportsSceneAnalysis: false,
    supportsUIAnalysis: false,
    supportsDocumentAnalysis: true,
    costPerRequest: 0.01,
    costPer1000Requests: 10,
    requiresApiKey: true,
    requiresCreditCard: false,
    setupComplexity: 'medium',
    description: 'Specialized document analysis and OCR service',
    strengths: ['Excellent OCR', 'Document structure analysis', 'PDF support', 'Free tier'],
    limitations: ['Document-focused only', 'Slower processing', 'Complex setup'],
    bestUseCases: ['Document analysis', 'OCR extraction', 'Form processing', 'PDF analysis'],
    addedDate: '2025-01-01',
  },

  {
    id: 'aws_textract',
    name: 'AWS Textract',
    category: 'specialized',
    tier: 'freemium',
    endpoint: 'https://textract.us-east-1.amazonaws.com/',
    region: 'global',
    isLocal: false,
    isAvailable: true,
    monthlyLimit: 1000,
    maxImageSize: 10 * 1024 * 1024,
    supportedFormats: ['jpg', 'jpeg', 'png', 'pdf'],
    maxConcurrentRequests: 3,
    avgResponseTime: 4000,
    qualityScore: 8.8,
    supportsOCR: true,
    supportsObjectDetection: false,
    supportsSceneAnalysis: false,
    supportsUIAnalysis: false,
    supportsDocumentAnalysis: true,
    costPerRequest: 0.015,
    costPer1000Requests: 15,
    requiresApiKey: true,
    requiresCreditCard: false,
    setupComplexity: 'complex',
    description: 'AWS specialized text extraction and document analysis',
    strengths: ['Excellent text extraction', 'Table detection', 'Form analysis', 'AWS integration'],
    limitations: ['Text-focused only', 'Complex AWS setup', 'Higher cost'],
    bestUseCases: ['Text extraction', 'Table analysis', 'Form processing', 'AWS environments'],
    addedDate: '2025-01-01',
  },
];

export const PROVIDER_CATEGORIES = {
  completely_free: 'Completely Free',
  free_trial: 'Free Trial/Credits',
  freemium: 'Freemium',
  premium_optional: 'Premium Optional',
  specialized: 'Specialized',
} as const;

export const PROVIDER_TIERS = {
  local: 'Local Unlimited',
  free_cloud: 'Free Cloud',
  free_credits: 'Free Credits',
  freemium: 'Freemium',
  premium: 'Premium',
} as const;

export const PROVIDER_REGIONS = {
  global: 'Global',
  us: 'United States',
  eu: 'Europe',
  asia: 'Asia',
  china: 'China',
} as const;
