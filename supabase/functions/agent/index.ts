import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lovable AI endpoint for LLM calls
const LOVABLE_AI_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface MetaAd {
  id: string;
  creative: {
    image_url?: string;
    video_url?: string;
    headline?: string;
    body?: string;
  };
}

interface AgentState {
  brand_name: string;
  messages: Array<{ role: string; content: string }>;
  tool_calls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
  final_result: unknown;
}

// Tool definitions for the agent
const tools = [
  {
    type: "function",
    function: {
      name: "research_brand",
      description: "Search for brand info, website, social presence, and recent activity using web search",
      parameters: {
        type: "object",
        properties: {
          brand_name: { type: "string", description: "Brand name to research" },
          query: { type: "string", description: "Specific search query" },
        },
        required: ["brand_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_meta_ads",
      description: "Search Meta Ads Library and extract actual creative assets (images/videos) for a brand",
      parameters: {
        type: "object",
        properties: {
          brand_name: { type: "string", description: "Brand name to search for" },
          keywords: { type: "string", description: "Optional search keywords" },
        },
        required: ["brand_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_creatives",
      description: "Analyze extracted ad creatives and provide insights on hooks, scripts, CTAs",
      parameters: {
        type: "object",
        properties: {
          ads: { type: "array", description: "Array of ad objects to analyze" },
          brand_name: { type: "string", description: "Brand name for context" },
        },
        required: ["ads", "brand_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_report",
      description: "Generate final research report with recommendations",
      parameters: {
        type: "object",
        properties: {
          brand_name: { type: "string" },
          research_data: { type: "object", description: "All collected research data" },
          ads_data: { type: "object", description: "All extracted ads data" },
          analysis: { type: "object", description: "Creative analysis results" },
        },
        required: ["brand_name", "research_data", "ads_data"],
      },
    },
  },
];

// Tool implementations
async function researchBrand(brand_name: string, query?: string): Promise<string> {
  console.log(`[research_brand] Researching: ${brand_name}`);
  
  const searchQuery = query || `${brand_name} brand meta ads facebook advertising`;
  
  // Use Firecrawl for web research if available
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  
  if (firecrawlKey) {
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 5,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return JSON.stringify({
          source: "firecrawl",
          brand: brand_name,
          results: data.results || data.data || [],
          query: searchQuery,
        });
      }
    } catch (e) {
      console.error("[research_brand] Firecrawl error:", e);
    }
  }
  
  // Fallback: Return structured placeholder
  return JSON.stringify({
    source: "inference",
    brand: brand_name,
    info: `${brand_name} is a brand that advertises on Meta platforms. Research suggests they use various creative formats including video and static ads.`,
    query: searchQuery,
  });
}

async function getMetaAds(brand_name: string, keywords?: string): Promise<string> {
  console.log(`[get_meta_ads] Fetching ads for: ${brand_name}`);
  
  const searchTerms = keywords || brand_name;
  const ads: MetaAd[] = [];
  
  // Try Firecrawl to scrape Meta Ads Library
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  
  if (firecrawlKey) {
    try {
      const metaUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=${encodeURIComponent(searchTerms)}&search_type=keyword_unordered`;
      
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: metaUrl,
          formats: ["markdown", "html"],
          waitFor: 5000,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const html = data.html || data.data?.html || "";
        const markdown = data.markdown || data.data?.markdown || "";
        
        // Extract image URLs
        const imageMatches = html.match(/https:\/\/[^"'\s]+\.(jpg|jpeg|png|gif|webp)(?:\?[^"'\s]*)?/gi) || [];
        const uniqueImages = [...new Set(imageMatches)].slice(0, 10);
        
        // Extract video URLs
        const videoMatches = html.match(/https:\/\/[^"'\s]+\.(mp4|mov|webm)(?:\?[^"'\s]*)?/gi) || [];
        const uniqueVideos = [...new Set(videoMatches)].slice(0, 5);
        
        // Create ad objects
        uniqueImages.forEach((img, i) => {
          ads.push({
            id: `ad-img-${i + 1}`,
            creative: {
              image_url: img,
              headline: `${brand_name} Ad Creative ${i + 1}`,
            },
          });
        });
        
        uniqueVideos.forEach((vid, i) => {
          ads.push({
            id: `ad-vid-${i + 1}`,
            creative: {
              video_url: vid,
              headline: `${brand_name} Video Ad ${i + 1}`,
            },
          });
        });
        
        return JSON.stringify({
          brand: brand_name,
          ads: ads.slice(0, 10),
          total_images: uniqueImages.length,
          total_videos: uniqueVideos.length,
          source: "meta_ads_library",
        });
      }
    } catch (e) {
      console.error("[get_meta_ads] Firecrawl scrape error:", e);
    }
  }
  
  // Fallback: Return sample structure
  return JSON.stringify({
    brand: brand_name,
    ads: [
      {
        id: "ad-sample-1",
        creative: {
          headline: `${brand_name} - Sample Ad`,
          body: "This is a placeholder. Configure FIRECRAWL_API_KEY for real ad extraction.",
        },
      },
    ],
    total_images: 0,
    total_videos: 0,
    source: "placeholder",
  });
}

async function analyzeCreatives(ads: MetaAd[], brand_name: string): Promise<string> {
  console.log(`[analyze_creatives] Analyzing ${ads.length} ads for ${brand_name}`);
  
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return JSON.stringify({
      error: "LOVABLE_API_KEY not configured",
      brand: brand_name,
    });
  }
  
  const analysisPrompt = `Analyze these ${brand_name} ad creatives and provide insights:

Ads data: ${JSON.stringify(ads.slice(0, 5))}

Provide:
1. Hook Analysis: What attention-grabbing techniques are used?
2. Visual Style: Describe the overall aesthetic
3. CTA Patterns: What call-to-action patterns are visible?
4. Recommendations: 3 actionable UGC ad recommendations for ${brand_name}

Return as JSON with keys: hook_analysis, visual_style, cta_patterns, recommendations`;

  try {
    const response = await fetch(LOVABLE_AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert ad creative analyst. Return valid JSON only." },
          { role: "user", content: analysisPrompt },
        ],
        max_tokens: 1500,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      return content;
    }
  } catch (e) {
    console.error("[analyze_creatives] LLM error:", e);
  }
  
  return JSON.stringify({
    brand: brand_name,
    hook_analysis: "Unable to analyze - API error",
    recommendations: ["Configure API keys for full analysis"],
  });
}

function generateReport(
  brand_name: string,
  research_data: unknown,
  ads_data: unknown,
  analysis?: unknown
): string {
  console.log(`[generate_report] Creating report for ${brand_name}`);
  
  return JSON.stringify({
    report: {
      brand: brand_name,
      generated_at: new Date().toISOString(),
      sections: {
        brand_research: research_data,
        ad_creatives: ads_data,
        creative_analysis: analysis || null,
      },
      summary: `Competitive analysis report for ${brand_name} generated successfully.`,
    },
  });
}

// Execute a tool call
async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  console.log(`[executeTool] Executing: ${name}`, args);
  
  switch (name) {
    case "research_brand":
      return await researchBrand(args.brand_name as string, args.query as string);
    
    case "get_meta_ads":
      return await getMetaAds(args.brand_name as string, args.keywords as string);
    
    case "analyze_creatives":
      return await analyzeCreatives(args.ads as MetaAd[], args.brand_name as string);
    
    case "generate_report":
      return generateReport(
        args.brand_name as string,
        args.research_data,
        args.ads_data,
        args.analysis
      );
    
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// Main agent loop
async function runAgent(brand_name: string): Promise<AgentState> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY not configured");
  }
  
  const state: AgentState = {
    brand_name,
    messages: [
      {
        role: "system",
        content: `You are an autonomous AI agent that researches brands and extracts their Meta advertising creatives.

Your goal: Research "${brand_name}" and extract their ad creatives from Meta Ads Library.

Available tools:
1. research_brand - Search for brand information online
2. get_meta_ads - Extract actual image/video URLs from Meta Ads Library
3. analyze_creatives - Analyze the extracted ad creatives for insights
4. generate_report - Create final research report

Execute tools in sequence:
1. First, research the brand to understand their business
2. Then, extract their Meta ad creatives (actual URLs, not just links)
3. Analyze the creatives for hooks, CTAs, and patterns
4. Generate a final report with all findings

Work autonomously until you have a complete analysis. Call tools one at a time and use results to inform next steps.`,
      },
      {
        role: "user",
        content: `Research ${brand_name} and extract their Meta ad creatives. Return actual image/video URLs and provide creative analysis.`,
      },
    ],
    tool_calls: [],
    final_result: null,
  };
  
  const MAX_ITERATIONS = 8;
  let iteration = 0;
  
  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`[agent] Iteration ${iteration}/${MAX_ITERATIONS}`);
    
    // Call LLM with tools
    const response = await fetch(LOVABLE_AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: state.messages,
        tools,
        tool_choice: "auto",
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[agent] LLM error:", response.status, errorText);
      throw new Error(`LLM request failed: ${response.status}`);
    }
    
    const data = await response.json();
    const message = data.choices?.[0]?.message;
    
    if (!message) {
      console.error("[agent] No message in response");
      break;
    }
    
    // Add assistant message to history
    state.messages.push(message);
    
    // Check for tool calls
    const toolCalls = message.tool_calls;
    
    if (!toolCalls || toolCalls.length === 0) {
      // No tool calls - agent finished
      console.log("[agent] Agent finished with final response");
      state.final_result = {
        summary: message.content,
        tool_history: state.tool_calls,
      };
      break;
    }
    
    // Execute each tool call
    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      let toolArgs: Record<string, unknown> = {};
      
      try {
        toolArgs = JSON.parse(toolCall.function.arguments || "{}");
      } catch (e) {
        console.error("[agent] Failed to parse tool args:", e);
        toolArgs = {};
      }
      
      console.log(`[agent] Tool call: ${toolName}`, toolArgs);
      
      // Execute tool
      const result = await executeTool(toolName, toolArgs);
      
      // Store tool call
      state.tool_calls.push({
        name: toolName,
        args: toolArgs,
        result,
      });
      
      // Add tool result to messages
      state.messages.push({
        role: "tool",
        content: typeof result === "string" ? result : JSON.stringify(result),
        tool_call_id: toolCall.id,
      } as { role: string; content: string });
    }
  }
  
  if (!state.final_result) {
    state.final_result = {
      summary: "Agent completed maximum iterations",
      tool_history: state.tool_calls,
    };
  }
  
  return state;
}

// Cache helpers
async function checkCache(supabase: ReturnType<typeof createClient>, brand_name: string) {
  try {
    const { data } = await supabase
      .from("scraping_cache")
      .select("*")
      .eq("url", `brand:${brand_name.toLowerCase()}`)
      .gt("expires_at", new Date().toISOString())
      .single();
    
    return data?.scraped_data || null;
  } catch {
    return null;
  }
}

async function setCache(
  supabase: ReturnType<typeof createClient>,
  brand_name: string,
  data: unknown
) {
  try {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    
    await supabase.from("scraping_cache").upsert({
      url: `brand:${brand_name.toLowerCase()}`,
      url_hash: brand_name.toLowerCase(),
      scraped_data: data,
      expires_at: expiresAt,
    });
  } catch (e) {
    console.error("[cache] Failed to set cache:", e);
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { brand_name, use_cache = true } = await req.json();
    
    if (!brand_name) {
      return new Response(
        JSON.stringify({ error: "Missing brand_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[agent] Starting research for: ${brand_name}`);
    
    // Initialize Supabase client for caching
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    let supabase: ReturnType<typeof createClient> | null = null;
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
      
      // Check cache
      if (use_cache) {
        const cached = await checkCache(supabase, brand_name);
        if (cached) {
          console.log("[agent] Returning cached result");
          return new Response(
            JSON.stringify({
              brand: brand_name,
              result: cached,
              cached: true,
              timestamp: new Date().toISOString(),
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }
    
    // Run agent
    const state = await runAgent(brand_name);
    
    const result = {
      brand: brand_name,
      result: state.final_result,
      tool_history: state.tool_calls,
      cached: false,
      timestamp: new Date().toISOString(),
    };
    
    // Cache result
    if (supabase) {
      await setCache(supabase, brand_name, state.final_result);
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[agent] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Agent execution failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
