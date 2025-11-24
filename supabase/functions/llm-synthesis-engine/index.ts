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
    console.log("[llm-synthesis-engine] Function started");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const {
      brandMemory,
      competitorData,
      metaAds,
      videoInsights,
      sessionId,
      llmProvider = "lovable-ai",
      llmModel,
    } = await req.json();

    // Validate required fields
    if (!brandMemory || !competitorData || !metaAds || !videoInsights) {
      throw new Error("Missing required synthesis input fields");
    }

    console.log("[llm-synthesis-engine] Processing synthesis");
    console.log(`[llm-synthesis-engine] Provider: ${llmProvider}`);
    console.log(`[llm-synthesis-engine] Ads to analyze: ${metaAds.length}`);
    console.log(`[llm-synthesis-engine] Videos to analyze: ${videoInsights.length}`);

    // Log execution start
    if (sessionId) {
      await supabase.from("agent_execution_logs").insert({
        session_id: sessionId,
        step_name: "LLM Synthesis",
        tool_name: "llm-synthesis-engine",
        status: "running",
        input_data: {
          brandName: brandMemory.brandName,
          competitorCount: competitorData.competitors.length,
          adCount: metaAds.length,
          videoCount: videoInsights.length,
        },
      });
    }

    const startTime = Date.now();

    // =========================================================================
    // Prepare Synthesis Input
    // =========================================================================
    const synthesisInput = {
      brandMemory,
      competitorData,
      metaAds,
      videoInsights,
    };

    // =========================================================================
    // Prepare Prompt Data
    // =========================================================================
    const promptData = {
      brandName: brandMemory.brandName,
      targetAudience: brandMemory.targetAudience,
      brandVoice: brandMemory.brandVoice,
      productCategory: brandMemory.productCategory,
      keyMessages: brandMemory.keyMessages.join(", "),
      searchQuery: competitorData.searchQuery,
      totalCompetitors: competitorData.competitors.length,
      competitorsList: competitorData.competitors
        .map(
          (c: any, idx: number) =>
            `${idx + 1}. ${c.brandName} (${c.websiteUrl}) - ${c.adCount} ads`
        )
        .join("\n"),
      totalAds: metaAds.length,
      metaAdsData: metaAds
        .map(
          (ad: any, idx: number) =>
            `Ad ${idx + 1}: ${ad.page_name}\n- ID: ${ad.ad_archive_id}\n- Text: ${ad.body_text || "N/A"}\n- CTA: ${ad.cta_text || "N/A"}\n- Video: ${ad.video_url || "N/A"}`
        )
        .join("\n\n"),
      videoInsightsData: videoInsights
        .map(
          (v: any, idx: number) =>
            `Video ${idx + 1}: ${v.videoName}\n- Duration: ${v.durationInSeconds}s\n- Transcript: ${v.fullTranscript.substring(0, 300)}...\n- Scenes: ${v.scenes.length}\n- Keywords: ${v.keywords.slice(0, 10).join(", ")}\n- Sentiment: ${v.overallSentiment.positive}% positive`
        )
        .join("\n\n"),
    };

    // =========================================================================
    // Build System Prompt
    // =========================================================================
    const systemPrompt = `You are an expert UGC strategist analyzing competitor ads. Generate comprehensive insights including script breakdowns, hooks, CTAs, editing patterns, and brand-aligned UGC script recommendations.

Output MUST be valid JSON matching this structure (no markdown, no extra text):
{
  "synthesisId": "uuid",
  "brandName": "string",
  "generatedAt": "ISO timestamp",
  "competitorSummary": {
    "totalCompetitors": number,
    "totalAdsAnalyzed": number,
    "keyTrends": ["string"],
    "commonThemes": ["string"]
  },
  "adAnalyses": [{
    "adId": "string",
    "advertiser": "string",
    "videoUrl": "string",
    "fullScript": [{"startTime": "0:00", "endTime": "0:03", "text": "string", "visualDescription": "string", "emotion": "string", "purpose": "hook|problem|solution|cta"}],
    "hookAnalysis": {"hookText": "string", "hookType": "question|stat|problem", "timestamp": "string", "effectiveness": 1-10, "reason": "string"},
    "ctaAnalysis": {"ctaText": "string", "ctaType": "direct|soft", "timestamp": "string", "tone": "string", "effectiveness": 1-10, "reason": "string"},
    "editingBreakdown": {"avgShotLength": number, "totalShots": number, "pacing": "fast|medium|slow", "transitions": [], "visualEffects": [], "textOverlays": boolean},
    "storytellingStructure": {"structure": "problem-solution|testimonial", "acts": [], "emotionalArc": "string"},
    "conversionFactors": {"primaryFactor": "string", "factors": [{"factor": "string", "impact": "high|medium|low", "evidence": "string"}], "overallScore": 1-10},
    "keyTakeaways": ["string"],
    "strengthsWeaknesses": {"strengths": ["string"], "weaknesses": ["string"]}
  }],
  "recommendations": {
    "topPerformingPatterns": ["string"],
    "suggestedApproaches": ["string"],
    "avoidPatterns": ["string"]
  },
  "suggestedScripts": [{
    "scriptTitle": "string",
    "targetAudience": "string",
    "scriptDuration": "15s|30s|60s",
    "fullScript": "string",
    "timestampedScript": [{"timing": "0:00-0:03", "visual": "string", "audio": "string", "text": "string"}],
    "hookSuggestion": "string",
    "ctaSuggestion": "string",
    "visualGuidelines": ["string"],
    "editingNotes": ["string"],
    "whyItWorks": "string",
    "inspiredBy": "string"
  }],
  "insights": {
    "marketTrends": ["string"],
    "opportunityGaps": ["string"],
    "competitiveAdvantages": ["string"]
  }
}`;

    // =========================================================================
    // Build User Prompt
    // =========================================================================
    const userPrompt = `Analyze competitor ads and generate UGC recommendations.

# BRAND CONTEXT
Brand: ${promptData.brandName}
Audience: ${promptData.targetAudience}
Voice: ${promptData.brandVoice}
Category: ${promptData.productCategory}
Messages: ${promptData.keyMessages}

# COMPETITOR DATA
${promptData.competitorsList}

# ADS
${promptData.metaAdsData}

# VIDEO INSIGHTS
${promptData.videoInsightsData}

Generate comprehensive synthesis with ad analyses and 3-5 UGC script suggestions.`;

    // =========================================================================
    // Call LLM
    // =========================================================================
    console.log("[llm-synthesis-engine] Calling LLM");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const model = llmModel || "google/gemini-2.5-flash";

    const llmResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      throw new Error(`LLM error: ${llmResponse.status} - ${errorText}`);
    }

    const llmData = await llmResponse.json();
    const llmContent = llmData.choices[0].message.content;

    console.log("[llm-synthesis-engine] LLM response received");

    // =========================================================================
    // Parse Output
    // =========================================================================
    let cleanContent = llmContent.trim();
    
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const synthesisOutput = JSON.parse(cleanContent);

    const duration = Date.now() - startTime;

    console.log("[llm-synthesis-engine] Synthesis complete");
    console.log(`[llm-synthesis-engine] Duration: ${duration}ms`);
    console.log(`[llm-synthesis-engine] Ad analyses: ${synthesisOutput.adAnalyses?.length || 0}`);
    console.log(`[llm-synthesis-engine] Scripts: ${synthesisOutput.suggestedScripts?.length || 0}`);

    // Log execution completion
    if (sessionId) {
      await supabase.from("agent_execution_logs").insert({
        session_id: sessionId,
        step_name: "LLM Synthesis",
        tool_name: "llm-synthesis-engine",
        status: "completed",
        duration_ms: duration,
        output_data: {
          synthesisId: synthesisOutput.synthesisId,
          adAnalysesCount: synthesisOutput.adAnalyses?.length || 0,
          scriptsCount: synthesisOutput.suggestedScripts?.length || 0,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        synthesis: synthesisOutput,
        duration_ms: duration,
        usage: {
          promptTokens: llmData.usage?.prompt_tokens || 0,
          completionTokens: llmData.usage?.completion_tokens || 0,
          totalTokens: llmData.usage?.total_tokens || 0,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[llm-synthesis-engine] Error:", error);

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
