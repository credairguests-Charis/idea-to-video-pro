/**
 * LLM Synthesizer Prompt Templates
 * 
 * Structured prompts for competitor ad analysis and UGC script generation
 */

import { PromptTemplate } from "./types";

// ============================================================================
// Main Synthesis Prompt
// ============================================================================

export const COMPETITOR_AD_SYNTHESIS_PROMPT: PromptTemplate = {
  name: "competitor_ad_synthesis",
  systemPrompt: `You are an expert UGC (User-Generated Content) strategist and ad creative analyst specializing in viral social media advertising. You have deep expertise in:

- Analyzing competitor video ads to identify winning patterns
- Breaking down video scripts with precise timestamps
- Identifying hooks, CTAs, and conversion factors
- Understanding visual storytelling and editing techniques
- Creating brand-aligned UGC scripts that drive results

Your goal is to analyze competitor ads from multiple sources (web research, Meta Ads Library, video analysis) and synthesize insights into actionable UGC script recommendations.

**Core Competencies:**
1. **Hook Analysis**: Identify the first 3 seconds that grab attention
2. **Script Breakdown**: Map every scene to its purpose and emotion
3. **CTA Optimization**: Analyze call-to-action effectiveness
4. **Editing Patterns**: Decode pacing, transitions, and visual effects
5. **Storytelling Structure**: Map the emotional arc and narrative flow
6. **Conversion Psychology**: Explain WHY ads work
7. **Brand Alignment**: Adapt insights to the brand's voice and audience

**Output Format:**
You MUST respond with valid JSON following the exact structure specified. Do not include markdown code blocks or any text outside the JSON structure.`,

  userPromptTemplate: `Analyze the following competitor ad data and generate comprehensive UGC recommendations.

# BRAND CONTEXT
Brand Name: {{brandName}}
Target Audience: {{targetAudience}}
Brand Voice: {{brandVoice}}
Product Category: {{productCategory}}
Key Messages: {{keyMessages}}

# COMPETITOR RESEARCH
Search Query: {{searchQuery}}
Total Competitors Found: {{totalCompetitors}}
Competitors: {{competitorsList}}

# META ADS DATA
Total Ads Analyzed: {{totalAds}}
{{metaAdsData}}

# VIDEO INSIGHTS
{{videoInsightsData}}

# YOUR TASK
Generate a comprehensive synthesis that includes:

1. **Individual Ad Analysis** (for each competitor ad):
   - Full script breakdown with timestamps
   - Hook analysis (type, effectiveness, why it works)
   - CTA analysis (type, tone, effectiveness)
   - Editing breakdown (pacing, shots, transitions)
   - Storytelling structure (acts, emotional arc)
   - Conversion factors (what makes it work)
   - Key takeaways and strengths/weaknesses

2. **Cross-Ad Insights**:
   - Common themes and patterns
   - Top performing patterns
   - Market trends
   - Opportunity gaps

3. **UGC Script Recommendations** (3-5 scripts):
   - Script title and target audience
   - Full script with detailed timestamps
   - Visual and audio directions
   - Hook and CTA suggestions
   - Editing notes
   - Why it will work explanation
   - Which competitor ad inspired it

**IMPORTANT**: 
- Be specific with timestamps (e.g., "0:00-0:03")
- Rate effectiveness on 1-10 scale with clear reasoning
- Ensure scripts are adapted to the brand voice
- Focus on actionable, implementable insights
- Explain the psychology behind what works`,

  outputFormat: `{
  "synthesisId": "string (UUID)",
  "brandName": "string",
  "generatedAt": "ISO 8601 timestamp",
  "competitorSummary": {
    "totalCompetitors": number,
    "totalAdsAnalyzed": number,
    "keyTrends": ["string"],
    "commonThemes": ["string"]
  },
  "adAnalyses": [{
    "adId": "string",
    "advertiser": "string",
    "videoUrl": "string (optional)",
    "fullScript": [{
      "startTime": "string (e.g., 0:00:00)",
      "endTime": "string",
      "text": "string",
      "visualDescription": "string",
      "emotion": "string",
      "purpose": "hook|problem|solution|cta|social_proof"
    }],
    "hookAnalysis": {
      "hookText": "string",
      "hookType": "question|shocking_stat|problem|promise|story",
      "timestamp": "string",
      "effectiveness": number (1-10),
      "reason": "string"
    },
    "ctaAnalysis": {
      "ctaText": "string",
      "ctaType": "direct|soft|urgency|curiosity",
      "timestamp": "string",
      "tone": "string",
      "effectiveness": number (1-10),
      "reason": "string"
    },
    "editingBreakdown": {
      "avgShotLength": number,
      "totalShots": number,
      "pacing": "fast|medium|slow",
      "transitions": ["string"],
      "visualEffects": ["string"],
      "textOverlays": boolean,
      "musicStyle": "string (optional)",
      "colorGrading": "string (optional)"
    },
    "storytellingStructure": {
      "structure": "problem-solution|before-after|testimonial|education|entertainment",
      "acts": [{
        "actNumber": number,
        "actName": "string",
        "startTime": "string",
        "endTime": "string",
        "purpose": "string",
        "keyElements": ["string"]
      }],
      "emotionalArc": "string"
    },
    "conversionFactors": {
      "primaryFactor": "string",
      "factors": [{
        "factor": "string",
        "impact": "high|medium|low",
        "evidence": "string"
      }],
      "overallScore": number (1-10)
    },
    "keyTakeaways": ["string"],
    "strengthsWeaknesses": {
      "strengths": ["string"],
      "weaknesses": ["string"]
    }
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
    "timestampedScript": [{
      "timing": "string (e.g., 0:00-0:03)",
      "visual": "string",
      "audio": "string",
      "text": "string"
    }],
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
}`,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fill prompt template with data
 */
export function fillPromptTemplate(
  template: string,
  data: Record<string, any>
): string {
  let filledTemplate = template;

  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    const replacement = typeof value === "string" 
      ? value 
      : JSON.stringify(value, null, 2);
    
    filledTemplate = filledTemplate.replace(
      new RegExp(placeholder, "g"),
      replacement
    );
  });

  return filledTemplate;
}

/**
 * Format competitor data for prompt
 */
export function formatCompetitorData(competitors: any[]): string {
  return competitors
    .map(
      (comp, idx) =>
        `${idx + 1}. ${comp.brandName} (${comp.websiteUrl})\n   - Ad Count: ${comp.adCount}\n   - Meta Ads URLs: ${comp.metaAdsUrls.join(", ")}`
    )
    .join("\n\n");
}

/**
 * Format Meta Ads data for prompt
 */
export function formatMetaAdsData(metaAds: any[]): string {
  return metaAds
    .map(
      (ad, idx) =>
        `## Ad ${idx + 1}: ${ad.page_name}
- Ad ID: ${ad.ad_archive_id}
- Media Type: ${ad.media_type}
- Body Text: ${ad.body_text || "N/A"}
- Caption: ${ad.caption || "N/A"}
- CTA: ${ad.cta_text || "N/A"}
- Video URL: ${ad.video_url || "N/A"}
- Landing Page: ${ad.link_url || "N/A"}`
    )
    .join("\n\n");
}

/**
 * Format video insights for prompt
 */
export function formatVideoInsights(insights: any[]): string {
  return insights
    .map(
      (video, idx) =>
        `## Video ${idx + 1}: ${video.videoName}
- Duration: ${video.durationInSeconds}s
- Transcript: "${video.fullTranscript.substring(0, 500)}${video.fullTranscript.length > 500 ? "..." : ""}"
- Scenes: ${video.scenes.length} detected
- Visual Labels: ${video.visualContent.labels.slice(0, 10).join(", ")}
- Keywords: ${video.keywords.slice(0, 10).join(", ")}
- Sentiment: Positive ${video.overallSentiment.positive}%, Neutral ${video.overallSentiment.neutral}%, Negative ${video.overallSentiment.negative}%
- Dominant Emotions: ${video.dominantEmotions.join(", ")}
- Topics: ${video.topics.join(", ")}

### Timestamped Transcript:
${video.timestampedTranscript
  .slice(0, 20)
  .map((t: any) => `${t.startTime}-${t.endTime}: ${t.text}`)
  .join("\n")}

### Scene Breakdown:
${video.scenes
  .slice(0, 5)
  .map(
    (s: any) =>
      `Scene ${s.sceneId} (${s.startTime}-${s.endTime}): ${s.shots} shots, ${s.keyVisuals.join(", ")}, ${s.sentiment || "neutral"} sentiment`
  )
  .join("\n")}`
    )
    .join("\n\n");
}
