import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool definitions for the LangChain-style agent
const TOOLS = [
  {
    name: "scrape_meta_ads",
    description: "Navigate to Meta Ads Library and capture ad creatives, screenshots, and video URLs for a given brand using Firecrawl MCP",
    parameters: {
      type: "object",
      properties: {
        brandName: { type: "string", description: "The brand name to search for" },
        maxAds: { type: "number", description: "Maximum number of ads to scrape (default 10)" },
      },
      required: ["brandName"],
    },
  },
  {
    name: "download_video",
    description: "Download video assets from URLs and store them in Supabase Storage",
    parameters: {
      type: "object",
      properties: {
        videoUrls: { type: "array", items: { type: "string" }, description: "Array of video URLs to download" },
        sessionId: { type: "string", description: "Session ID for organizing downloads" },
      },
      required: ["videoUrls", "sessionId"],
    },
  },
  {
    name: "extract_video_frames",
    description: "Extract key frames from a video (first 3 seconds) for visual analysis",
    parameters: {
      type: "object",
      properties: {
        videoUrl: { type: "string", description: "URL of the video to extract frames from" },
        timestamps: { type: "array", items: { type: "number" }, description: "Timestamps in seconds to extract frames" },
      },
      required: ["videoUrl"],
    },
  },
  {
    name: "analyze_ad_creative",
    description: "Analyze ad screenshots and frames using Gemini 3 Pro Vision for hook effectiveness, visual quality, and recommendations",
    parameters: {
      type: "object",
      properties: {
        screenshots: { type: "array", items: { type: "string" }, description: "Array of screenshot URLs" },
        frames: { type: "array", items: { type: "string" }, description: "Array of video frame URLs" },
        adCopy: { type: "string", description: "The ad copy/text to analyze" },
        brandContext: { type: "string", description: "Context about the brand being audited" },
      },
      required: ["screenshots", "adCopy"],
    },
  },
  {
    name: "search_brand_niche",
    description: "Search for brand information and competitor landscape using Firecrawl MCP",
    parameters: {
      type: "object",
      properties: {
        brandName: { type: "string", description: "Brand name to research" },
        category: { type: "string", description: "Product/service category" },
      },
      required: ["brandName"],
    },
  },
  {
    name: "generate_audit_report",
    description: "Generate a professional PDF audit report from the analysis data",
    parameters: {
      type: "object",
      properties: {
        auditData: { type: "object", description: "Complete audit analysis data" },
        brandName: { type: "string", description: "Brand name for the report" },
        sessionId: { type: "string", description: "Session ID" },
      },
      required: ["auditData", "brandName", "sessionId"],
    },
  },
  {
    name: "store_embeddings",
    description: "Store ad content embeddings in the vector store for future retrieval",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "Content to embed" },
        brandName: { type: "string", description: "Associated brand name" },
        adType: { type: "string", description: "Type of ad content" },
        metadata: { type: "object", description: "Additional metadata" },
      },
      required: ["content", "brandName"],
    },
  },
  {
    name: "retrieve_similar_ads",
    description: "Retrieve similar past ad analyses from the vector store",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        brandName: { type: "string", description: "Filter by brand name" },
        limit: { type: "number", description: "Maximum results to return" },
      },
      required: ["query"],
    },
  },
];

// Structured output schemas
const HookAnalysisSchema = {
  hookText: "string - The actual hook text/visual",
  hookType: "enum - question|statistic|problem|claim|curiosity",
  effectiveness: "number 1-10",
  whyItWorks: "string - Explanation of effectiveness",
  scrollStoppingScore: "number 1-10",
};

const AdAuditSchema = {
  adId: "string",
  hookAnalysis: HookAnalysisSchema,
  scriptBreakdown: [
    {
      section: "string - hook|problem|solution|cta",
      timestamp: "string",
      content: "string",
      effectiveness: "number 1-10",
    },
  ],
  visualAnalysis: {
    quality: "number 1-10",
    brandConsistency: "number 1-10",
    attentionGrabbing: "number 1-10",
    keyVisualElements: ["string"],
  },
  ctaAnalysis: {
    ctaText: "string",
    clarity: "number 1-10",
    urgency: "number 1-10",
    actionability: "number 1-10",
  },
  recommendations: [
    {
      type: "string - performance_lift|cost_reduction",
      title: "string",
      description: "string",
      expectedImpact: "string",
      priority: "enum - high|medium|low",
    },
  ],
  overallScore: "number 1-100",
};

interface AgentInput {
  brandName: string;
  productCategory?: string;
  targetAudience?: string;
  userId: string;
  sessionId?: string;
  attachedUrls?: { url: string; title?: string }[];
  maxAds?: number;
}

interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

// Lovable AI Gateway configuration
const LOVABLE_AI_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-pro-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
  const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  let sessionId: string;
  const startTime = Date.now();

  try {
    const body = await req.json();
    const input: AgentInput = body.input || body;

    if (!input.brandName || !input.userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing brandName or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    sessionId = input.sessionId || crypto.randomUUID();
    console.log(`[LANGCHAIN-AGENT] Starting audit for brand: ${input.brandName}, session: ${sessionId}`);
    console.log(`[LANGCHAIN-AGENT] Using Lovable AI with model: ${DEFAULT_MODEL}`);

    // Helper function for execution logging
    const logStep = async (
      stepName: string,
      status: "started" | "completed" | "failed",
      toolName: string | null,
      inputData: any = null,
      outputData: any = null,
      errorMessage: string | null = null,
      progressPercent: number | null = null
    ) => {
      const toolIcons: Record<string, string> = {
        scrape: "🔥", download: "⬇️", frames: "🎬", vision: "👁️",
        search: "🔎", report: "📄", embed: "🧮", llm: "🧠",
        firecrawl: "🔥", gemini: "✨",
      };
      
      try {
        await supabase.from("agent_execution_logs").insert({
          session_id: sessionId,
          step_name: stepName,
          status,
          tool_name: toolName,
          input_data: {
            ...inputData,
            progress_percent: progressPercent,
            tool_icon: toolName ? toolIcons[toolName] || "⚙️" : null,
          },
          output_data: outputData,
          error_message: errorMessage,
          duration_ms: status !== "started" ? Date.now() - startTime : null,
        });
      } catch (e) {
        console.error(`[LANGCHAIN-AGENT] Log error:`, e);
      }
    };

    // Create or update session
    const { error: sessionError } = await supabase.from("agent_sessions").upsert({
      id: sessionId,
      user_id: input.userId,
      state: "running",
      progress: 0,
      current_step: "initializing",
      title: `Ad Audit: ${input.brandName}`,
      metadata: { brandName: input.brandName, startedAt: new Date().toISOString(), model: DEFAULT_MODEL },
    });

    if (sessionError) {
      console.error(`[LANGCHAIN-AGENT] Session error:`, sessionError);
    }

    await logStep("Agent Initialization", "started", "gemini", { brandName: input.brandName, model: DEFAULT_MODEL }, null, null, 5);

    // ============ AGENT REASONING LOOP ============
    const agentMessages: any[] = [
      {
        role: "system",
        content: `You are an expert creative ad auditor agent powered by Gemini 3 Pro. Your task is to perform a comprehensive audit of Meta Ads for the brand "${input.brandName}".

You have access to these tools:
${TOOLS.map(t => `- ${t.name}: ${t.description}`).join("\n")}

Your workflow should be:
1. First, use scrape_meta_ads to gather ad creatives from Meta Ads Library using Firecrawl MCP
2. For any video ads, use download_video to save them, then extract_video_frames
3. Use analyze_ad_creative with Gemini Vision to analyze screenshots and frames
4. Use search_brand_niche to understand the competitive landscape
5. Use retrieve_similar_ads to find comparable past analyses
6. Finally, use generate_audit_report to create the final PDF report

Always explain your reasoning before calling a tool. Return structured analysis following this schema:
${JSON.stringify(AdAuditSchema, null, 2)}

Be thorough but efficient. Focus on actionable insights.`,
      },
      {
        role: "user",
        content: `Please perform a comprehensive ad audit for "${input.brandName}"${input.productCategory ? ` in the ${input.productCategory} category` : ""}${input.targetAudience ? ` targeting ${input.targetAudience}` : ""}.
        
${input.attachedUrls?.length ? `Also analyze these specific ad URLs: ${input.attachedUrls.map(u => u.url).join(", ")}` : ""}

I need:
1. Hook analysis (first 3 seconds effectiveness)
2. Complete script breakdown (problem → solution → CTA structure)
3. Visual quality assessment
4. 2 actionable recommendations (performance lift + cost reduction)
5. Comparison to niche best practices`,
      },
    ];

    // Collected data through the workflow
    const workflowData: {
      scrapedAds: any[];
      downloadedVideos: any[];
      extractedFrames: any[];
      visualAnalyses: any[];
      brandResearch: any;
      similarAds: any[];
      finalAudit: any;
    } = {
      scrapedAds: [],
      downloadedVideos: [],
      extractedFrames: [],
      visualAnalyses: [],
      brandResearch: null,
      similarAds: [],
      finalAudit: null,
    };

    // Agent loop - max 10 iterations
    let iteration = 0;
    const maxIterations = 10;
    let isComplete = false;

    while (iteration < maxIterations && !isComplete) {
      iteration++;
      console.log(`[LANGCHAIN-AGENT] Iteration ${iteration}`);

      // Update progress
      const progress = Math.min(10 + iteration * 8, 90);
      await supabase.from("agent_sessions").update({
        progress,
        updated_at: new Date().toISOString(),
      }).eq("id", sessionId);

      // Call Lovable AI Gateway with Gemini 3 Pro
      const response = await fetch(LOVABLE_AI_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: agentMessages,
          tools: TOOLS.map(t => ({
            type: "function",
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            },
          })),
          tool_choice: "auto",
          max_completion_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LANGCHAIN-AGENT] Lovable AI error:`, errorText);
        
        // Handle rate limits and payment required
        if (response.status === 429) {
          throw new Error("Rate limits exceeded. Please try again later.");
        }
        if (response.status === 402) {
          throw new Error("Payment required. Please add funds to your Lovable AI workspace.");
        }
        throw new Error(`Lovable AI API error: ${response.status}`);
      }

      const completion = await response.json();
      const assistantMessage = completion.choices[0].message;
      agentMessages.push(assistantMessage);

      // Check if the agent wants to call tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);
          
          console.log(`[LANGCHAIN-AGENT] Tool call: ${toolName}`, toolArgs);
          await logStep(`Tool: ${toolName}`, "started", toolName, toolArgs, null, null, progress);

          let toolResult: any;

          try {
            // Execute the tool
            switch (toolName) {
              case "scrape_meta_ads": {
                // Use the new Firecrawl MCP scraper
                const { data, error } = await supabase.functions.invoke("firecrawl-mcp-scraper", {
                  body: {
                    brandName: toolArgs.brandName,
                    maxAds: toolArgs.maxAds || input.maxAds || 10,
                    sessionId,
                    userId: input.userId,
                  },
                });
                if (error) throw error;
                workflowData.scrapedAds = data?.ads || [];
                toolResult = { success: true, adsFound: workflowData.scrapedAds.length, ads: workflowData.scrapedAds };
                break;
              }

              case "download_video": {
                const { data, error } = await supabase.functions.invoke("video-download-service", {
                  body: {
                    videoUrls: toolArgs.videoUrls,
                    sessionId: toolArgs.sessionId || sessionId,
                  },
                });
                if (error) throw error;
                workflowData.downloadedVideos = data?.results?.filter((r: any) => r.success) || [];
                toolResult = { success: true, downloaded: workflowData.downloadedVideos.length };
                break;
              }

              case "extract_video_frames": {
                const { data, error } = await supabase.functions.invoke("ffmpeg-frames", {
                  body: {
                    videoUrl: toolArgs.videoUrl,
                    timestamps: toolArgs.timestamps || [0, 1, 2, 3],
                  },
                });
                if (error) throw error;
                if (data?.frames) {
                  workflowData.extractedFrames.push(...data.frames);
                }
                toolResult = { success: true, framesExtracted: data?.frames?.length || 0 };
                break;
              }

              case "analyze_ad_creative": {
                // Use the updated vision analysis with Gemini
                const { data, error } = await supabase.functions.invoke("gemini-vision-analysis", {
                  body: {
                    screenshots: toolArgs.screenshots || [],
                    frames: toolArgs.frames || workflowData.extractedFrames,
                    adCopy: toolArgs.adCopy,
                    brandContext: toolArgs.brandContext || input.brandName,
                  },
                });
                if (error) throw error;
                workflowData.visualAnalyses.push(data);
                toolResult = { success: true, analysis: data };
                break;
              }

              case "search_brand_niche": {
                // Use Firecrawl MCP for brand research
                if (firecrawlApiKey) {
                  const mcpEndpoint = `https://mcp.firecrawl.dev/${firecrawlApiKey}/v2/mcp`;
                  
                  try {
                    const searchResponse = await fetch(mcpEndpoint, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        jsonrpc: "2.0",
                        id: Date.now(),
                        method: "tools/call",
                        params: {
                          name: "firecrawl_search",
                          arguments: {
                            query: `${toolArgs.brandName} ${toolArgs.category || ""} brand analysis competitors market`,
                            limit: 5,
                            scrapeOptions: { formats: ["markdown"] },
                          },
                        },
                      }),
                    });

                    if (searchResponse.ok) {
                      const searchData = await searchResponse.json();
                      workflowData.brandResearch = searchData.result?.content || null;
                      toolResult = { success: true, research: workflowData.brandResearch };
                    } else {
                      throw new Error("Firecrawl search failed");
                    }
                  } catch (e) {
                    console.error(`[LANGCHAIN-AGENT] Firecrawl search error:`, e);
                    toolResult = { success: false, error: "Search failed" };
                  }
                } else {
                  toolResult = { success: false, error: "Firecrawl API key not configured" };
                }
                break;
              }

              case "retrieve_similar_ads": {
                // Generate embedding using Lovable AI
                const embeddingResponse = await fetch(LOVABLE_AI_ENDPOINT, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${lovableApiKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "google/gemini-2.5-flash",
                    messages: [
                      { role: "user", content: `Generate a semantic search query for finding ads similar to: ${toolArgs.query}` }
                    ],
                    max_completion_tokens: 256,
                  }),
                });

                if (embeddingResponse.ok) {
                  // For now, just return empty as we need proper vector store integration
                  workflowData.similarAds = [];
                  toolResult = { success: true, similarAds: workflowData.similarAds, note: "Vector search coming soon" };
                } else {
                  toolResult = { success: false, error: "Embedding generation failed" };
                }
                break;
              }

              case "store_embeddings": {
                // Store content without embedding for now (vector store needs separate embedding service)
                const { error } = await supabase.from("ad_embeddings").insert({
                  session_id: sessionId,
                  user_id: input.userId,
                  content: toolArgs.content,
                  brand_name: toolArgs.brandName,
                  ad_type: toolArgs.adType,
                  metadata: toolArgs.metadata || {},
                });
                if (error) throw error;
                toolResult = { success: true, stored: true };
                break;
              }

              case "generate_audit_report": {
                const { data, error } = await supabase.functions.invoke("pdf-generator", {
                  body: {
                    auditData: toolArgs.auditData || workflowData,
                    brandName: toolArgs.brandName || input.brandName,
                    sessionId: toolArgs.sessionId || sessionId,
                    userId: input.userId,
                  },
                });
                if (error) throw error;
                workflowData.finalAudit = data;
                toolResult = { success: true, reportUrl: data?.reportUrl };
                break;
              }

              default:
                toolResult = { error: `Unknown tool: ${toolName}` };
            }

            await logStep(`Tool: ${toolName}`, "completed", toolName, toolArgs, toolResult, null, progress + 5);
          } catch (toolError) {
            console.error(`[LANGCHAIN-AGENT] Tool error:`, toolError);
            toolResult = { error: toolError instanceof Error ? toolError.message : "Tool execution failed" };
            await logStep(`Tool: ${toolName}`, "failed", toolName, toolArgs, null, toolResult.error, progress);
          }

          // Add tool result to messages
          agentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }
      } else {
        // No tool calls - check if agent is done
        const content = assistantMessage.content || "";
        if (content.includes("audit complete") || content.includes("final report") || iteration >= maxIterations - 1) {
          isComplete = true;
          workflowData.finalAudit = {
            summary: content,
            ...workflowData,
          };
        }
      }
    }

    // ============ FINAL SYNTHESIS ============
    await logStep("Final Synthesis", "started", "gemini", null, null, null, 90);

    // If we don't have a structured audit yet, generate one using Gemini 3 Pro
    if (!workflowData.finalAudit?.auditReport) {
      const synthesisResponse = await fetch(LOVABLE_AI_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content: `You are an expert ad auditor powered by Gemini 3 Pro. Based on the collected data, generate a comprehensive structured audit report following this exact JSON schema:
${JSON.stringify(AdAuditSchema, null, 2)}

Be specific and actionable in your recommendations.`,
            },
            {
              role: "user",
              content: `Generate the final audit report for ${input.brandName} based on this collected data:

Scraped Ads: ${JSON.stringify(workflowData.scrapedAds.slice(0, 5))}
Visual Analyses: ${JSON.stringify(workflowData.visualAnalyses)}
Brand Research: ${JSON.stringify(workflowData.brandResearch)}
Similar Past Ads: ${JSON.stringify(workflowData.similarAds)}

Return ONLY valid JSON matching the schema.`,
            },
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        }),
      });

      if (synthesisResponse.ok) {
        const synthesisData = await synthesisResponse.json();
        try {
          workflowData.finalAudit = {
            ...workflowData.finalAudit,
            auditReport: JSON.parse(synthesisData.choices[0].message.content),
          };
        } catch (e) {
          workflowData.finalAudit = {
            ...workflowData.finalAudit,
            auditReport: synthesisData.choices[0].message.content,
          };
        }
      }
    }

    // Store the audit report
    await supabase.from("ad_audit_reports").insert({
      session_id: sessionId,
      user_id: input.userId,
      brand_name: input.brandName,
      report_data: workflowData.finalAudit,
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    // Update session as completed
    await supabase.from("agent_sessions").update({
      state: "completed",
      progress: 100,
      current_step: "completed",
      completed_at: new Date().toISOString(),
      metadata: {
        brandName: input.brandName,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        adsAnalyzed: workflowData.scrapedAds.length,
        videosProcessed: workflowData.downloadedVideos.length,
        model: DEFAULT_MODEL,
      },
    }).eq("id", sessionId);

    await logStep("Audit Complete", "completed", "gemini", null, { summary: "Audit completed successfully" }, null, 100);

    console.log(`[LANGCHAIN-AGENT] Completed in ${Date.now() - startTime}ms using ${DEFAULT_MODEL}`);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        audit: workflowData.finalAudit,
        metadata: {
          adsAnalyzed: workflowData.scrapedAds.length,
          videosProcessed: workflowData.downloadedVideos.length,
          framesExtracted: workflowData.extractedFrames.length,
          durationMs: Date.now() - startTime,
          model: DEFAULT_MODEL,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[LANGCHAIN-AGENT] Fatal error:`, error);
    
    if (sessionId!) {
      await supabase.from("agent_sessions").update({
        state: "error",
        metadata: { error: error instanceof Error ? error.message : "Unknown error" },
      }).eq("id", sessionId);
    }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
