import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VisionAnalysisInput {
  screenshots: string[];
  frames?: string[];
  adCopy: string;
  brandContext?: string;
}

// Structured output schema for ad analysis
const analysisSchema = {
  type: "object",
  properties: {
    hookAnalysis: {
      type: "object",
      properties: {
        hookText: { type: "string", description: "The actual hook text or description of visual hook" },
        hookType: { type: "string", enum: ["question", "statistic", "problem", "claim", "curiosity", "visual_shock", "relatability"] },
        effectiveness: { type: "number", minimum: 1, maximum: 10 },
        whyItWorks: { type: "string" },
        scrollStoppingScore: { type: "number", minimum: 1, maximum: 10 },
        improvements: { type: "array", items: { type: "string" } },
      },
      required: ["hookText", "hookType", "effectiveness", "whyItWorks", "scrollStoppingScore"],
    },
    visualAnalysis: {
      type: "object",
      properties: {
        quality: { type: "number", minimum: 1, maximum: 10 },
        brandConsistency: { type: "number", minimum: 1, maximum: 10 },
        attentionGrabbing: { type: "number", minimum: 1, maximum: 10 },
        keyVisualElements: { type: "array", items: { type: "string" } },
        colorAnalysis: { type: "string" },
        compositionNotes: { type: "string" },
      },
      required: ["quality", "brandConsistency", "attentionGrabbing", "keyVisualElements"],
    },
    scriptBreakdown: {
      type: "array",
      items: {
        type: "object",
        properties: {
          section: { type: "string", enum: ["hook", "problem", "agitation", "solution", "proof", "cta", "urgency"] },
          timestamp: { type: "string" },
          content: { type: "string" },
          effectiveness: { type: "number", minimum: 1, maximum: 10 },
          notes: { type: "string" },
        },
        required: ["section", "content", "effectiveness"],
      },
    },
    ctaAnalysis: {
      type: "object",
      properties: {
        ctaText: { type: "string" },
        clarity: { type: "number", minimum: 1, maximum: 10 },
        urgency: { type: "number", minimum: 1, maximum: 10 },
        actionability: { type: "number", minimum: 1, maximum: 10 },
        improvements: { type: "array", items: { type: "string" } },
      },
      required: ["ctaText", "clarity", "urgency", "actionability"],
    },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["performance_lift", "cost_reduction", "engagement_boost", "brand_alignment"] },
          title: { type: "string" },
          description: { type: "string" },
          expectedImpact: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          implementation: { type: "string" },
        },
        required: ["type", "title", "description", "expectedImpact", "priority"],
      },
    },
    overallScore: { type: "number", minimum: 1, maximum: 100 },
    summary: { type: "string" },
    topStrengths: { type: "array", items: { type: "string" } },
    criticalWeaknesses: { type: "array", items: { type: "string" } },
  },
  required: ["hookAnalysis", "visualAnalysis", "ctaAnalysis", "recommendations", "overallScore", "summary"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiApiKey) {
    return new Response(
      JSON.stringify({ success: false, error: "OpenAI API key not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const input: VisionAnalysisInput = body;

    if (!input.screenshots?.length && !input.frames?.length) {
      return new Response(
        JSON.stringify({ success: false, error: "No images provided for analysis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[GPT4O-VISION] Analyzing ${input.screenshots?.length || 0} screenshots and ${input.frames?.length || 0} frames`);

    // Build the vision message content
    const imageContent: any[] = [];
    
    // Add screenshots
    for (const screenshot of input.screenshots || []) {
      if (screenshot && screenshot.startsWith("http")) {
        imageContent.push({
          type: "image_url",
          image_url: { url: screenshot, detail: "high" },
        });
      }
    }

    // Add video frames
    for (const frame of input.frames || []) {
      if (frame && frame.startsWith("http")) {
        imageContent.push({
          type: "image_url",
          image_url: { url: frame, detail: "high" },
        });
      }
    }

    // Limit to 10 images to avoid token limits
    const limitedImages = imageContent.slice(0, 10);

    const systemPrompt = `You are an expert creative ad auditor and performance marketing analyst. Your task is to perform a comprehensive analysis of ad creatives.

You must analyze the visual elements, copy, and overall effectiveness of the ad. Focus on:

1. **Hook Analysis (First 3 seconds)**: Evaluate what captures attention immediately
2. **Visual Quality**: Assess composition, colors, brand consistency
3. **Script/Copy Structure**: Break down the problem-agitation-solution-CTA flow
4. **Call-to-Action**: Evaluate clarity, urgency, and actionability
5. **Recommendations**: Provide 2 actionable recommendations:
   - One for PERFORMANCE LIFT (how to improve conversion/engagement)
   - One for COST REDUCTION (how to reduce CPA or improve efficiency)

Be specific, data-driven, and actionable in your analysis. Score everything on a 1-10 scale where applicable.

${input.brandContext ? `Brand Context: ${input.brandContext}` : ""}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please analyze these ad creatives and provide a comprehensive audit.

Ad Copy/Text:
${input.adCopy || "No ad copy provided"}

Analyze the visual elements in the attached images and provide your analysis in the following JSON structure:
${JSON.stringify(analysisSchema.properties, null, 2)}

Return ONLY valid JSON.`,
              },
              ...limitedImages,
            ],
          },
        ],
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GPT4O-VISION] OpenAI error:`, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const completion = await response.json();
    const analysisContent = completion.choices[0].message.content;

    let analysis;
    try {
      analysis = JSON.parse(analysisContent);
    } catch (e) {
      console.error(`[GPT4O-VISION] Failed to parse JSON response:`, analysisContent);
      analysis = { raw: analysisContent, parseError: true };
    }

    console.log(`[GPT4O-VISION] Analysis complete. Overall score: ${analysis.overallScore}`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        metadata: {
          imagesAnalyzed: limitedImages.length,
          model: "gpt-4o",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[GPT4O-VISION] Error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
