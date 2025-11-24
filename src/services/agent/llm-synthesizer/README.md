# LLM Synthesizer

This module provides LLM-powered synthesis of competitor research insights into actionable UGC script recommendations.

## Overview

The LLM Synthesizer takes outputs from:
1. **Firecrawl MCP**: Competitor discovery and ad URLs
2. **Meta Ads Library**: Ad creative metadata
3. **Azure Video Indexer**: Video analysis insights

And generates:
- Comprehensive ad script breakdowns with timestamps
- Hook and CTA analysis
- Editing pattern recognition
- Storytelling structure mapping
- Conversion factor identification
- Brand-aligned UGC script recommendations

## Architecture

```
llm-synthesizer/
├── types.ts          # Input/output type definitions
├── prompts.ts        # Structured prompt templates
├── llm-client.ts     # Multi-provider LLM abstraction
├── synthesizer.ts    # Main synthesis orchestrator
└── index.ts          # Public API exports
```

## Features

### 1. Multi-Provider LLM Support
- **Lovable AI** (default): Pre-configured gateway with Google Gemini & OpenAI models
- **OpenAI**: Direct API integration (GPT-4o, GPT-5, etc.)
- **Anthropic**: Claude models (Sonnet, Opus)

### 2. Structured Prompt Engineering
- Comprehensive system prompts for UGC expertise
- Template-based user prompts with variable substitution
- Enforced JSON output format for structured data

### 3. Comprehensive Analysis
For each competitor ad:
- **Full Script Breakdown**: Timestamped script with visuals, emotions, purpose
- **Hook Analysis**: Type, effectiveness score, reasoning
- **CTA Analysis**: Type, tone, effectiveness score
- **Editing Breakdown**: Pacing, shots, transitions, effects
- **Storytelling Structure**: Acts, emotional arc, narrative flow
- **Conversion Factors**: Primary factors, impact scores, evidence

### 4. UGC Script Generation
- 3-5 brand-aligned script suggestions
- Full scripts with detailed timestamps
- Visual and audio directions
- Hook and CTA suggestions
- Editing notes and guidelines
- Reasoning for why each script will work
- Attribution to inspiring competitor ads

## Usage

### 1. Direct Module Usage

```typescript
import { CompetitorAdSynthesizer } from "@/services/agent/llm-synthesizer";

const synthesizer = new CompetitorAdSynthesizer({
  provider: "lovable-ai",
  model: "google/gemini-2.5-flash",
  temperature: 0.7,
  maxTokens: 8000,
});

const result = await synthesizer.synthesize({
  brandMemory: {
    brandName: "MyBrand",
    targetAudience: "25-40 year old professionals",
    brandVoice: "Friendly, empowering, authentic",
    productCategory: "Skincare",
    keyMessages: ["Natural ingredients", "Cruelty-free", "Dermatologist tested"],
    competitors: ["CompetitorA", "CompetitorB"],
  },
  competitorData: {
    // From Firecrawl MCP
    competitors: [...],
    searchQuery: "skincare ads",
    timestamp: "2025-01-24T00:00:00Z",
  },
  metaAds: [
    // From Meta Ads Library
    {
      ad_archive_id: "123",
      page_name: "CompetitorA",
      video_url: "https://...",
      body_text: "Transform your skin in 30 days",
      cta_text: "Shop Now",
    },
  ],
  videoInsights: [
    // From Azure Video Indexer
    {
      videoId: "abc",
      videoName: "CompetitorA Ad",
      fullTranscript: "Hey everyone, let me show you...",
      scenes: [...],
      visualContent: {...},
    },
  ],
});

if (result.success) {
  console.log("Synthesis:", result.output);
  console.log("Ad Analyses:", result.output.adAnalyses.length);
  console.log("Script Suggestions:", result.output.suggestedScripts.length);
}
```

### 2. Edge Function Usage

```typescript
const { data } = await supabase.functions.invoke("llm-synthesis-engine", {
  body: {
    brandMemory: {...},
    competitorData: {...},
    metaAds: [...],
    videoInsights: [...],
    sessionId: "agent-session-123", // Optional: for logging
    llmProvider: "lovable-ai", // Optional: defaults to lovable-ai
    llmModel: "google/gemini-2.5-flash", // Optional
  },
});

console.log("Synthesis:", data.synthesis);
```

## Output Structure

### Complete Synthesis Output

```typescript
{
  synthesisId: "uuid",
  brandName: "MyBrand",
  generatedAt: "2025-01-24T12:00:00Z",
  
  competitorSummary: {
    totalCompetitors: 3,
    totalAdsAnalyzed: 5,
    keyTrends: [
      "Heavy use of before/after testimonials",
      "Emphasis on natural ingredients",
      "Direct-to-camera storytelling"
    ],
    commonThemes: [
      "Authenticity over production value",
      "Problem-solution narrative structure",
      "Strong urgency-based CTAs"
    ]
  },
  
  adAnalyses: [{
    adId: "123",
    advertiser: "CompetitorA",
    videoUrl: "https://...",
    
    fullScript: [{
      startTime: "0:00",
      endTime: "0:03",
      text: "I struggled with acne for years...",
      visualDescription: "Close-up of person looking at camera",
      emotion: "vulnerability",
      purpose: "hook"
    }],
    
    hookAnalysis: {
      hookText: "I struggled with acne for years...",
      hookType: "problem",
      timestamp: "0:00-0:03",
      effectiveness: 9,
      reason: "Immediately relatable problem that creates curiosity"
    },
    
    ctaAnalysis: {
      ctaText: "Try it risk-free for 30 days",
      ctaType: "soft",
      timestamp: "0:27-0:30",
      tone: "reassuring",
      effectiveness: 8,
      reason: "Removes purchase anxiety with risk-free guarantee"
    },
    
    editingBreakdown: {
      avgShotLength: 2.5,
      totalShots: 12,
      pacing: "fast",
      transitions: ["jump cut", "match cut"],
      visualEffects: ["text overlay", "speed ramp"],
      textOverlays: true
    },
    
    storytellingStructure: {
      structure: "problem-solution",
      acts: [
        {
          actNumber: 1,
          actName: "The Problem",
          startTime: "0:00",
          endTime: "0:10",
          purpose: "Establish relatable pain point",
          keyElements: ["vulnerability", "frustration", "struggle"]
        }
      ],
      emotionalArc: "Problem → Hope → Transformation → Confidence"
    },
    
    conversionFactors: {
      primaryFactor: "Authentic vulnerability builds trust",
      factors: [
        {
          factor: "Direct testimonial format",
          impact: "high",
          evidence: "First-person storytelling creates emotional connection"
        }
      ],
      overallScore: 9
    },
    
    keyTakeaways: [
      "Start with vulnerable problem statement",
      "Show transformation visually",
      "End with soft, risk-free CTA"
    ],
    
    strengthsWeaknesses: {
      strengths: [
        "Authentic delivery",
        "Clear before/after",
        "Strong emotional arc"
      ],
      weaknesses: [
        "Could be shorter (30s vs 15s)",
        "CTA could be stronger"
      ]
    }
  }],
  
  recommendations: {
    topPerformingPatterns: [
      "Problem-solution narrative with personal testimony",
      "Before/after visual proof",
      "Soft CTAs with risk-reversal"
    ],
    suggestedApproaches: [
      "Lead with vulnerability, not product",
      "Show transformation, don't just tell",
      "Build trust before asking for action"
    ],
    avoidPatterns: [
      "Hard-sell CTAs without rapport",
      "Overly produced aesthetic",
      "Generic benefits without proof"
    ]
  },
  
  suggestedScripts: [{
    scriptTitle: "Before/After Glow-Up",
    targetAudience: "Women 25-35 with skin concerns",
    scriptDuration: "30s",
    
    fullScript: "Okay so I used to hide behind makeup every single day because my skin was that bad. Then I found [Brand] and honestly? Game changer. This is me 30 days ago vs today - no filter. The ingredients are all natural and dermatologist tested so I finally trusted something on my face. If you've been struggling like I was, just try it. They have a 30-day guarantee so literally no risk.",
    
    timestampedScript: [{
      timing: "0:00-0:03",
      visual: "Direct to camera, natural lighting, bare face",
      audio: "Conversational, vulnerable tone",
      text: "Okay so I used to hide behind makeup every single day..."
    }],
    
    hookSuggestion: "Start with relatable problem + vulnerability",
    ctaSuggestion: "Soft CTA with risk-reversal guarantee",
    
    visualGuidelines: [
      "Natural lighting, no filters",
      "Show actual before/after photos",
      "Keep framing tight and intimate"
    ],
    
    editingNotes: [
      "Fast cuts every 2-3 seconds",
      "Text overlay for key stats/claims",
      "Upbeat background music"
    ],
    
    whyItWorks: "Combines vulnerability (hook), visual proof (credibility), and risk-reversal (conversion) in brand voice",
    
    inspiredBy: "CompetitorA - Problem-solution testimonial"
  }],
  
  insights: {
    marketTrends: [
      "Shift toward authentic, unpolished content",
      "Before/after proof becoming table stakes",
      "Risk-reversal guarantees increasing conversion"
    ],
    opportunityGaps: [
      "Longer-form education content (60s+)",
      "Community-driven testimonials",
      "Behind-the-scenes transparency"
    ],
    competitiveAdvantages: [
      "Dermatologist-tested positioning",
      "Natural ingredients messaging",
      "30-day guarantee differentiator"
    ]
  }
}
```

## LLM Provider Configuration

### Lovable AI (Default - Recommended)

```typescript
{
  provider: "lovable-ai",
  model: "google/gemini-2.5-flash", // Fast, cost-effective
  // OR
  model: "google/gemini-2.5-pro", // More powerful
  // OR
  model: "openai/gpt-5-mini", // OpenAI via Lovable gateway
}
```

**Advantages**:
- Pre-configured (no API key needed)
- Access to multiple models
- Automatic rate limiting
- Built-in cost optimization

### Direct OpenAI

```typescript
{
  provider: "openai",
  model: "gpt-4o",
  apiKey: "sk-...", // Or set OPENAI_API_KEY env var
  temperature: 0.7,
  maxTokens: 8000,
}
```

### Anthropic (Claude)

```typescript
{
  provider: "anthropic",
  model: "claude-sonnet-4-5",
  apiKey: "sk-ant-...", // Or set ANTHROPIC_API_KEY env var
  temperature: 0.7,
  maxTokens: 8000,
}
```

## Prompt Engineering

### System Prompt Design

The system prompt establishes:
- Expert role (UGC strategist, ad analyst)
- Core competencies (hook analysis, script breakdown, etc.)
- Output format requirements (JSON structure)
- Quality standards (specific timestamps, ratings, reasoning)

### User Prompt Structure

1. **Brand Context**: Target audience, voice, messaging
2. **Competitor Data**: Research findings from Firecrawl
3. **Ad Metadata**: Creative details from Meta Ads Library
4. **Video Insights**: Analysis from Azure Video Indexer
5. **Task Specification**: Expected output structure

### Structured Output Enforcement

- Explicit JSON schema in system prompt
- Output format examples
- Field-level descriptions
- Validation rules

## Error Handling

### Error Types

- `LLM_ERROR`: LLM API request failed
- `INVALID_INPUT`: Missing or invalid input data
- `PARSING_ERROR`: Failed to parse LLM output as JSON
- `TIMEOUT`: Request exceeded time limit
- `UNKNOWN_ERROR`: Unexpected error

### Error Recovery

```typescript
const result = await synthesizer.synthesize(input);

if (!result.success) {
  console.error("Synthesis failed:", result.error);
  
  if (result.error.code === "PARSING_ERROR") {
    // LLM returned invalid JSON - refine prompt or retry
  } else if (result.error.code === "LLM_ERROR") {
    // LLM API error - check API key, rate limits
  }
}
```

## Performance Characteristics

- **Input Processing**: < 1 second
- **LLM Inference**: 10-60 seconds (depends on model, input size)
- **Output Parsing**: < 1 second
- **Total Duration**: ~15-90 seconds

### Optimization Tips

1. **Use faster models for iteration**: `google/gemini-2.5-flash` for development
2. **Use powerful models for production**: `google/gemini-2.5-pro` or `openai/gpt-5`
3. **Limit video insights**: Only include most relevant videos
4. **Batch requests**: Process multiple ads in single request when possible

## Integration with Agent Workflow

This module is the final step in the agent workflow:

1. ✅ Firecrawl MCP: Discover competitors
2. ✅ Meta Ads Library: Extract ad metadata
3. ✅ Azure Video Indexer: Analyze videos
4. ✅ **LLM Synthesis: Generate recommendations** ← This module
5. ⏳ Agent Orchestrator: Coordinate full workflow (next)

## Best Practices

### Input Preparation

- Provide complete brand memory for accurate personalization
- Include at least 2-3 competitor ads for pattern recognition
- Ensure video insights have full transcripts
- Clean and validate all input data

### Prompt Optimization

- Test prompts with different LLM providers
- A/B test prompt variations
- Validate output structure consistency
- Monitor LLM token usage

### Output Validation

- Verify JSON structure matches schema
- Check required fields are present
- Validate timestamp formats
- Ensure effectiveness scores are in range (1-10)

## References

- [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat)
- [Anthropic Messages API](https://docs.anthropic.com/claude/reference/messages)
- [Lovable AI Documentation](https://docs.lovable.dev/features/ai)
- [Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
