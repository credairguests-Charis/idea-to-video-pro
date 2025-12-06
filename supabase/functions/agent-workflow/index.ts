import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool icons for visual feedback
const TOOL_ICONS: Record<string, string> = {
  firecrawl: "🔥",
  "meta-ads": "📱",
  azure: "📹",
  llm: "🧠",
  download: "⬇️",
  workflow: "⚙️",
};

interface WorkflowInput {
  brandName: string;
  productCategory: string;
  targetAudience: string;
  brandVoice: string;
  keyMessages: string[];
  competitorQuery: string;
  maxCompetitors?: number;
  userId: string;
  attachedUrls?: { url: string; title?: string }[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("[AGENT-WORKFLOW] Missing Supabase credentials");
    return new Response(
      JSON.stringify({ success: false, error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  let sessionId: string | null = null;

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("[AGENT-WORKFLOW] Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const input: WorkflowInput = body.input;

    if (!input || !input.userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required input or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AGENT-WORKFLOW] Starting workflow for user: ${input.userId}`);
    console.log(`[AGENT-WORKFLOW] Brand: ${input.brandName}, Query: ${input.competitorQuery}`);

    // Generate session ID
    sessionId = crypto.randomUUID();

    // Helper function to log execution steps - ONLY uses valid status values: started, completed, failed, skipped
    const logExecution = async (
      stepName: string,
      status: string,
      toolName: string | null,
      inputData: any = null,
      outputData: any = null,
      errorMessage: string | null = null,
      durationMs: number | null = null,
      progressPercent: number | null = null,
      toolIcon: string | null = null,
      subStep: string | null = null
    ) => {
      try {
        // Map invalid status values to valid ones
        const validStatus = status === "running" || status === "in_progress" ? "started" :
                           status === "warning" || status === "error" ? "failed" :
                           ["started", "completed", "failed", "skipped"].includes(status) ? status : "started";
        
        await supabase.from("agent_execution_logs").insert({
          session_id: sessionId,
          step_name: stepName,
          status: validStatus,
          tool_name: toolName,
          input_data: { 
            ...inputData, 
            progress_percent: progressPercent,
            tool_icon: toolIcon || (toolName ? TOOL_ICONS[toolName] : null),
            sub_step: subStep
          },
          output_data: outputData,
          error_message: errorMessage,
          duration_ms: durationMs,
        });
      } catch (logError) {
        console.error(`[AGENT-WORKFLOW] Failed to log step ${stepName}:`, logError);
      }
    };

    // Helper to update session
    const updateSession = async (state: string, progress: number, currentStep: string | null = null, metadata: any = null) => {
      try {
        const updateData: any = { state, progress, updated_at: new Date().toISOString() };
        if (currentStep) updateData.current_step = currentStep;
        if (metadata) updateData.metadata = metadata;
        
        await supabase
          .from("agent_sessions")
          .update(updateData)
          .eq("id", sessionId);
      } catch (updateError) {
        console.error(`[AGENT-WORKFLOW] Failed to update session:`, updateError);
      }
    };

    // Create session first with valid state value
    const { error: sessionError } = await supabase.from("agent_sessions").insert({
      id: sessionId,
      user_id: input.userId,
      state: "idle", // Use valid state - will be updated by updateSession
      progress: 0,
      current_step: "initializing",
    });

    if (sessionError) {
      console.error(`[AGENT-WORKFLOW] Failed to create session:`, sessionError);
      // Session might already exist, try to update it instead
      const { error: updateError } = await supabase.from("agent_sessions")
        .update({ 
          state: "idle", 
          progress: 0, 
          current_step: "initializing",
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId);
      
      if (updateError) {
        console.warn(`[AGENT-WORKFLOW] Also failed to update session:`, updateError);
      }
    }

    // Log workflow start immediately for real-time feedback
    await logExecution(
      "Workflow Starting",
      "started",
      "workflow",
      { query: input.competitorQuery, brand: input.brandName },
      null,
      null,
      null,
      5,
      TOOL_ICONS.workflow,
      "Initializing agent..."
    );

    // ============ STEP 1: Deep Research with Firecrawl MCP ============
    let competitors: any[] = [];
    const step1Start = Date.now();

    await logExecution(
      "Deep Research",
      "started",
      "firecrawl",
      { query: input.competitorQuery },
      null,
      null,
      null,
      10,
      TOOL_ICONS.firecrawl,
      "Searching for competitors..."
    );

    try {
      console.log(`[AGENT-WORKFLOW] Step 1: Deep Research`);
      await updateSession("idle", 10, "deep_research");

      const { data: mcpResult, error: mcpError } = await supabase.functions.invoke("mcp-firecrawl-tool", {
        body: {
          query: `${input.competitorQuery} ${input.productCategory} competitors meta ads`,
          max_results: input.maxCompetitors || 3,
          session_id: sessionId,
        },
      });

      if (mcpError) {
        console.warn(`[AGENT-WORKFLOW] MCP Firecrawl error (continuing with fallback):`, mcpError);
      } else if (mcpResult?.competitors) {
        competitors = mcpResult.competitors;
      }

      // If no competitors found, use fallback
      if (competitors.length === 0) {
        competitors = [
          {
            name: `${input.brandName} Competitor`,
            website: `https://example.com`,
            meta_ads_library_url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(input.competitorQuery)}`,
          },
        ];
      }

      await logExecution(
        "Deep Research",
        "completed",
        "firecrawl",
        { query: input.competitorQuery },
        { competitorsFound: competitors.length, competitors },
        null,
        Date.now() - step1Start,
        25,
        TOOL_ICONS.firecrawl,
        `Found ${competitors.length} competitors`
      );
    } catch (step1Error) {
      console.error(`[AGENT-WORKFLOW] Step 1 error:`, step1Error);
      await logExecution(
        "Deep Research",
        "failed",
        "firecrawl",
        { query: input.competitorQuery },
        null,
        `Research failed, using fallback: ${step1Error instanceof Error ? step1Error.message : "Unknown error"}`,
        Date.now() - step1Start,
        25,
        TOOL_ICONS.firecrawl
      );
      // Continue with fallback competitors
      competitors = [{ 
        name: input.brandName, 
        meta_ads_library_url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(input.competitorQuery)}`
      }];
    }

    // ============ STEP 2: Scrape Meta Ads ============
    let allAds: any[] = [];
    const step2Start = Date.now();

    await logExecution(
      "Meta Ads Extraction",
      "started",
      "meta-ads",
      { competitorCount: competitors.length },
      null,
      null,
      null,
      30,
      TOOL_ICONS["meta-ads"],
      "Extracting ad creatives..."
    );

    try {
      console.log(`[AGENT-WORKFLOW] Step 2: Scrape Meta Ads`);
      await updateSession("idle", 30, "meta_ads_scraping");

      // Collect all Meta Ads Library URLs
      const metaAdsUrls: string[] = [];
      
      // Add URLs from attached URLs (direct user input)
      if (input.attachedUrls && Array.isArray(input.attachedUrls)) {
        for (const attached of input.attachedUrls) {
          if (attached.url && attached.url.includes("facebook.com")) {
            metaAdsUrls.push(attached.url);
          }
        }
      }
      
      // Add URLs from competitor research
      for (const comp of competitors) {
        const url = comp.meta_ads_library_url || comp.metaAdsUrl;
        if (url && url.includes("facebook.com")) {
          metaAdsUrls.push(url);
        }
      }

      if (metaAdsUrls.length > 0) {
        const { data: adsResult, error: adsError } = await supabase.functions.invoke("firecrawl-meta-ads-scraper", {
          body: {
            urls: metaAdsUrls,
            sessionId,
          },
        });

        if (adsError) {
          console.warn(`[AGENT-WORKFLOW] Meta Ads scraper error:`, adsError);
        } else if (adsResult?.ads) {
          allAds = adsResult.ads;
        }
      }

      await logExecution(
        "Meta Ads Extraction",
        "completed",
        "meta-ads",
        { urls: metaAdsUrls.length },
        { adsExtracted: allAds.length },
        null,
        Date.now() - step2Start,
        45,
        TOOL_ICONS["meta-ads"],
        `Extracted ${allAds.length} ads`
      );
    } catch (step2Error) {
      console.error(`[AGENT-WORKFLOW] Step 2 error:`, step2Error);
      await logExecution(
        "Meta Ads Extraction",
        "failed",
        "meta-ads",
        null,
        null,
        `Ad extraction failed: ${step2Error instanceof Error ? step2Error.message : "Unknown error"}`,
        Date.now() - step2Start,
        45,
        TOOL_ICONS["meta-ads"]
      );
    }

    // ============ STEP 3: Download Videos ============
    let downloadedVideos: any[] = [];
    const step3Start = Date.now();

    const videoAds = allAds.filter((ad) => ad.videoUrl || ad.video_url);
    if (videoAds.length > 0) {
      await logExecution(
        "Video Download",
        "started",
        "download",
        { videoCount: videoAds.length },
        null,
        null,
        null,
        50,
        TOOL_ICONS.download,
        `Downloading ${videoAds.length} videos...`
      );

      try {
        console.log(`[AGENT-WORKFLOW] Step 3: Download Videos`);
        await updateSession("idle", 50, "video_download");

        const videoUrls = videoAds.map((ad) => ad.videoUrl || ad.video_url).slice(0, 5);
        
        const { data: downloadResult, error: downloadError } = await supabase.functions.invoke("video-download-service", {
          body: {
            videoUrls,
            sessionId,
          },
        });

        if (downloadError) {
          console.warn(`[AGENT-WORKFLOW] Video download error:`, downloadError);
        } else if (downloadResult?.results) {
          downloadedVideos = downloadResult.results.filter((r: any) => r.success);
        }

        await logExecution(
          "Video Download",
          "completed",
          "download",
          { videoCount: videoAds.length },
          { downloaded: downloadedVideos.length },
          null,
          Date.now() - step3Start,
          60,
          TOOL_ICONS.download,
          `Downloaded ${downloadedVideos.length}/${videoAds.length} videos`
        );
      } catch (step3Error) {
        console.error(`[AGENT-WORKFLOW] Step 3 error:`, step3Error);
        await logExecution(
          "Video Download",
          "failed",
          "download",
          null,
          null,
          `Video download failed: ${step3Error instanceof Error ? step3Error.message : "Unknown error"}`,
          Date.now() - step3Start,
          60,
          TOOL_ICONS.download
        );
      }
    } else {
      await logExecution(
        "Video Download",
        "completed",
        "download",
        null,
        { message: "No video ads to download" },
        null,
        Date.now() - step3Start,
        60,
        TOOL_ICONS.download,
        "No video ads found"
      );
    }

    // ============ STEP 4: Analyze Videos with Azure ============
    let videoAnalyses: any[] = [];
    const step4Start = Date.now();

    if (downloadedVideos.length > 0) {
      await logExecution(
        "Video Analysis",
        "started",
        "azure",
        { videoCount: downloadedVideos.length },
        null,
        null,
        null,
        65,
        TOOL_ICONS.azure,
        "Analyzing video content..."
      );

      try {
        console.log(`[AGENT-WORKFLOW] Step 4: Analyze Videos`);
        await updateSession("idle", 65, "video_analysis");

        const videosToAnalyze = downloadedVideos.slice(0, 3);
        
        for (let i = 0; i < videosToAnalyze.length; i++) {
          const video = videosToAnalyze[i];
          
          await logExecution(
            "Video Analysis",
            "started",
            "azure",
            null,
            null,
            null,
            null,
            65 + (i * 5),
            TOOL_ICONS.azure,
            `Analyzing video ${i + 1}/${videosToAnalyze.length}...`
          );

          try {
            const { data: analysisResult, error: analysisError } = await supabase.functions.invoke("azure-video-analyzer", {
              body: {
                videoUrl: video.publicUrl || video.url,
                sessionId,
              },
            });

            if (!analysisError && analysisResult) {
              videoAnalyses.push({
                videoUrl: video.publicUrl || video.url,
                analysis: analysisResult,
              });
            }
          } catch (videoError) {
            console.warn(`[AGENT-WORKFLOW] Video ${i + 1} analysis failed:`, videoError);
          }
        }

        await logExecution(
          "Video Analysis",
          "completed",
          "azure",
          { videoCount: downloadedVideos.length },
          { analyzedCount: videoAnalyses.length },
          null,
          Date.now() - step4Start,
          80,
          TOOL_ICONS.azure,
          `Analyzed ${videoAnalyses.length} videos`
        );
      } catch (step4Error) {
        console.error(`[AGENT-WORKFLOW] Step 4 error:`, step4Error);
        await logExecution(
          "Video Analysis",
          "failed",
          "azure",
          null,
          null,
          `Video analysis failed: ${step4Error instanceof Error ? step4Error.message : "Unknown error"}`,
          Date.now() - step4Start,
          80,
          TOOL_ICONS.azure
        );
      }
    } else {
      await logExecution(
        "Video Analysis",
        "completed",
        "azure",
        null,
        { message: "No videos to analyze" },
        null,
        Date.now() - step4Start,
        80,
        TOOL_ICONS.azure,
        "Skipped - no videos"
      );
    }

    // ============ STEP 5: LLM Synthesis ============
    let synthesisResult: any = null;
    const step5Start = Date.now();

    await logExecution(
      "AI Synthesis",
      "started",
      "llm",
      { dataPoints: competitors.length + allAds.length + videoAnalyses.length },
      null,
      null,
      null,
      85,
      TOOL_ICONS.llm,
      "Generating insights and recommendations..."
    );

    try {
      console.log(`[AGENT-WORKFLOW] Step 5: LLM Synthesis`);
      await updateSession("idle", 85, "llm_synthesis");

      const { data: llmResult, error: llmError } = await supabase.functions.invoke("llm-synthesis-engine", {
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
          metaAds: allAds,
          videoInsights: videoAnalyses,
          session_id: sessionId,
        },
      });

      if (llmError) {
        console.error(`[AGENT-WORKFLOW] LLM synthesis error:`, llmError);
        throw new Error(llmError.message || "LLM synthesis failed");
      }

      synthesisResult = llmResult?.synthesis || llmResult;

      await logExecution(
        "AI Synthesis",
        "completed",
        "llm",
        null,
        { hasAnalysis: !!synthesisResult, scriptsCount: synthesisResult?.suggestedScripts?.length || 0 },
        null,
        Date.now() - step5Start,
        100,
        TOOL_ICONS.llm,
        "Analysis complete"
      );
    } catch (step5Error) {
      console.error(`[AGENT-WORKFLOW] Step 5 error:`, step5Error);
      await logExecution(
        "AI Synthesis",
        "failed",
        "llm",
        null,
        null,
        `Synthesis failed: ${step5Error instanceof Error ? step5Error.message : "Unknown error"}`,
        Date.now() - step5Start,
        100,
        TOOL_ICONS.llm
      );
      
      // Create fallback synthesis
      synthesisResult = {
        executiveSummary: `Analysis for ${input.brandName} based on ${competitors.length} competitors and ${allAds.length} ads.`,
        adAnalyses: allAds.slice(0, 5).map((ad, i) => ({
          adId: `ad_${i}`,
          hookAnalysis: ad.adCopy?.slice(0, 100) || "Hook analysis unavailable",
          ctaEffectiveness: "Analysis unavailable",
        })),
        suggestedScripts: [{
          title: `${input.brandName} UGC Script`,
          hook: `Looking for the best ${input.productCategory}?`,
          problem: `Most ${input.productCategory} options don't deliver.`,
          solution: `${input.brandName} is different because ${input.keyMessages?.[0] || "we care about quality"}.`,
          cta: "Try it today!",
          duration: "30s",
        }],
      };
    }

    // ============ COMPLETE WORKFLOW ============
    const totalDuration = Date.now() - startTime;
    const metadata = {
      competitorsFound: competitors.length,
      adsExtracted: allAds.length,
      videosAnalyzed: videoAnalyses.length,
      totalDurationMs: totalDuration,
    };

    await updateSession("completed", 100, null, metadata);

    await supabase
      .from("agent_sessions")
      .update({
        state: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    await logExecution(
      "Workflow Complete",
      "completed",
      "workflow",
      null,
      metadata,
      null,
      totalDuration,
      100,
      TOOL_ICONS.workflow,
      `Completed in ${(totalDuration / 1000).toFixed(1)}s`
    );

    console.log(`[AGENT-WORKFLOW] Workflow completed in ${totalDuration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        synthesis: synthesisResult,
        metadata,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[AGENT-WORKFLOW] Fatal error:`, error);
    
    // Log the fatal error
    if (sessionId) {
      try {
        await supabase.from("agent_execution_logs").insert({
          session_id: sessionId,
          step_name: "Fatal Error",
          status: "failed",
          tool_name: "workflow",
          error_message: error instanceof Error ? error.message : "Unknown fatal error",
          input_data: { tool_icon: TOOL_ICONS.workflow },
        });

        await supabase
          .from("agent_sessions")
          .update({ 
            state: "error", 
            current_step: "fatal_error",
            updated_at: new Date().toISOString()
          })
          .eq("id", sessionId);
      } catch (logError) {
        console.error(`[AGENT-WORKFLOW] Failed to log fatal error:`, logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        sessionId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
