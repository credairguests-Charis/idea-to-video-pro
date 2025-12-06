import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// Types
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
  attachedUrls?: { url: string; title?: string }[];
}

enum WorkflowStep {
  INITIALIZED = "initialized",
  DEEP_RESEARCH = "deep_research",
  META_ADS_SCRAPING = "meta_ads_scraping",
  VIDEO_DOWNLOAD = "video_download",
  VIDEO_ANALYSIS = "video_analysis",
  LLM_SYNTHESIS = "llm_synthesis",
  COMPLETED = "completed",
  FAILED = "failed",
}

// Tool icons for UI display
const TOOL_ICONS = {
  firecrawl: "🔥",
  meta_ads: "📱",
  video_download: "📥",
  azure_video: "📹",
  llm: "🧠",
  completed: "✅",
  failed: "❌",
};

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

    const requestBody = await req.json();
    const { input, sessionId: providedSessionId } = requestBody;

    // Validate input
    if (!input || typeof input !== "object") {
      throw new Error("Invalid input: input object is required");
    }
    if (!input.brandName || typeof input.brandName !== "string") {
      throw new Error("Invalid input: brandName is required");
    }
    if (!input.competitorQuery || typeof input.competitorQuery !== "string") {
      throw new Error("Invalid input: competitorQuery is required");
    }

    console.log("[agent-workflow] Starting workflow:", {
      brandName: input.brandName,
      query: input.competitorQuery,
      maxCompetitors: input.maxCompetitors || 5,
    });

    // Generate session ID
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

    // Helper: Update session
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
          metadata: { ...session.metadata, ...metadata },
        })
        .eq("id", sessionId);
    };

    // Helper: Log execution with enhanced fields for real-time UI
    const logExecution = async (
      stepName: string,
      toolName: string,
      status: string,
      options: {
        toolIcon?: string;
        progressPercent?: number;
        subStep?: string;
        inputData?: any;
        outputData?: any;
        errorMessage?: string;
        duration?: number;
      } = {}
    ) => {
      const {
        toolIcon,
        progressPercent,
        subStep,
        inputData,
        outputData,
        errorMessage,
        duration,
      } = options;

      await supabase.from("agent_execution_logs").insert({
        session_id: sessionId,
        step_name: stepName,
        tool_name: toolName,
        status,
        input_data: {
          ...inputData,
          tool_icon: toolIcon,
          progress_percent: progressPercent,
          sub_step: subStep,
        },
        output_data: outputData,
        error_message: errorMessage,
        duration_ms: duration,
      });
    };

    try {
      // ======================================================================
      // Step 1: Deep Research (Firecrawl MCP via Klavis)
      // ======================================================================
      console.log("[agent-workflow] Step 1: Deep Research");
      await updateSession(WorkflowStep.DEEP_RESEARCH, 5);
      await logExecution("Deep Research", "firecrawl_mcp", "running", {
        toolIcon: TOOL_ICONS.firecrawl,
        progressPercent: 5,
        subStep: "Initiating competitor research",
        inputData: { query: input.competitorQuery },
      });

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
        const errorMsg =
          deepResearchError?.message ||
          deepResearchData?.error ||
          "Deep research failed";
        await logExecution("Deep Research", "firecrawl_mcp", "failed", {
          toolIcon: TOOL_ICONS.failed,
          errorMessage: errorMsg,
          duration: deepResearchDuration,
        });
        throw new Error(errorMsg);
      }

      const competitors = deepResearchData.competitors || [];
      await logExecution("Deep Research", "firecrawl_mcp", "completed", {
        toolIcon: TOOL_ICONS.completed,
        progressPercent: 20,
        subStep: `Found ${competitors.length} competitors`,
        outputData: { competitors_found: competitors.length },
        duration: deepResearchDuration,
      });

      console.log(`[agent-workflow] Found ${competitors.length} competitors`);

      // ======================================================================
      // Step 2: Meta Ads Scraping (Firecrawl)
      // ======================================================================
      console.log("[agent-workflow] Step 2: Meta Ads Scraping");
      await updateSession(WorkflowStep.META_ADS_SCRAPING, 25);
      await logExecution("Meta Ads Scraping", "firecrawl_meta_ads", "running", {
        toolIcon: TOOL_ICONS.meta_ads,
        progressPercent: 25,
        subStep: "Scraping Meta Ads Library pages",
      });

      const metaAdsStart = Date.now();
      const metaAdsResults: any[] = [];

      // Collect all Meta Ads Library URLs
      const metaAdsUrls: string[] = [];
      
      // Add URLs from attached URLs (direct user input)
      if (input.attachedUrls && Array.isArray(input.attachedUrls)) {
        for (const attached of input.attachedUrls) {
          if (attached.url && attached.url.includes("facebook.com/ads/library")) {
            metaAdsUrls.push(attached.url);
          }
        }
      }
      
      // Add URLs from competitor research
      for (const competitor of competitors) {
        if (competitor.meta_ads_library_url) {
          metaAdsUrls.push(competitor.meta_ads_library_url);
        }
      }

      if (metaAdsUrls.length > 0) {
        try {
          const { data: scrapedAds, error: scrapeError } =
            await supabase.functions.invoke("firecrawl-meta-ads-scraper", {
              body: {
                urls: metaAdsUrls,
                sessionId,
              },
            });

          if (!scrapeError && scrapedAds?.success) {
            metaAdsResults.push(...(scrapedAds.ads || []));
          }
        } catch (error) {
          console.warn("[agent-workflow] Meta ads scraping failed:", error);
        }
      }

      const metaAdsDuration = Date.now() - metaAdsStart;
      await logExecution("Meta Ads Scraping", "firecrawl_meta_ads", "completed", {
        toolIcon: TOOL_ICONS.completed,
        progressPercent: 40,
        subStep: `Extracted ${metaAdsResults.length} ad creatives`,
        outputData: {
          total_ads: metaAdsResults.length,
          video_ads: metaAdsResults.filter((a) => a.media_type === "video").length,
        },
        duration: metaAdsDuration,
      });

      console.log(`[agent-workflow] Extracted ${metaAdsResults.length} Meta ads`);

      // ======================================================================
      // Step 3: Video Download (if video ads found)
      // ======================================================================
      const videoAds = metaAdsResults.filter(
        (a) => a.media_type === "video" && a.video_url
      );

      let downloadedVideos: any[] = [];

      if (videoAds.length > 0) {
        console.log("[agent-workflow] Step 3: Video Download");
        await updateSession(WorkflowStep.VIDEO_DOWNLOAD, 45);
        await logExecution("Video Download", "video_download_service", "running", {
          toolIcon: TOOL_ICONS.video_download,
          progressPercent: 45,
          subStep: `Downloading ${videoAds.length} videos`,
        });

        const downloadStart = Date.now();
        const videoUrls = videoAds.map((a) => a.video_url).slice(0, 5); // Max 5 videos

        try {
          const { data: downloadResult, error: downloadError } =
            await supabase.functions.invoke("video-download-service", {
              body: {
                videoUrls,
                sessionId,
              },
            });

          if (!downloadError && downloadResult?.success) {
            downloadedVideos = downloadResult.results.filter(
              (r: any) => r.success
            );
          }
        } catch (error) {
          console.warn("[agent-workflow] Video download failed:", error);
        }

        const downloadDuration = Date.now() - downloadStart;
        await logExecution("Video Download", "video_download_service", "completed", {
          toolIcon: TOOL_ICONS.completed,
          progressPercent: 55,
          subStep: `Downloaded ${downloadedVideos.length}/${videoAds.length} videos`,
          outputData: { videos_downloaded: downloadedVideos.length },
          duration: downloadDuration,
        });

        console.log(`[agent-workflow] Downloaded ${downloadedVideos.length} videos`);
      }

      // ======================================================================
      // Step 4: Video Analysis (Azure Video Indexer)
      // ======================================================================
      console.log("[agent-workflow] Step 4: Video Analysis");
      await updateSession(WorkflowStep.VIDEO_ANALYSIS, 60);

      const videoAnalysisStart = Date.now();
      const videoInsights: any[] = [];

      // Process videos in parallel (max 3 concurrent)
      const videosToAnalyze = downloadedVideos.slice(0, 3);
      
      if (videosToAnalyze.length > 0) {
        await logExecution("Video Analysis", "azure_video_indexer", "running", {
          toolIcon: TOOL_ICONS.azure_video,
          progressPercent: 60,
          subStep: `Analyzing ${videosToAnalyze.length} videos with Azure AI`,
        });

        const analysisPromises = videosToAnalyze.map(async (video, index) => {
          try {
            const videoUrl = video.publicUrl || video.originalUrl;
            const videoName = `ad_video_${index}_${Date.now()}`;

            const { data: videoData, error: videoError } =
              await supabase.functions.invoke("azure-video-analyzer", {
                body: {
                  videoUrl,
                  videoName,
                  sessionId,
                  waitForCompletion: true,
                },
              });

            if (!videoError && videoData?.success) {
              return {
                videoUrl: video.originalUrl,
                videoName,
                ...videoData.insights,
              };
            }
            return null;
          } catch (error) {
            console.warn(`[agent-workflow] Video ${index} analysis failed:`, error);
            return null;
          }
        });

        const results = await Promise.all(analysisPromises);
        videoInsights.push(...results.filter((r) => r !== null));
      }

      const videoAnalysisDuration = Date.now() - videoAnalysisStart;
      await logExecution("Video Analysis", "azure_video_indexer", "completed", {
        toolIcon: TOOL_ICONS.completed,
        progressPercent: 80,
        subStep: `Analyzed ${videoInsights.length} videos`,
        outputData: {
          videos_analyzed: videoInsights.length,
          transcripts_extracted: videoInsights.filter((v) => v.fullTranscript).length,
        },
        duration: videoAnalysisDuration,
      });

      console.log(`[agent-workflow] Analyzed ${videoInsights.length} videos`);

      // ======================================================================
      // Step 5: LLM Synthesis
      // ======================================================================
      console.log("[agent-workflow] Step 5: LLM Synthesis");
      await updateSession(WorkflowStep.LLM_SYNTHESIS, 85);
      await logExecution("LLM Synthesis", "llm_synthesizer", "running", {
        toolIcon: TOOL_ICONS.llm,
        progressPercent: 85,
        subStep: "Generating comprehensive analysis and UGC scripts",
        inputData: {
          competitorsCount: competitors.length,
          adsCount: metaAdsResults.length,
          videosCount: videoInsights.length,
        },
      });

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
              competitors,
            },
            metaAds: metaAdsResults,
            videoInsights,
            session_id: sessionId,
          },
        });

      const synthesisDuration = Date.now() - synthesisStart;

      if (synthesisError || !synthesisData?.success) {
        const errorMsg =
          synthesisError?.message || synthesisData?.error || "Synthesis failed";
        await logExecution("LLM Synthesis", "llm_synthesizer", "failed", {
          toolIcon: TOOL_ICONS.failed,
          errorMessage: errorMsg,
          duration: synthesisDuration,
        });
        throw new Error(errorMsg);
      }

      await logExecution("LLM Synthesis", "llm_synthesizer", "completed", {
        toolIcon: TOOL_ICONS.completed,
        progressPercent: 100,
        subStep: "Analysis complete",
        outputData: {
          ad_analyses: synthesisData.synthesis?.adAnalyses?.length || 0,
          scripts_generated: synthesisData.synthesis?.suggestedScripts?.length || 0,
        },
        duration: synthesisDuration,
      });

      console.log("[agent-workflow] Synthesis complete");

      // ======================================================================
      // Complete Workflow
      // ======================================================================
      await updateSession(WorkflowStep.COMPLETED, 100, {
        completedAt: new Date().toISOString(),
        synthesis: synthesisData.synthesis,
      });

      await supabase
        .from("agent_sessions")
        .update({
          state: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      const totalDuration =
        deepResearchDuration +
        metaAdsDuration +
        videoAnalysisDuration +
        synthesisDuration;

      console.log(
        `[agent-workflow] Workflow completed in ${totalDuration}ms`
      );

      return new Response(
        JSON.stringify({
          success: true,
          sessionId,
          synthesis: synthesisData.synthesis,
          metadata: {
            competitorsFound: competitors.length,
            adsExtracted: metaAdsResults.length,
            videosDownloaded: downloadedVideos.length,
            videosAnalyzed: videoInsights.length,
            scriptsGenerated: synthesisData.synthesis?.suggestedScripts?.length || 0,
            totalDuration,
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
        .update({ state: "failed" })
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
