/**
 * Azure Video Indexer Type Definitions
 * 
 * Types for Azure Video Indexer API integration
 */

// ============================================================================
// Authentication Types
// ============================================================================

export interface AzureVideoIndexerConfig {
  apiKey: string;
  accountId: string;
  location: string; // e.g., "trial", "eastus"
}

export interface AccessTokenResponse {
  accessToken: string;
  expiresIn: number;
}

// ============================================================================
// Video Upload Types
// ============================================================================

export interface VideoUploadRequest {
  videoUrl: string;
  videoName: string;
  description?: string;
  privacy?: "Private" | "Public";
  priority?: "Low" | "Normal" | "High";
  language?: string; // ISO 639-1 code (e.g., "en-US")
  indexingPreset?: "Default" | "AudioOnly" | "VideoOnly" | "Advanced";
}

export interface VideoUploadResponse {
  id: string;
  accountId: string;
  name: string;
  description: string;
  created: string;
  lastModified: string;
  lastIndexed: string;
  privacyMode: string;
  state: string;
  moderationState: string;
  reviewState: string;
  processingProgress: string;
}

// ============================================================================
// Video Processing Status Types
// ============================================================================

export type VideoProcessingState = 
  | "Uploaded"
  | "Processing"
  | "Processed"
  | "Failed";

export interface VideoStatus {
  videoId: string;
  state: VideoProcessingState;
  processingProgress: string;
  errorType?: string;
  errorMessage?: string;
}

// ============================================================================
// Video Insights Types
// ============================================================================

export interface VideoInsights {
  id: string;
  name: string;
  accountId: string;
  created: string;
  durationInSeconds: number;
  state: VideoProcessingState;
  
  // Transcript data
  transcript?: Transcript[];
  
  // Speaker data
  speakers?: Speaker[];
  
  // Scene data
  scenes?: Scene[];
  
  // Shot data
  shots?: Shot[];
  
  // Visual content
  labels?: Label[];
  brands?: Brand[];
  namedLocations?: NamedLocation[];
  namedPeople?: NamedPerson[];
  
  // Sentiment data
  sentiments?: Sentiment[];
  
  // Emotions
  emotions?: Emotion[];
  
  // Keywords
  keywords?: Keyword[];
  
  // Topics
  topics?: Topic[];
  
  // Audio effects
  audioEffects?: AudioEffect[];
}

// ============================================================================
// Transcript Types
// ============================================================================

export interface Transcript {
  id: number;
  text: string;
  confidence: number;
  speakerId?: number;
  language: string;
  instances: TimeInstance[];
}

export interface TimeInstance {
  adjustedStart: string; // e.g., "0:00:10.21"
  adjustedEnd: string;
  start: string;
  end: string;
}

// ============================================================================
// Speaker Types
// ============================================================================

export interface Speaker {
  id: number;
  name: string;
  instances: TimeInstance[];
}

// ============================================================================
// Scene Types
// ============================================================================

export interface Scene {
  id: number;
  instances: TimeInstance[];
}

// ============================================================================
// Shot Types
// ============================================================================

export interface Shot {
  id: number;
  tags?: string[];
  keyFrames?: KeyFrame[];
  instances: TimeInstance[];
}

export interface KeyFrame {
  id: number;
  instances: TimeInstance[];
}

// ============================================================================
// Visual Content Types
// ============================================================================

export interface Label {
  id: number;
  name: string;
  language: string;
  instances: TimeInstance[];
}

export interface Brand {
  id: number;
  name: string;
  referenceId?: string;
  referenceUrl?: string;
  description?: string;
  confidence: number;
  instances: TimeInstance[];
}

export interface NamedLocation {
  id: number;
  name: string;
  referenceId?: string;
  referenceUrl?: string;
  confidence: number;
  instances: TimeInstance[];
}

export interface NamedPerson {
  id: number;
  name: string;
  referenceId?: string;
  referenceUrl?: string;
  confidence: number;
  instances: TimeInstance[];
}

// ============================================================================
// Sentiment Types
// ============================================================================

export interface Sentiment {
  id: number;
  sentimentType: "Positive" | "Negative" | "Neutral";
  averageScore: number;
  instances: TimeInstance[];
}

// ============================================================================
// Emotion Types
// ============================================================================

export interface Emotion {
  id: number;
  type: "Joy" | "Sadness" | "Anger" | "Fear" | "Disgust" | "Surprise" | "Neutral";
  instances: TimeInstance[];
}

// ============================================================================
// Keyword Types
// ============================================================================

export interface Keyword {
  id: number;
  text: string;
  confidence: number;
  instances: TimeInstance[];
}

// ============================================================================
// Topic Types
// ============================================================================

export interface Topic {
  id: number;
  name: string;
  referenceId?: string;
  referenceUrl?: string;
  iabName?: string;
  confidence: number;
  instances: TimeInstance[];
}

// ============================================================================
// Audio Effect Types
// ============================================================================

export interface AudioEffect {
  id: number;
  type: string;
  instances: TimeInstance[];
}

// ============================================================================
// Normalized Output Types
// ============================================================================

export interface NormalizedVideoInsights {
  videoId: string;
  videoName: string;
  durationInSeconds: number;
  processingState: VideoProcessingState;
  
  // Full transcript as single text
  fullTranscript: string;
  
  // Timestamped transcript entries
  timestampedTranscript: TimestampedTranscriptEntry[];
  
  // Scene breakdown
  scenes: NormalizedScene[];
  
  // Visual content summary
  visualContent: {
    labels: string[];
    brands: string[];
    people: string[];
    locations: string[];
  };
  
  // Sentiment analysis
  overallSentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  
  // Dominant emotions
  dominantEmotions: string[];
  
  // Key topics
  topics: string[];
  
  // Keywords
  keywords: string[];
}

export interface TimestampedTranscriptEntry {
  startTime: string;
  endTime: string;
  text: string;
  speakerId?: number;
  speakerName?: string;
  confidence: number;
}

export interface NormalizedScene {
  sceneId: number;
  startTime: string;
  endTime: string;
  shots: number;
  keyVisuals: string[];
  dominantEmotion?: string;
  sentiment?: "Positive" | "Negative" | "Neutral";
}

// ============================================================================
// Error Types
// ============================================================================

export class VideoIndexerError extends Error {
  constructor(
    public code: VideoIndexerErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "VideoIndexerError";
  }
}

export enum VideoIndexerErrorCode {
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  UPLOAD_FAILED = "UPLOAD_FAILED",
  PROCESSING_FAILED = "PROCESSING_FAILED",
  TIMEOUT = "TIMEOUT",
  INVALID_VIDEO_URL = "INVALID_VIDEO_URL",
  VIDEO_NOT_FOUND = "VIDEO_NOT_FOUND",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

// ============================================================================
// Result Types
// ============================================================================

export interface VideoIndexerResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: VideoIndexerErrorCode;
    message: string;
    details?: any;
  };
  duration_ms?: number;
}
