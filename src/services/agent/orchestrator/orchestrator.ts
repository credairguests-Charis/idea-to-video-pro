/**
 * Agent Workflow Orchestrator
 * 
 * Coordinates all MCP tools into a complete autonomous pipeline
 */

import { FirecrawlMCPToolHandler } from "../firecrawl-mcp/tool-handler";
import { MetaAdFetcher } from "../meta-ads/fetcher";
import { AzureVideoIndexerClient } from "../video-indexer/client";
import { CompetitorAdSynthesizer } from "../llm-synthesizer/synthesizer";
import {
  WorkflowInput,
  WorkflowState,
  WorkflowStep,
  WorkflowEvent,
  WorkflowEventType,
  WorkflowResult,
  OrchestratorConfig,
  WorkflowError,
  StepResult,
} from "./types";

export class AgentWorkflowOrchestrator {
  private config: OrchestratorConfig;
  private state: WorkflowState | null = null;
  private eventQueue: WorkflowEvent[] = [];

  constructor(config: OrchestratorConfig) {
    this.config = {
      maxRetries: 2,
      retryDelay: 3000,
      deepResearchTimeout: 120000, // 2 minutes
      videoAnalysisTimeout: 300000, // 5 minutes
      synthesisTimeout: 60000, // 1 minute
      enableRealtimeUpdates: true,
      ...config,
    };
  }

  /**
   * Execute the full workflow
   */
  async execute(input: WorkflowInput): Promise<WorkflowResult> {
    const startTime = Date.now();

    try {
      // Initialize state
      this.state = this.initializeState(input);
      await this.emitEvent(WorkflowEventType.WORKFLOW_STARTED, {
        progress: 0,
      });

      console.log("[Orchestrator] Starting workflow:", this.state.sessionId);

      // Step 1: Deep Research
      await this.executeStep(
        WorkflowStep.DEEP_RESEARCH,
        () => this.performDeepResearch(),
        15
      );

      // Step 2: Meta Ads Extraction
      await this.executeStep(
        WorkflowStep.META_ADS_EXTRACTION,
        () => this.extractMetaAds(),
        35
      );

      // Step 3: Video Analysis
      await this.executeStep(
        WorkflowStep.VIDEO_ANALYSIS,
        () => this.analyzeVideos(),
        65
      );

      // Step 4: LLM Synthesis
      await this.executeStep(
        WorkflowStep.LLM_SYNTHESIS,
        () => this.synthesizeInsights(),
        95
      );

      // Complete workflow
      this.state.status = "completed";
      this.state.currentStep = WorkflowStep.COMPLETED;
      this.state.progress = 100;
      this.state.completedAt = new Date();

      await this.emitEvent(WorkflowEventType.WORKFLOW_COMPLETED, {
        progress: 100,
        data: this.state.finalSynthesis,
      });

      if (this.config.eventHandlers?.onWorkflowComplete) {
        await this.config.eventHandlers.onWorkflowComplete(this.state);
      }

      const duration = Date.now() - startTime;

      console.log(`[Orchestrator] Workflow completed in ${duration}ms`);

      return {
        success: true,
        sessionId: this.state.sessionId,
        state: this.state,
        synthesis: this.state.finalSynthesis,
        duration,
      };
    } catch (error) {
      console.error("[Orchestrator] Workflow failed:", error);

      if (this.state) {
        this.state.status = "failed";
        this.state.currentStep = WorkflowStep.FAILED;
      }

      await this.emitEvent(WorkflowEventType.WORKFLOW_FAILED, {
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          code: error instanceof WorkflowError ? error.code : undefined,
          details: error instanceof WorkflowError ? error.details : undefined,
        },
      });

      if (this.config.eventHandlers?.onWorkflowFailed && this.state) {
        await this.config.eventHandlers.onWorkflowFailed(
          error instanceof Error ? error : new Error(String(error)),
          this.state
        );
      }

      const duration = Date.now() - startTime;

      return {
        success: false,
        sessionId: this.state?.sessionId || "unknown",
        state: this.state!,
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          step: error instanceof WorkflowError ? error.step : WorkflowStep.FAILED,
          details: error instanceof WorkflowError ? error.details : undefined,
        },
        duration,
      };
    }
  }

  /**
   * Execute a single step with retry logic
   */
  private async executeStep<T>(
    step: WorkflowStep,
    executor: () => Promise<T>,
    progressPercent: number
  ): Promise<T> {
    if (!this.state) throw new Error("State not initialized");

    console.log(`[Orchestrator] Starting step: ${step}`);

    this.state.currentStep = step;
    this.state.progress = progressPercent;

    const stepResult: StepResult = {
      step,
      status: "running",
      startTime: new Date(),
      retryCount: 0,
    };

    this.state.steps[step] = stepResult;

    await this.emitEvent(WorkflowEventType.STEP_STARTED, {
      step,
      progress: progressPercent,
    });

    if (this.config.eventHandlers?.onStepStart) {
      await this.config.eventHandlers.onStepStart(step, this.state);
    }

    let lastError: Error | null = null;

    for (
      let attempt = 0;
      attempt <= (this.config.maxRetries || 0);
      attempt++
    ) {
      try {
        if (attempt > 0) {
          console.log(`[Orchestrator] Retrying step ${step}, attempt ${attempt + 1}`);
          stepResult.retryCount = attempt;

          await this.emitEvent(WorkflowEventType.STEP_RETRYING, {
            step,
            data: { attempt: attempt + 1 },
          });

          await this.delay(this.config.retryDelay || 3000);
        }

        const result = await executor();

        stepResult.status = "completed";
        stepResult.endTime = new Date();
        stepResult.duration =
          stepResult.endTime.getTime() - stepResult.startTime.getTime();
        stepResult.data = result;

        await this.emitEvent(WorkflowEventType.STEP_COMPLETED, {
          step,
          progress: progressPercent,
          data: result,
        });

        if (this.config.eventHandlers?.onStepComplete) {
          await this.config.eventHandlers.onStepComplete(step, this.state);
        }

        console.log(`[Orchestrator] Step ${step} completed in ${stepResult.duration}ms`);

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(
          `[Orchestrator] Step ${step} failed (attempt ${attempt + 1}):`,
          lastError
        );

        if (attempt === this.config.maxRetries) {
          break;
        }
      }
    }

    // All retries exhausted
    stepResult.status = "failed";
    stepResult.endTime = new Date();
    stepResult.duration =
      stepResult.endTime.getTime() - stepResult.startTime.getTime();
    stepResult.error = {
      message: lastError?.message || "Unknown error",
      details: lastError,
    };

    this.state.errors.push({
      step,
      message: lastError?.message || "Unknown error",
      timestamp: new Date(),
    });

    await this.emitEvent(WorkflowEventType.STEP_FAILED, {
      step,
      error: {
        message: lastError?.message || "Unknown error",
        details: lastError,
      },
    });

    if (this.config.eventHandlers?.onError) {
      await this.config.eventHandlers.onError(
        step,
        lastError!,
        this.state
      );
    }

    throw new WorkflowError(
      `Step ${step} failed after ${this.config.maxRetries} retries: ${lastError?.message}`,
      step,
      "STEP_FAILED",
      lastError
    );
  }

  /**
   * Step 1: Perform deep research using Firecrawl MCP
   */
  private async performDeepResearch() {
    console.log("[Orchestrator] Executing deep research");

    const firecrawlHandler = new FirecrawlMCPToolHandler(
      this.config.firecrawlEndpoint,
      this.config.firecrawlBearerToken
    );

    const result = await firecrawlHandler.executeDeepResearch({
      query: this.state!.input.competitorQuery,
      max_results: this.state!.input.maxCompetitors || 5,
    });

    if (!result.success || !result.data) {
      throw new WorkflowError(
        result.error?.message || "Deep research failed",
        WorkflowStep.DEEP_RESEARCH,
        result.error?.code
      );
    }

    this.state!.competitorData = result.data;
    console.log(
      `[Orchestrator] Found ${result.data.competitors.length} competitors`
    );

    return result.data;
  }

  /**
   * Step 2: Extract Meta ads from competitors
   */
  private async extractMetaAds() {
    console.log("[Orchestrator] Extracting Meta ads");

    if (!this.state!.competitorData) {
      throw new WorkflowError(
        "No competitor data available",
        WorkflowStep.META_ADS_EXTRACTION
      );
    }

    const metaAdFetcher = new MetaAdFetcher();
    const allAds: any[] = [];

    for (const competitor of this.state!.competitorData.competitors) {
      if (competitor.meta_ads_library_url) {
        try {
          const result = await metaAdFetcher.fetchAdCreative(
            competitor.meta_ads_library_url
          );
          if (result.success && result.creative) {
            allAds.push(result);
          }
        } catch (error) {
          console.warn(
            `[Orchestrator] Failed to fetch ads for ${competitor.brand_name}:`,
            error
          );
        }
      }
    }

    this.state!.metaAdsData = allAds;
    console.log(`[Orchestrator] Extracted ${allAds.length} Meta ads`);

    return allAds;
  }

  /**
   * Step 3: Analyze videos using Azure Video Indexer
   */
  private async analyzeVideos() {
    console.log("[Orchestrator] Analyzing videos");

    if (!this.state!.metaAdsData || this.state!.metaAdsData.length === 0) {
      throw new WorkflowError(
        "No Meta ads data available",
        WorkflowStep.VIDEO_ANALYSIS
      );
    }

    const videoClient = new AzureVideoIndexerClient({
      apiKey: this.config.azureVideoIndexerApiKey,
      accountId: this.config.azureVideoIndexerAccountId,
      location: this.config.azureVideoIndexerLocation,
    });

    const videoInsights: any[] = [];

    for (const ad of this.state!.metaAdsData) {
      if (ad.creative?.video_url) {
        try {
          const uploadResult = await videoClient.uploadVideo({
            videoUrl: ad.creative.video_url,
            videoName: `ad_${ad.creative.ad_archive_id}`,
            privacy: "Private",
          });

          if (!uploadResult.success || !uploadResult.data?.id) {
            throw new Error("Video upload failed");
          }

          const videoId = uploadResult.data.id;

          const insights = await videoClient.waitForProcessing(videoId, {
            maxWaitTime: this.config.videoAnalysisTimeout,
            pollInterval: 10000,
          });

          videoInsights.push({
            adId: ad.creative.ad_archive_id,
            videoUrl: ad.creative.video_url,
            insights: insights.data,
          });
        } catch (error) {
          console.warn(
            `[Orchestrator] Failed to analyze video for ad ${ad.creative.ad_archive_id}:`,
            error
          );
        }
      }
    }

    this.state!.videoInsights = videoInsights;
    console.log(`[Orchestrator] Analyzed ${videoInsights.length} videos`);

    return videoInsights;
  }

  /**
   * Step 4: Synthesize insights using LLM
   */
  private async synthesizeInsights() {
    console.log("[Orchestrator] Synthesizing insights");

    if (!this.state!.competitorData) {
      throw new WorkflowError(
        "No competitor data available",
        WorkflowStep.LLM_SYNTHESIS
      );
    }

    if (!this.state!.metaAdsData || this.state!.metaAdsData.length === 0) {
      throw new WorkflowError("No Meta ads data available", WorkflowStep.LLM_SYNTHESIS);
    }

    if (!this.state!.videoInsights || this.state!.videoInsights.length === 0) {
      throw new WorkflowError(
        "No video insights available",
        WorkflowStep.LLM_SYNTHESIS
      );
    }

    const synthesizer = new CompetitorAdSynthesizer({
      provider: "lovable-ai", // Use Lovable AI
      apiKey: this.config.llmApiKey,
      model: "default",
      temperature: 0.7,
      maxTokens: 4096,
    });

    const synthesisInput = {
      brandMemory: {
        brandName: this.state!.input.brandName,
        productCategory: this.state!.input.productCategory,
        targetAudience: this.state!.input.targetAudience,
        brandVoice: this.state!.input.brandVoice,
        keyMessages: this.state!.input.keyMessages,
        competitors: this.state!.competitorData.competitors.map(c => c.brand_name),
      },
      competitorData: {
        competitors: this.state!.competitorData.competitors.map(c => ({
          brandName: c.brand_name,
          websiteUrl: c.meta_ads_library_url,
          adCount: c.video_ads.length,
          metaAdsUrls: [c.meta_ads_library_url],
        })),
        searchQuery: this.state!.competitorData.query,
        timestamp: this.state!.competitorData.timestamp,
      },
      metaAds: this.state!.metaAdsData.map((ad) => ({
        ad_archive_id: ad.creative.ad_archive_id,
        page_name: ad.creative.page_name,
        media_type: ad.creative.media_type,
        body_text: ad.creative.body_text,
        caption: ad.creative.caption,
        video_url: ad.creative.video_url,
        cta_text: ad.creative.cta_text,
        link_url: ad.creative.link_url,
      })),
      videoInsights: this.state!.videoInsights.map((v: any) => v.insights),
    };

    const result = await synthesizer.synthesize(synthesisInput);

    if (!result.success || !result.output) {
      throw new WorkflowError(
        result.error?.message || "Synthesis failed",
        WorkflowStep.LLM_SYNTHESIS,
        result.error?.code
      );
    }

    this.state!.finalSynthesis = result.output;
    console.log("[Orchestrator] Synthesis complete");

    return result.output;
  }

  /**
   * Initialize workflow state
   */
  private initializeState(input: WorkflowInput): WorkflowState {
    const sessionId = input.sessionId || this.generateSessionId();

    return {
      sessionId,
      userId: input.userId || "anonymous",
      status: "running",
      currentStep: WorkflowStep.INITIALIZED,
      progress: 0,
      input,
      steps: {} as Record<WorkflowStep, StepResult>,
      createdAt: new Date(),
      updatedAt: new Date(),
      errors: [],
    };
  }

  /**
   * Emit workflow event
   */
  private async emitEvent(
    type: WorkflowEventType,
    data?: Partial<WorkflowEvent>
  ) {
    if (!this.state) return;

    const event: WorkflowEvent = {
      type,
      sessionId: this.state.sessionId,
      timestamp: new Date(),
      step: this.state.currentStep,
      progress: this.state.progress,
      ...data,
    };

    this.eventQueue.push(event);

    // Call custom event handler
    if (this.config.eventHandlers?.onEvent) {
      await this.config.eventHandlers.onEvent(event);
    }

    console.log(`[Orchestrator] Event: ${type}`, event);
  }

  /**
   * Get current state
   */
  getState(): WorkflowState | null {
    return this.state;
  }

  /**
   * Get event queue
   */
  getEvents(): WorkflowEvent[] {
    return [...this.eventQueue];
  }

  /**
   * Helper: Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
