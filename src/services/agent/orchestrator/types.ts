/**
 * Agent Workflow Orchestrator Types
 * 
 * Defines workflow state, events, and configuration
 */

import { 
  FirecrawlDeepResearchResult,
  CompetitorBrand 
} from "../firecrawl-mcp/types";
import { MetaAdFetchResult } from "../meta-ads/types";
import { VideoIndexerResult } from "../video-indexer/types";
import { SynthesisOutput } from "../llm-synthesizer/types";

// ============================================================================
// Workflow Input
// ============================================================================

export interface WorkflowInput {
  // Brand context
  brandName: string;
  productCategory: string;
  targetAudience: string;
  brandVoice: string;
  keyMessages: string[];
  
  // Research query
  competitorQuery: string;
  maxCompetitors?: number;
  
  // Optional session tracking
  sessionId?: string;
  userId?: string;
}

// ============================================================================
// Workflow Steps
// ============================================================================

export enum WorkflowStep {
  INITIALIZED = "initialized",
  DEEP_RESEARCH = "deep_research",
  META_ADS_EXTRACTION = "meta_ads_extraction",
  VIDEO_ANALYSIS = "video_analysis",
  LLM_SYNTHESIS = "llm_synthesis",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface StepResult {
  step: WorkflowStep;
  status: "running" | "completed" | "failed" | "skipped";
  startTime: Date;
  endTime?: Date;
  duration?: number;
  data?: any;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  retryCount?: number;
}

// ============================================================================
// Workflow State
// ============================================================================

export interface WorkflowState {
  sessionId: string;
  userId: string;
  status: "running" | "completed" | "failed" | "paused";
  currentStep: WorkflowStep;
  progress: number; // 0-100
  
  input: WorkflowInput;
  
  // Step results
  steps: Record<WorkflowStep, StepResult>;
  
  // Intermediate data
  competitorData?: FirecrawlDeepResearchResult;
  metaAdsData?: MetaAdFetchResult[];
  videoInsights?: any[];
  finalSynthesis?: SynthesisOutput;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Error tracking
  errors: Array<{
    step: WorkflowStep;
    message: string;
    timestamp: Date;
  }>;
}

// ============================================================================
// Workflow Events
// ============================================================================

export enum WorkflowEventType {
  WORKFLOW_STARTED = "workflow_started",
  STEP_STARTED = "step_started",
  STEP_PROGRESS = "step_progress",
  STEP_COMPLETED = "step_completed",
  STEP_FAILED = "step_failed",
  STEP_RETRYING = "step_retrying",
  WORKFLOW_COMPLETED = "workflow_completed",
  WORKFLOW_FAILED = "workflow_failed",
}

export interface WorkflowEvent {
  type: WorkflowEventType;
  sessionId: string;
  timestamp: Date;
  step?: WorkflowStep;
  progress?: number;
  data?: any;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

// ============================================================================
// Event Handlers
// ============================================================================

export type WorkflowEventHandler = (event: WorkflowEvent) => void | Promise<void>;

export interface WorkflowEventHandlers {
  onStepStart?: (step: WorkflowStep, state: WorkflowState) => void | Promise<void>;
  onStepComplete?: (step: WorkflowStep, state: WorkflowState) => void | Promise<void>;
  onStepProgress?: (step: WorkflowStep, progress: number, state: WorkflowState) => void | Promise<void>;
  onError?: (step: WorkflowStep, error: Error, state: WorkflowState) => void | Promise<void>;
  onWorkflowComplete?: (state: WorkflowState) => void | Promise<void>;
  onWorkflowFailed?: (error: Error, state: WorkflowState) => void | Promise<void>;
  onEvent?: WorkflowEventHandler;
}

// ============================================================================
// Orchestrator Configuration
// ============================================================================

export interface OrchestratorConfig {
  // API endpoints
  firecrawlEndpoint: string;
  firecrawlBearerToken: string;
  azureVideoIndexerApiKey: string;
  azureVideoIndexerAccountId: string;
  azureVideoIndexerLocation: string;
  llmApiKey: string;
  
  // Retry configuration
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  
  // Timeout configuration
  deepResearchTimeout?: number; // milliseconds
  videoAnalysisTimeout?: number; // milliseconds
  synthesisTimeout?: number; // milliseconds
  
  // Event handlers
  eventHandlers?: WorkflowEventHandlers;
  
  // Enable real-time updates via Supabase
  enableRealtimeUpdates?: boolean;
  supabaseUrl?: string;
  supabaseServiceKey?: string;
}

// ============================================================================
// Workflow Result
// ============================================================================

export interface WorkflowResult {
  success: boolean;
  sessionId: string;
  state: WorkflowState;
  synthesis?: SynthesisOutput;
  error?: {
    message: string;
    step: WorkflowStep;
    details?: any;
  };
  duration: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class WorkflowError extends Error {
  constructor(
    message: string,
    public step: WorkflowStep,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}
