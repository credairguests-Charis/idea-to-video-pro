import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// Orchestrator Implementation (Embedded)
// ============================================================================

interface WorkflowInput {
  brandName: string;
  productCategory: string;
  targetAudience: string;
  brandVoice: string;
  keyMessages: string[];
  competitorQuery: string;
  maxCompetitors?: number;
  sessionId?: string;
  userId?: string;
}

enum WorkflowStep {
  INITIALIZED = "initialized",
  DEEP_RESEARCH = "deep_research",
  META_ADS_EXTRACTION = "meta_ads_extraction",
  VIDEO_ANALYSIS = "video_analysis",
  LLM_SYNTHESIS = "llm_synthesis",
  COMPLETED = "completed",
  FAILED = "failed",
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { input, sessionId: providedSessionId } = await req.json();

    console.log("[agent-workflow] Received workflow request:", {
      brandName: input.brandName,
      query: input.competitorQuery,
    });

    // Generate or use provided session ID
    const sessionId =
      providedSessionId ||
      `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create agent session
    const { data: session, error: sessionError } = await supabase
      .from("agent_sessions")
      .insert({
        id: sessionId,
        user_id: input.userId || "anonymous",
        state: "running",
        current_step: WorkflowStep.INITIALIZED,
        progress: 0,
        metadata: {
          input,
          startTime: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (sessionError) {
      console.error("[agent-workflow] Failed to create session:", sessionError);
      throw sessionError;
    }

    console.log("[agent-workflow] Created session:", sessionId);

    // Helper function to update session
    const updateSession = async (
      step: WorkflowStep,
      progress: number,
      metadata?: any
    ) => {
      await supabase
        .from("agent_sessions")
        .update({
          current_step: step,
          progress,
          updated_at: new Date().toISOString(),
          metadata: {
            ...session.metadata,
            ...metadata,
          },
        })
        .eq("id", sessionId);
    };

    // Helper function to log execution
    const logExecution = async (
      stepName: string,
      toolName: string,
      status: string,
      inputData?: any,
      outputData?: any,
      errorMessage?: string,
      duration?: number
    ) => {
      await supabase.from("agent_execution_logs").insert({
        session_id: sessionId,
        step_name: stepName,
        tool_name: toolName,
        status,
        input_data: inputData,
        output_data: outputData,
        error_message: errorMessage,
        duration_ms: duration,
      });
    };

    try {
      // ======================================================================
      // Step 1: Deep Research (Firecrawl MCP)
      // ======================================================================
      console.log("[agent-workflow] Step 1: Deep Research");
      await updateSession(WorkflowStep.DEEP_RESEARCH, 10);
      await logExecution(
        WorkflowStep.DEEP_RESEARCH,
        "firecrawl_mcp",
        "running",
        { query: input.competitorQuery }
      );

      const deepResearchStart = Date.now();
      const { data: deepResearchData, error: deepResearchError } =
        await supabase.functions.invoke("mcp-firecrawl-tool", {
          body: {
            query: input.competitorQuery,
            max_results: input.maxCompetitors || 5,
            session_id: sessionId,
          },
        });

      const deepResearchDuration = Date.now() - deepResearchStart;

      if (deepResearchError || !deepResearchData?.success) {
        throw new Error(
          deepResearchError?.message ||
            deepResearchData?.error ||
            "Deep research failed"
        );
      }

      await logExecution(
        WorkflowStep.DEEP_RESEARCH,
        "firecrawl_mcp",
        "completed",
        { query: input.competitorQuery },
        deepResearchData,
        undefined,
        deepResearchDuration
      );

      console.log(
        `[agent-workflow] Found ${deepResearchData.competitors?.length || 0} competitors`
      );

      // ======================================================================
      // Step 2: Meta Ads Extraction
      // ======================================================================
      console.log("[agent-workflow] Step 2: Meta Ads Extraction");
      await updateSession(WorkflowStep.META_ADS_EXTRACTION, 35);

      const metaAdsStart = Date.now();
      const metaAdsResults = [];

      for (const competitor of deepResearchData.competitors || []) {
        if (competitor.metaAdsUrl) {
          try {
            await logExecution(
              WorkflowStep.META_ADS_EXTRACTION,
              "meta_ads_extractor",
              "running",
              { url: competitor.metaAdsUrl }
            );

            const { data: adData, error: adError } = await supabase.functions.invoke(
              "meta-ads-extractor",
              {
                body: { url: competitor.metaAdsUrl, session_id: sessionId },
              }
            );

            if (!adError && adData?.success) {
              metaAdsResults.push(adData);
              await logExecution(
                WorkflowStep.META_ADS_EXTRACTION,
                "meta_ads_extractor",
                "completed",
                { url: competitor.metaAdsUrl },
                adData
              );
            }
          } catch (error) {
            console.warn(
              `[agent-workflow] Failed to fetch ads for ${competitor.name}:`,
              error
            );
          }
        }
      }

      const metaAdsDuration = Date.now() - metaAdsStart;
      console.log(`[agent-workflow] Extracted ${metaAdsResults.length} Meta ads`);

      // ======================================================================
      // Step 3: Video Analysis (Azure Video Indexer)
      // ======================================================================
      console.log("[agent-workflow] Step 3: Video Analysis");
      await updateSession(WorkflowStep.VIDEO_ANALYSIS, 60);

      const videoAnalysisStart = Date.now();
      const videoInsights = [];

      for (const adResult of metaAdsResults) {
        if (adResult.creative?.videoUrl) {
          try {
            await logExecution(
              WorkflowStep.VIDEO_ANALYSIS,
              "azure_video_indexer",
              "running",
              {
                videoUrl: adResult.creative.videoUrl,
                adId: adResult.creative.ad_archive_id,
              }
            );

            const { data: videoData, error: videoError } =
              await supabase.functions.invoke("azure-video-analyzer", {
                body: {
                  videoUrl: adResult.creative.videoUrl,
                  videoName: `ad_${adResult.creative.ad_archive_id}`,
                  sessionId,
                  waitForCompletion: true,
                },
              });

            if (!videoError && videoData?.success) {
              videoInsights.push({
                adId: adResult.creative.ad_archive_id,
                videoUrl: adResult.creative.videoUrl,
                insights: videoData.insights,
              });

              await logExecution(
                WorkflowStep.VIDEO_ANALYSIS,
                "azure_video_indexer",
                "completed",
                {
                  videoUrl: adResult.creative.videoUrl,
                  adId: adResult.creative.ad_archive_id,
                },
                videoData
              );
            }
          } catch (error) {
            console.warn(
              `[agent-workflow] Failed to analyze video for ad ${adResult.creative.ad_archive_id}:`,
              error
            );
          }
        }
      }

      const videoAnalysisDuration = Date.now() - videoAnalysisStart;
      console.log(`[agent-workflow] Analyzed ${videoInsights.length} videos`);

      // ======================================================================
      // Step 4: LLM Synthesis
      // ======================================================================
      console.log("[agent-workflow] Step 4: LLM Synthesis");
      await updateSession(WorkflowStep.LLM_SYNTHESIS, 85);
      await logExecution(
        WorkflowStep.LLM_SYNTHESIS,
        "llm_synthesizer",
        "running",
        {
          competitorsCount: deepResearchData.competitors?.length || 0,
          adsCount: metaAdsResults.length,
          videosCount: videoInsights.length,
        }
      );

      const synthesisStart = Date.now();
      const { data: synthesisData, error: synthesisError } =
        await supabase.functions.invoke("llm-synthesis-engine", {
          body: {
            brandMemory: {
              brandName: input.brandName,
              productCategory: input.productCategory,
              targetAudience: input.targetAudience,
              brandVoice: input.brandVoice,
              keyMessages: input.keyMessages,
            },
            competitorData: {
              searchQuery: input.competitorQuery,
              competitors: deepResearchData.competitors || [],
            },
            metaAds: metaAdsResults.map((r) => r.creative),
            videoInsights,
            session_id: sessionId,
          },
        });

      const synthesisDuration = Date.now() - synthesisStart;

      if (synthesisError || !synthesisData?.success) {
        throw new Error(
          synthesisError?.message ||
            synthesisData?.error ||
            "Synthesis failed"
        );
      }

      await logExecution(
        WorkflowStep.LLM_SYNTHESIS,
        "llm_synthesizer",
        "completed",
        undefined,
        synthesisData.output,
        undefined,
        synthesisDuration
      );

      console.log("[agent-workflow] Synthesis complete");

      // ======================================================================
      // Complete Workflow
      // ======================================================================
      await updateSession(WorkflowStep.COMPLETED, 100, {
        completedAt: new Date().toISOString(),
        synthesis: synthesisData.output,
      });

      await supabase
        .from("agent_sessions")
        .update({
          state: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      console.log("[agent-workflow] Workflow completed successfully");

      return new Response(
        JSON.stringify({
          success: true,
          sessionId,
          synthesis: synthesisData.output,
          metadata: {
            competitorsFound: deepResearchData.competitors?.length || 0,
            adsExtracted: metaAdsResults.length,
            videosAnalyzed: videoInsights.length,
            totalDuration:
              deepResearchDuration +
              metaAdsDuration +
              videoAnalysisDuration +
              synthesisDuration,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("[agent-workflow] Workflow failed:", error);

      await updateSession(WorkflowStep.FAILED, 0, {
        error: error.message,
        failedAt: new Date().toISOString(),
      });

      await supabase
        .from("agent_sessions")
        .update({
          state: "failed",
        })
        .eq("id", sessionId);

      throw error;
    }
  } catch (error) {
    console.error("[agent-workflow] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
