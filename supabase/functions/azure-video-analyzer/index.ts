import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[azure-video-analyzer] Function started");

    // Get Azure credentials from environment
    const AZURE_API_KEY = Deno.env.get("AZURE_VIDEO_INDEXER_API_KEY");
    const AZURE_ACCOUNT_ID = Deno.env.get("AZURE_VIDEO_INDEXER_ACCOUNT_ID");
    const AZURE_LOCATION = Deno.env.get("AZURE_VIDEO_INDEXER_LOCATION");

    if (!AZURE_API_KEY || !AZURE_ACCOUNT_ID || !AZURE_LOCATION) {
      throw new Error("Azure Video Indexer credentials not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { videoUrl, videoName, sessionId, waitForCompletion = true } = await req.json();

    if (!videoUrl || !videoName) {
      throw new Error("Missing required fields: videoUrl, videoName");
    }

    console.log("[azure-video-analyzer] Processing video:", videoName);

    // Log execution start
    if (sessionId) {
      await supabase.from("agent_execution_logs").insert({
        session_id: sessionId,
        step_name: "Azure Video Indexer Processing",
        tool_name: "azure-video-analyzer",
        status: "running",
        input_data: { videoUrl, videoName },
      });
    }

    const startTime = Date.now();

    // =========================================================================
    // Step 1: Get Account Access Token
    // =========================================================================
    console.log("[azure-video-analyzer] Getting account access token");

    const authUrl = `https://api.videoindexer.ai/auth/${AZURE_LOCATION}/Accounts/${AZURE_ACCOUNT_ID}/AccessToken?allowEdit=true`;
    
    const authResponse = await fetch(authUrl, {
      method: "GET",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_API_KEY,
      },
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      throw new Error(`Authentication failed: ${authResponse.status} - ${errorText}`);
    }

    const accountToken = (await authResponse.text()).replace(/"/g, "");
    console.log("[azure-video-analyzer] Access token obtained");

    // =========================================================================
    // Step 2: Upload Video
    // =========================================================================
    console.log("[azure-video-analyzer] Uploading video to Azure");

    const uploadParams = new URLSearchParams({
      accessToken: accountToken,
      name: videoName,
      privacy: "Private",
      priority: "Normal",
      videoUrl: videoUrl,
      language: "en-US",
      indexingPreset: "Default",
    });

    const uploadUrl = `https://api.videoindexer.ai/${AZURE_LOCATION}/Accounts/${AZURE_ACCOUNT_ID}/Videos?${uploadParams.toString()}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Video upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadData = await uploadResponse.json();
    const videoId = uploadData.id;

    console.log("[azure-video-analyzer] Video uploaded, ID:", videoId);

    // If not waiting for completion, return early
    if (!waitForCompletion) {
      const duration = Date.now() - startTime;

      if (sessionId) {
        await supabase.from("agent_execution_logs").insert({
          session_id: sessionId,
          step_name: "Azure Video Indexer Processing",
          tool_name: "azure-video-analyzer",
          status: "completed",
          duration_ms: duration,
          output_data: {
            videoId,
            state: "Processing",
            message: "Video uploaded, processing started",
          },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          videoId,
          state: "Processing",
          message: "Video uploaded successfully, processing in background",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =========================================================================
    // Step 3: Poll for Processing Completion
    // =========================================================================
    console.log("[azure-video-analyzer] Polling for processing completion");

    const maxWaitTime = 600000; // 10 minutes
    const pollInterval = 10000; // 10 seconds
    let processingComplete = false;
    let videoInsights = null;

    while (Date.now() - startTime < maxWaitTime && !processingComplete) {
      const statusUrl = `https://api.videoindexer.ai/${AZURE_LOCATION}/Accounts/${AZURE_ACCOUNT_ID}/Videos/${videoId}/Index?accessToken=${accountToken}`;

      const statusResponse = await fetch(statusUrl, {
        method: "GET",
      });

      if (!statusResponse.ok) {
        console.error("[azure-video-analyzer] Failed to get status");
        break;
      }

      const statusData = await statusResponse.json();
      const state = statusData.state;
      const progress = statusData.processingProgress || "0%";

      console.log(`[azure-video-analyzer] Status: ${state} - ${progress}`);

      if (state === "Processed") {
        processingComplete = true;
        videoInsights = statusData;
        break;
      }

      if (state === "Failed") {
        throw new Error(`Video processing failed: ${statusData.failureMessage || "Unknown error"}`);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    if (!processingComplete) {
      throw new Error("Video processing timeout exceeded");
    }

    // =========================================================================
    // Step 4: Extract and Normalize Insights
    // =========================================================================
    console.log("[azure-video-analyzer] Extracting insights");

    const fullTranscript = videoInsights.videos[0]?.insights?.transcript
      ?.map((entry: any) => entry.text)
      .filter((text: string) => text.trim() !== "")
      .join(" ") || "";

    const scenes = videoInsights.videos[0]?.insights?.scenes?.map((scene: any) => ({
      sceneId: scene.id,
      startTime: scene.instances[0]?.start || "0:00:00",
      endTime: scene.instances[scene.instances.length - 1]?.end || "0:00:00",
    })) || [];

    const labels = videoInsights.videos[0]?.insights?.labels?.map((label: any) => label.name) || [];
    const keywords = videoInsights.videos[0]?.insights?.keywords?.map((kw: any) => kw.text) || [];

    const sentiment = videoInsights.videos[0]?.insights?.sentiments || [];
    const emotions = videoInsights.videos[0]?.insights?.emotions || [];

    const normalizedInsights = {
      videoId,
      videoName,
      durationInSeconds: videoInsights.videos[0]?.durationInSeconds || 0,
      processingState: "Processed",
      fullTranscript,
      scenes,
      visualContent: {
        labels: labels.slice(0, 20),
      },
      keywords: keywords.slice(0, 10),
      sentiment: sentiment.length > 0 ? sentiment[0].sentimentType : "Neutral",
      emotions: emotions.map((e: any) => e.type).slice(0, 3),
    };

    const duration = Date.now() - startTime;

    console.log("[azure-video-analyzer] Processing complete");
    console.log("[azure-video-analyzer] Transcript length:", fullTranscript.length);
    console.log("[azure-video-analyzer] Scenes detected:", scenes.length);
    console.log("[azure-video-analyzer] Labels found:", labels.length);

    // Log execution completion
    if (sessionId) {
      await supabase.from("agent_execution_logs").insert({
        session_id: sessionId,
        step_name: "Azure Video Indexer Processing",
        tool_name: "azure-video-analyzer",
        status: "completed",
        duration_ms: duration,
        output_data: normalizedInsights,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        insights: normalizedInsights,
        duration_ms: duration,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[azure-video-analyzer] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
