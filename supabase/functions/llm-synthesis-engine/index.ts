import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[llm-synthesis-engine] Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      brandMemory,
      competitorData,
      metaAds,
      videoInsights,
      sessionId,
      llmModel,
    } = await req.json();

    if (!brandMemory || !competitorData) {
      throw new Error("Missing required synthesis input fields");
    }

    console.log("[llm-synthesis-engine] Processing synthesis");
    console.log(`[llm-synthesis-engine] Ads to analyze: ${metaAds?.length || 0}`);
    console.log(`[llm-synthesis-engine] Videos analyzed: ${videoInsights?.length || 0}`);

    if (sessionId) {
      await supabase.from("agent_execution_logs").insert({
        session_id: sessionId,
        step_name: "LLM Synthesis",
        tool_name: "llm-synthesis-engine",
        status: "started",
        input_data: {
          tool_icon: "🧠",
          progress_percent: 0,
          sub_step: "Preparing synthesis prompt",
          brandName: brandMemory.brandName,
          competitorCount: competitorData.competitors?.length || 0,
          adCount: metaAds?.length || 0,
          videoCount: videoInsights?.length || 0,
        },
      });
    }

    const startTime = Date.now();

    // =========================================================================
    // Build Enhanced System Prompt
    // =========================================================================
    const systemPrompt = `You are an elite UGC strategist and advertising analyst. Your task is to analyze competitor Meta Ads and generate actionable insights for UGC video production.

## Your Analysis Must Include:

### 1. HOOK ANALYSIS (First 3 Seconds)
- Identify the exact hook technique used (question, statistic, problem statement, bold claim, curiosity gap)
- Rate hook effectiveness (1-10) with specific reasoning
- Note visual elements that support the hook

### 2. SCRIPT STRUCTURE BREAKDOWN
For each ad video with transcript:
- Opening Hook (0-3s): What grabs attention?
- Problem Agitation (3-10s): How is the pain point presented?
- Solution Introduction (10-20s): How is the product positioned?
- Social Proof/Benefits (20-40s): What builds credibility?
- Call-to-Action (final 5s): What's the conversion driver?

### 3. VIDEO CONCEPT DESCRIPTION
Describe the overall video concept in plain words:
- Setting/environment
- Talent/presenter style (UGC creator, professional actor, founder)
- Visual style (raw/authentic vs polished)
- Editing pace and transitions
- Text overlays and graphics usage

### 4. CTA EFFECTIVENESS
- Analyze the call-to-action text and delivery
- Rate urgency and clarity
- Note any special offers or scarcity tactics

### 5. CONVERSION FACTORS
Identify what makes this ad likely to convert:
- Emotional triggers used
- Trust signals present
- Objection handling
- Value proposition clarity

## OUTPUT FORMAT
Return ONLY valid JSON matching this exact structure (no markdown, no extra text):
{
  "synthesisId": "unique_id",
  "brandName": "string",
  "generatedAt": "ISO timestamp",
  "competitorSummary": {
    "totalCompetitors": number,
    "totalAdsAnalyzed": number,
    "keyTrends": ["trend1", "trend2"],
    "commonThemes": ["theme1", "theme2"],
    "topPerformingFormats": ["format1", "format2"]
  },
  "adAnalyses": [{
    "adId": "string",
    "advertiser": "string",
    "videoUrl": "string",
    "hookAnalysis": {
      "hookText": "exact opening words",
      "hookType": "question|statistic|problem|claim|curiosity",
      "hookTiming": "0:00-0:03",
      "visualHook": "description of visual hook",
      "effectiveness": 8,
      "whyItWorks": "explanation"
    },
    "scriptBreakdown": {
      "fullTranscript": "complete transcript",
      "sections": [{
        "timing": "0:00-0:03",
        "type": "hook",
        "text": "spoken words",
        "visual": "what's shown",
        "purpose": "grab attention"
      }]
    },
    "videoConceptDescription": "Plain English description of the video concept, style, and execution",
    "ctaAnalysis": {
      "ctaText": "exact CTA",
      "ctaType": "direct|soft",
      "urgencyLevel": "high|medium|low",
      "effectiveness": 7,
      "improvement": "suggestion"
    },
    "editingBreakdown": {
      "pacing": "fast|medium|slow",
      "avgShotLength": "2.5s",
      "transitions": ["cut", "zoom"],
      "textOverlays": true,
      "visualEffects": ["split screen", "before/after"]
    },
    "conversionFactors": [{
      "factor": "emotional trigger",
      "evidence": "specific example",
      "impact": "high"
    }],
    "keyTakeaways": ["takeaway1", "takeaway2"]
  }],
  "suggestedScripts": [{
    "scriptTitle": "Creative title",
    "format": "UGC testimonial|problem-solution|tutorial|unboxing",
    "targetDuration": "30s",
    "targetAudience": "specific audience",
    "hook": {
      "text": "Opening hook script",
      "timing": "0:00-0:03",
      "visualDirection": "what to show"
    },
    "fullScript": [{
      "timing": "0:00-0:03",
      "audio": "spoken words",
      "visual": "shot description",
      "textOverlay": "on-screen text if any"
    }],
    "cta": {
      "text": "CTA script",
      "visualDirection": "how to show CTA"
    },
    "productionNotes": ["note1", "note2"],
    "inspiredBy": "which competitor ad inspired this",
    "whyItWillWork": "strategic reasoning"
  }],
  "competitiveInsights": {
    "gaps": ["opportunity1", "opportunity2"],
    "overusedTactics": ["avoid1", "avoid2"],
    "emergingTrends": ["trend1", "trend2"],
    "differentiationOpportunities": ["opportunity1"]
  }
}`;

    // =========================================================================
    // Build User Prompt with Available Data
    // =========================================================================
    const formatCompetitors = () => {
      if (!competitorData.competitors?.length) return "No competitors found.";
      return competitorData.competitors
        .map((c: any, i: number) => `${i + 1}. ${c.brand_name || c.brandName} - ${c.meta_ads_library_url || c.metaAdsUrl || "N/A"}`)
        .join("\n");
    };

    const formatAds = () => {
      if (!metaAds?.length) return "No ads extracted.";
      return metaAds
        .map((ad: any, i: number) => {
          const parts = [`Ad ${i + 1}: ${ad.page_name || "Unknown Advertiser"}`];
          if (ad.ad_archive_id) parts.push(`ID: ${ad.ad_archive_id}`);
          if (ad.body_text) parts.push(`Copy: ${ad.body_text.substring(0, 200)}`);
          if (ad.cta_text) parts.push(`CTA: ${ad.cta_text}`);
          if (ad.video_url) parts.push(`Video: ${ad.video_url}`);
          if (ad.media_type) parts.push(`Type: ${ad.media_type}`);
          return parts.join("\n  ");
        })
        .join("\n\n");
    };

    const formatVideoInsights = () => {
      if (!videoInsights?.length) return "No video analysis available.";
      return videoInsights
        .map((v: any, i: number) => {
          const parts = [`Video ${i + 1}: ${v.videoName || "Unknown"}`];
          if (v.durationInSeconds) parts.push(`Duration: ${v.durationInSeconds}s`);
          if (v.fullTranscript) {
            const transcript = v.fullTranscript.substring(0, 500);
            parts.push(`Transcript: "${transcript}${v.fullTranscript.length > 500 ? "..." : ""}"`);
          }
          if (v.scenes?.length) parts.push(`Scenes: ${v.scenes.length}`);
          if (v.keywords?.length) parts.push(`Keywords: ${v.keywords.slice(0, 10).join(", ")}`);
          if (v.sentiment) parts.push(`Sentiment: ${v.sentiment}`);
          if (v.emotions?.length) parts.push(`Emotions: ${v.emotions.join(", ")}`);
          return parts.join("\n  ");
        })
        .join("\n\n");
    };

    const userPrompt = `# ANALYSIS REQUEST

## Brand Context
- Brand: ${brandMemory.brandName}
- Category: ${brandMemory.productCategory || "Not specified"}
- Target Audience: ${brandMemory.targetAudience || "Not specified"}
- Brand Voice: ${brandMemory.brandVoice || "Not specified"}
- Key Messages: ${brandMemory.keyMessages?.join(", ") || "Not specified"}

## Research Query
"${competitorData.searchQuery}"

## Competitors Found (${competitorData.competitors?.length || 0})
${formatCompetitors()}

## Meta Ads Extracted (${metaAds?.length || 0})
${formatAds()}

## Video Analysis Results (${videoInsights?.length || 0})
${formatVideoInsights()}

---

Based on the above data, provide:
1. Comprehensive analysis of each ad with transcript/video insights
2. Detailed hook analysis for each video ad
3. Plain-English video concept descriptions
4. 3-5 original UGC script suggestions tailored to ${brandMemory.brandName}
5. Competitive insights and differentiation opportunities

Focus especially on:
- What makes the hooks effective (or ineffective)
- The storytelling structure and emotional arc
- Specific tactics that can be adapted for ${brandMemory.brandName}`;

    // =========================================================================
    // Call LLM
    // =========================================================================
    console.log("[llm-synthesis-engine] Calling Lovable AI Gateway");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const model = llmModel || "google/gemini-2.5-flash";

    const llmResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
          max_tokens: 12000,
        }),
      }
    );

    if (!llmResponse.ok) {
      if (llmResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (llmResponse.status === 402) {
        throw new Error("Payment required. Please add credits to continue.");
      }
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

    // Remove markdown code blocks if present
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let synthesisOutput;
    try {
      synthesisOutput = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("[llm-synthesis-engine] JSON parse error:", parseError);
      // Try to extract JSON from the response
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        synthesisOutput = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse LLM response as JSON");
      }
    }

    const duration = Date.now() - startTime;

    console.log("[llm-synthesis-engine] Synthesis complete");
    console.log(`[llm-synthesis-engine] Duration: ${duration}ms`);
    console.log(`[llm-synthesis-engine] Ad analyses: ${synthesisOutput.adAnalyses?.length || 0}`);
    console.log(`[llm-synthesis-engine] Scripts: ${synthesisOutput.suggestedScripts?.length || 0}`);

    if (sessionId) {
      await supabase.from("agent_execution_logs").insert({
        session_id: sessionId,
        step_name: "LLM Synthesis",
        tool_name: "llm-synthesis-engine",
        status: "completed",
        duration_ms: duration,
        input_data: {
          tool_icon: "✅",
          progress_percent: 100,
          sub_step: "Synthesis complete",
        },
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
