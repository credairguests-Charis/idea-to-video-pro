/**
 * LLM Synthesizer Type Definitions
 * 
 * Types for LLM synthesis of competitor research insights
 */

// ============================================================================
// Input Types (from previous steps)
// ============================================================================

export interface FirecrawlCompetitorData {
  competitors: Array<{
    brandName: string;
    websiteUrl: string;
    adCount: number;
    metaAdsUrls: string[];
  }>;
  searchQuery: string;
  timestamp: string;
}

export interface MetaAdData {
  ad_archive_id: string;
  page_name: string;
  media_type: string;
  body_text?: string;
  caption?: string;
  video_url?: string;
  cta_text?: string;
  link_url?: string;
}

export interface VideoIndexerInsights {
  videoId: string;
  videoName: string;
  durationInSeconds: number;
  fullTranscript: string;
  timestampedTranscript: Array<{
    startTime: string;
    endTime: string;
    text: string;
    speakerId?: number;
    speakerName?: string;
  }>;
  scenes: Array<{
    sceneId: number;
    startTime: string;
    endTime: string;
    shots: number;
    keyVisuals: string[];
    dominantEmotion?: string;
    sentiment?: string;
  }>;
  visualContent: {
    labels: string[];
    brands: string[];
    people: string[];
    locations: string[];
  };
  overallSentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  dominantEmotions: string[];
  topics: string[];
  keywords: string[];
}

export interface BrandMemory {
  brandName: string;
  targetAudience: string;
  brandVoice: string;
  productCategory: string;
  keyMessages: string[];
  competitors: string[];
}

// ============================================================================
// Synthesis Input Type
// ============================================================================

export interface SynthesisInput {
  brandMemory: BrandMemory;
  competitorData: FirecrawlCompetitorData;
  metaAds: MetaAdData[];
  videoInsights: VideoIndexerInsights[];
}

// ============================================================================
// Synthesis Output Types
// ============================================================================

export interface AdScriptTimestamp {
  startTime: string;
  endTime: string;
  text: string;
  visualDescription: string;
  emotion: string;
  purpose: string; // "hook", "problem", "solution", "cta", "social_proof"
}

export interface HookAnalysis {
  hookText: string;
  hookType: string; // "question", "shocking_stat", "problem", "promise", "story"
  timestamp: string;
  effectiveness: number; // 1-10
  reason: string;
}

export interface CTAAnalysis {
  ctaText: string;
  ctaType: string; // "direct", "soft", "urgency", "curiosity"
  timestamp: string;
  tone: string;
  effectiveness: number; // 1-10
  reason: string;
}

export interface EditingBreakdown {
  avgShotLength: number;
  totalShots: number;
  pacing: string; // "fast", "medium", "slow"
  transitions: string[];
  visualEffects: string[];
  textOverlays: boolean;
  musicStyle?: string;
  colorGrading?: string;
}

export interface StorytellingStructure {
  structure: string; // "problem-solution", "before-after", "testimonial", "education", "entertainment"
  acts: Array<{
    actNumber: number;
    actName: string;
    startTime: string;
    endTime: string;
    purpose: string;
    keyElements: string[];
  }>;
  emotionalArc: string;
}

export interface ConversionFactors {
  primaryFactor: string;
  factors: Array<{
    factor: string;
    impact: string; // "high", "medium", "low"
    evidence: string;
  }>;
  overallScore: number; // 1-10
}

export interface UGCScriptSuggestion {
  scriptTitle: string;
  targetAudience: string;
  scriptDuration: string; // "15s", "30s", "60s"
  fullScript: string;
  timestampedScript: Array<{
    timing: string;
    visual: string;
    audio: string;
    text: string;
  }>;
  hookSuggestion: string;
  ctaSuggestion: string;
  visualGuidelines: string[];
  editingNotes: string[];
  whyItWorks: string;
  inspiredBy: string; // Which competitor ad
}

// ============================================================================
// Final Synthesis Output
// ============================================================================

export interface SynthesisOutput {
  synthesisId: string;
  brandName: string;
  generatedAt: string;
  
  // Competitor analysis summary
  competitorSummary: {
    totalCompetitors: number;
    totalAdsAnalyzed: number;
    keyTrends: string[];
    commonThemes: string[];
  };
  
  // Individual ad analyses
  adAnalyses: Array<{
    adId: string;
    advertiser: string;
    videoUrl?: string;
    
    // Core analysis
    fullScript: AdScriptTimestamp[];
    hookAnalysis: HookAnalysis;
    ctaAnalysis: CTAAnalysis;
    editingBreakdown: EditingBreakdown;
    storytellingStructure: StorytellingStructure;
    conversionFactors: ConversionFactors;
    
    // Quick insights
    keyTakeaways: string[];
    strengthsWeaknesses: {
      strengths: string[];
      weaknesses: string[];
    };
  }>;
  
  // Brand-specific recommendations
  recommendations: {
    topPerformingPatterns: string[];
    suggestedApproaches: string[];
    avoidPatterns: string[];
  };
  
  // UGC script suggestions
  suggestedScripts: UGCScriptSuggestion[];
  
  // Overall insights
  insights: {
    marketTrends: string[];
    opportunityGaps: string[];
    competitiveAdvantages: string[];
  };
}

// ============================================================================
// LLM Provider Types
// ============================================================================

export type LLMProvider = "lovable-ai" | "openai" | "anthropic";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string; // For direct API calls (not needed for Lovable AI)
  temperature?: number;
  maxTokens?: number;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// Prompt Template Types
// ============================================================================

export interface PromptTemplate {
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  outputFormat: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class SynthesizerError extends Error {
  constructor(
    public code: SynthesizerErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "SynthesizerError";
  }
}

export enum SynthesizerErrorCode {
  LLM_ERROR = "LLM_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  PARSING_ERROR = "PARSING_ERROR",
  TIMEOUT = "TIMEOUT",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

// ============================================================================
// Result Types
// ============================================================================

export interface SynthesisResult {
  success: boolean;
  output?: SynthesisOutput;
  error?: {
    code: SynthesizerErrorCode;
    message: string;
    details?: any;
  };
  duration_ms?: number;
  llmUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
