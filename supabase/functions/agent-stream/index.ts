import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============ LANGCHAIN-STYLE AGENT CONFIGURATION ============

// Lovable AI Gateway - using Gemini 2.5 Flash for reliable tool calling
const LOVABLE_AI_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AGENT_MODEL = "google/gemini-2.5-flash";

// Tool icons for UI display
const TOOL_ICONS: Record<string, string> = {
  think_and_plan: "🧠",
  scrape_competitor_ads: "🔥",
  download_videos: "⬇️",
  analyze_visuals: "👁️",
  search_web: "🔎",
  synthesize_report: "📊",
  finish: "✅",
};

// ============ TOOL DEFINITIONS (LangChain-style) ============
// Each tool has: name, description, parameters (Zod-like schema)

const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "think_and_plan",
      description: "FIRST STEP - Always call this to analyze the task, understand what the user wants, and create a step-by-step execution plan. This enables autonomous reasoning.",
      parameters: {
        type: "object",
        properties: {
          task_understanding: {
            type: "string",
            description: "Your understanding of what the user is asking for"
          },
          reasoning: {
            type: "string", 
            description: "Your reasoning about how to approach this task"
          },
          execution_plan: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step: { type: "number" },
                action: { type: "string" },
                tool: { type: "string" },
                expected_output: { type: "string" }
              },
              required: ["step", "action", "tool"]
            },
            description: "Ordered list of steps to execute"
          },
          success_criteria: {
            type: "string",
            description: "How will you know when the task is complete?"
          }
        },
        required: ["task_understanding", "reasoning", "execution_plan", "success_criteria"]
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "scrape_competitor_ads",
      description: "Scrape Meta Ads Library to find competitor video ads. Returns ad data including video URLs, ad copy, thumbnails, and CTAs.",
      parameters: {
        type: "object",
        properties: {
          brand_name: { type: "string", description: "The brand/company name to search for" },
          max_ads: { type: "number", description: "Maximum number of ads to retrieve (default: 10)" }
        },
        required: ["brand_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "download_videos",
      description: "Download video files from URLs to storage for analysis.",
      parameters: {
        type: "object",
        properties: {
          video_urls: {
            type: "array",
            items: { type: "string" },
            description: "Array of video URLs to download"
          }
        },
        required: ["video_urls"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_visuals",
      description: "Analyze ad images/screenshots using AI vision. Extracts hooks, messaging, visual elements, and provides effectiveness scores.",
      parameters: {
        type: "object",
        properties: {
          image_urls: {
            type: "array",
            items: { type: "string" },
            description: "URLs of images/screenshots to analyze"
          },
          ad_copy: { type: "string", description: "The ad copy/text to analyze alongside visuals" },
          brand_context: { type: "string", description: "Additional context about the brand" }
        },
        required: ["image_urls"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web for information about brands, competitors, market trends, or any relevant topic.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
          num_results: { type: "number", description: "Number of results (default: 5)" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "synthesize_report",
      description: "Synthesize all collected data into a comprehensive analysis report with insights and recommendations.",
      parameters: {
        type: "object",
        properties: {
          brand_name: { type: "string" },
          ads_analyzed: { type: "number" },
          key_findings: {
            type: "array",
            items: { type: "string" }
          },
          hook_patterns: {
            type: "array",
            items: { type: "string" }
          },
          script_insights: {
            type: "array",
            items: { type: "string" }
          },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                impact: { type: "string" },
                priority: { type: "string" }
              }
            }
          }
        },
        required: ["brand_name", "key_findings", "recommendations"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "finish",
      description: "Call this when the task is complete. Provides a final summary to the user.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Brief summary of what was accomplished" },
          results_delivered: { type: "boolean", description: "Whether results were successfully delivered" },
          next_steps: {
            type: "array",
            items: { type: "string" },
            description: "Suggested next steps for the user"
          }
        },
        required: ["summary", "results_delivered"]
      }
    }
  }
];

// ============ AGENT SYSTEM PROMPT (LangChain-style) ============

const AGENT_SYSTEM_PROMPT = `You are Charis, an autonomous AI agent specialized in competitive ad research and analysis. You work autonomously without human intervention.

## YOUR CAPABILITIES
You have access to these tools:
- think_and_plan: Analyze tasks and create execution plans (ALWAYS USE FIRST)
- scrape_competitor_ads: Scrape Meta Ads Library for competitor ads
- download_videos: Download videos for detailed analysis
- analyze_visuals: Use AI vision to analyze ad creatives
- search_web: Search for brand/market information
- synthesize_report: Create comprehensive analysis reports
- finish: Complete the task and deliver results

## HOW YOU WORK (REACT PATTERN)
1. **THINK**: Always start with think_and_plan to understand and plan
2. **ACT**: Execute your plan step by step, calling appropriate tools
3. **OBSERVE**: Process tool results and adapt if needed
4. **REPEAT**: Continue until task is complete
5. **FINISH**: Call finish to deliver final results

## CRITICAL RULES
- ALWAYS call think_and_plan FIRST before any other tool
- Execute tools in logical order based on your plan
- If a tool fails, adapt your plan and try alternatives
- Make autonomous decisions - don't ask for clarification
- Be thorough but efficient - don't repeat tool calls unnecessarily
- Call finish when you've delivered value to the user

## OUTPUT STYLE
- Be concise but comprehensive
- Focus on actionable insights
- Use structured formats for clarity
- Highlight the most important findings first`;

// ============ MAIN AGENT SERVE FUNCTION ============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const startTime = Date.now();

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper to emit SSE events (LangChain-style streaming)
  const emit = async (type: string, data: any, node?: string) => {
    const event = {
      mode: type === "token" ? "messages" : "updates",
      type,
      node: node || "agent",
      data,
      timestamp: new Date().toISOString(),
    };
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  try {
    const body = await req.json();
    const { sessionId, userId, prompt, brandName, attachedUrls } = body;

    const session_id = sessionId || crypto.randomUUID();
    const user_id = userId;
    const userMessage = prompt || `Analyze competitor ads for ${brandName || "brand"}`;

    console.log(`[AGENT] Starting autonomous agent session: ${session_id}`);
    console.log(`[AGENT] User message: ${userMessage}`);

    // Start processing in background (non-blocking SSE)
    (async () => {
      try {
        // ============ SESSION SETUP ============
        await emit("session_start", { sessionId: session_id, model: AGENT_MODEL });

        await supabase.from("agent_sessions").upsert({
          id: session_id,
          user_id,
          state: "running",
          progress: 0,
          current_step: "initializing",
          title: brandName ? `Ad Audit: ${brandName}` : "Agent Task",
          metadata: { model: AGENT_MODEL, startedAt: new Date().toISOString() },
        });

        // Store user message
        await supabase.from("agent_chat_messages").insert({
          session_id,
          role: "user",
          content: userMessage,
          metadata: { attachedUrls, brandName },
        });

        // Create streaming assistant placeholder
        const { data: assistantMsg } = await supabase.from("agent_chat_messages")
          .insert({
            session_id,
            role: "assistant",
            content: "",
            is_streaming: true,
          })
          .select()
          .single();
        const assistantMsgId = assistantMsg?.id;

        await emit("step_start", { 
          step: "Initializing Agent", 
          toolIcon: "🚀",
          message: "Starting autonomous analysis..."
        }, "agent");

        // Log to execution logs
        const logStep = async (stepName: string, status: string, toolName: string | null, input?: any, output?: any, error?: string) => {
          await supabase.from("agent_execution_logs").insert({
            session_id,
            step_name: stepName,
            status,
            tool_name: toolName,
            input_data: { ...input, tool_icon: toolName ? TOOL_ICONS[toolName] : "🤖" },
            output_data: output,
            error_message: error,
            duration_ms: Date.now() - startTime,
          });
        };

        // ============ LANGCHAIN-STYLE AGENT LOOP ============
        // Messages array maintains conversation context (short-term memory)
        const messages: any[] = [
          { role: "system", content: AGENT_SYSTEM_PROMPT },
          { 
            role: "user", 
            content: `${userMessage}${attachedUrls?.length ? `\n\nAdditional URLs to analyze: ${attachedUrls.map((u: any) => u.url).join(", ")}` : ""}${brandName ? `\n\nBrand/Company: ${brandName}` : ""}`
          },
        ];

        let iteration = 0;
        const MAX_ITERATIONS = 15;
        let isComplete = false;
        let fullResponseContent = "";
        let currentPlan: any = null;

        // ============ REACT LOOP: Reasoning + Acting ============
        while (iteration < MAX_ITERATIONS && !isComplete) {
          iteration++;
          const progress = Math.min(5 + iteration * 6, 95);

          await supabase.from("agent_sessions").update({
            progress,
            current_step: `iteration_${iteration}`,
          }).eq("id", session_id);

          await emit("step_start", {
            step: `Agent Reasoning (Iteration ${iteration})`,
            toolIcon: "🧠",
            progress,
            message: "Thinking about next action..."
          }, "model");

          await logStep(`Reasoning Step ${iteration}`, "started", "llm", { iteration });

          // ============ CALL LLM WITH TOOLS ============
          const llmResponse = await fetch(LOVABLE_AI_ENDPOINT, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: AGENT_MODEL,
              messages,
              tools: AGENT_TOOLS,
              tool_choice: "auto",
              stream: true,
              max_tokens: 4096,
            }),
          });

          if (!llmResponse.ok) {
            const errorText = await llmResponse.text();
            console.error(`[AGENT] LLM error (${llmResponse.status}):`, errorText);
            
            if (llmResponse.status === 429) {
              await emit("error", { error: "Rate limited. Please wait and try again." });
              throw new Error("Rate limits exceeded");
            }
            if (llmResponse.status === 402) {
              await emit("error", { error: "Credits exhausted. Please add funds." });
              throw new Error("Payment required");
            }
            throw new Error(`LLM API error: ${llmResponse.status}`);
          }

          // ============ PROCESS STREAMING RESPONSE ============
          const reader = llmResponse.body?.getReader();
          const decoder = new TextDecoder();
          
          let assistantContent = "";
          let toolCalls: any[] = [];
          let buffer = "";

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const jsonStr = line.slice(5).trim();
                if (!jsonStr || jsonStr === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(jsonStr);
                  const delta = parsed.choices?.[0]?.delta;

                  // Stream content tokens to UI
                  if (delta?.content) {
                    assistantContent += delta.content;
                    fullResponseContent += delta.content;

                    await emit("token", {
                      token: delta.content,
                      fullContent: fullResponseContent,
                    }, "model");

                    // Update assistant message periodically
                    if (assistantMsgId && fullResponseContent.length % 100 === 0) {
                      await supabase.from("agent_chat_messages").update({
                        content: fullResponseContent,
                      }).eq("id", assistantMsgId);
                    }
                  }

                  // Collect tool calls
                  if (delta?.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      if (tc.index !== undefined) {
                        if (!toolCalls[tc.index]) {
                          toolCalls[tc.index] = {
                            id: tc.id || `call_${Date.now()}_${tc.index}`,
                            type: "function",
                            function: { name: "", arguments: "" }
                          };
                        }
                        if (tc.id) toolCalls[tc.index].id = tc.id;
                        if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
                        if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                      }
                    }
                  }
                } catch (e) {
                  // Skip malformed chunks
                }
              }
            }
          }

          // Add assistant message to context
          const assistantMessage: any = { role: "assistant", content: assistantContent };
          if (toolCalls.length > 0) {
            assistantMessage.tool_calls = toolCalls.filter(tc => tc?.function?.name);
          }
          messages.push(assistantMessage);

          await emit("step_end", {
            step: `Agent Reasoning (Iteration ${iteration})`,
            toolIcon: "🧠",
            hasToolCalls: toolCalls.length > 0,
            toolNames: toolCalls.map(tc => tc?.function?.name).filter(Boolean),
          }, "model");

          await logStep(`Reasoning Step ${iteration}`, "completed", "llm", { iteration }, {
            hasToolCalls: toolCalls.length > 0,
            toolCount: toolCalls.length,
          });

          // ============ EXECUTE TOOL CALLS ============
          if (toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
              if (!toolCall?.function?.name) continue;

              const toolName = toolCall.function.name;
              let toolArgs: any = {};
              
              try {
                toolArgs = JSON.parse(toolCall.function.arguments || "{}");
              } catch (e) {
                console.warn(`[AGENT] Failed to parse args for ${toolName}:`, toolCall.function.arguments);
                continue;
              }

              console.log(`[AGENT] Executing tool: ${toolName}`, toolArgs);

              await emit("step_start", {
                step: `Executing: ${toolName}`,
                toolIcon: TOOL_ICONS[toolName] || "⚙️",
                toolName,
                toolArgs,
                message: getToolActionMessage(toolName, toolArgs),
              }, toolName);

              await logStep(`Execute: ${toolName}`, "started", toolName, toolArgs);

              let toolResult: any;

              try {
                // ============ TOOL EXECUTION ============
                toolResult = await executeTool(toolName, toolArgs, {
                  supabase,
                  session_id,
                  user_id,
                  emit,
                });

                await emit("step_end", {
                  step: `Executing: ${toolName}`,
                  toolIcon: TOOL_ICONS[toolName] || "⚙️",
                  toolName,
                  success: true,
                  result: summarizeToolResult(toolResult),
                }, toolName);

                await logStep(`Execute: ${toolName}`, "completed", toolName, toolArgs, toolResult);

                // Handle special tools
                if (toolName === "think_and_plan" && toolResult.success) {
                  currentPlan = toolResult.plan;
                  await emit("plan_created", {
                    plan: currentPlan,
                    steps: currentPlan?.execution_plan || [],
                  }, "agent");
                }

                if (toolName === "finish" && toolResult.success) {
                  isComplete = true;
                }

              } catch (toolError) {
                console.error(`[AGENT] Tool error (${toolName}):`, toolError);
                
                toolResult = {
                  success: false,
                  error: toolError instanceof Error ? toolError.message : "Tool execution failed",
                };

                await emit("step_error", {
                  step: `Executing: ${toolName}`,
                  toolIcon: TOOL_ICONS[toolName] || "⚙️",
                  toolName,
                  error: toolResult.error,
                }, toolName);

                await logStep(`Execute: ${toolName}`, "failed", toolName, toolArgs, null, toolResult.error);
              }

              // Add tool result to conversation (observation)
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult),
              });
            }
          } else {
            // No tool calls - LLM gave a direct response
            // Check if response is substantial enough to consider complete
            if (assistantContent.length > 500 || iteration >= MAX_ITERATIONS - 1) {
              isComplete = true;
            }
          }
        }

        // ============ FINALIZE SESSION ============
        if (assistantMsgId) {
          await supabase.from("agent_chat_messages").update({
            content: fullResponseContent || "Analysis complete. Check the results in the workspace.",
            is_streaming: false,
          }).eq("id", assistantMsgId);
        }

        await supabase.from("agent_sessions").update({
          state: "completed",
          progress: 100,
          current_step: "completed",
          completed_at: new Date().toISOString(),
          metadata: {
            model: AGENT_MODEL,
            durationMs: Date.now() - startTime,
            iterations: iteration,
            plan: currentPlan,
          },
        }).eq("id", session_id);

        await emit("session_end", {
          sessionId: session_id,
          status: "completed",
          durationMs: Date.now() - startTime,
          iterations: iteration,
        }, "agent");

        await logStep("Task Complete", "completed", "finish", null, {
          iterations: iteration,
          durationMs: Date.now() - startTime,
        });

        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();

      } catch (error) {
        console.error(`[AGENT] Error:`, error);

        await emit("error", {
          error: error instanceof Error ? error.message : "Unknown error",
        }, "agent");

        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      }
    })();

    // Return SSE stream immediately
    return new Response(stream.readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error(`[AGENT] Fatal error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============ TOOL EXECUTION FUNCTION ============

async function executeTool(
  toolName: string,
  args: any,
  context: {
    supabase: any;
    session_id: string;
    user_id: string;
    emit: (type: string, data: any, node?: string) => Promise<void>;
  }
): Promise<any> {
  const { supabase, session_id, user_id, emit } = context;

  switch (toolName) {
    case "think_and_plan": {
      // Planning tool - return the plan for the agent to follow
      return {
        success: true,
        message: "Plan created successfully. Now executing...",
        plan: {
          task_understanding: args.task_understanding,
          reasoning: args.reasoning,
          execution_plan: args.execution_plan,
          success_criteria: args.success_criteria,
        },
      };
    }

    case "scrape_competitor_ads": {
      await emit("tool_progress", {
        toolName,
        message: `Searching Meta Ads Library for "${args.brand_name}"...`,
        progress: 10,
      }, toolName);

      const { data, error } = await supabase.functions.invoke("firecrawl-mcp-scraper", {
        body: {
          brandName: args.brand_name,
          maxAds: args.max_ads || 10,
          sessionId: session_id,
          userId: user_id,
        },
      });

      if (error) {
        console.error("[TOOL] scrape_competitor_ads error:", error);
        return { success: false, error: error.message, ads: [] };
      }

      const ads = data?.ads || [];
      const videoUrls = ads.filter((a: any) => a.videoUrl).map((a: any) => a.videoUrl);
      const thumbnails = ads.filter((a: any) => a.thumbnailUrl).map((a: any) => a.thumbnailUrl);

      return {
        success: true,
        adsFound: ads.length,
        videoUrls,
        thumbnails,
        ads: ads.slice(0, 5).map((ad: any) => ({
          advertiser: ad.advertiser,
          adCopy: ad.adCopy?.substring(0, 200),
          hasVideo: !!ad.videoUrl,
          hasThumbnail: !!ad.thumbnailUrl,
        })),
        screenshotUrl: data?.screenshotUrl,
      };
    }

    case "download_videos": {
      if (!args.video_urls?.length) {
        return { success: true, downloaded: 0, message: "No video URLs provided" };
      }

      await emit("tool_progress", {
        toolName,
        message: `Downloading ${args.video_urls.length} videos...`,
        progress: 20,
      }, toolName);

      const { data, error } = await supabase.functions.invoke("video-download-service", {
        body: {
          videoUrls: args.video_urls.slice(0, 5), // Limit to 5
          sessionId: session_id,
        },
      });

      if (error) {
        console.error("[TOOL] download_videos error:", error);
        return { success: false, error: error.message, downloaded: 0 };
      }

      const results = data?.results?.filter((r: any) => r.success) || [];
      return {
        success: true,
        downloaded: results.length,
        storagePaths: results.map((r: any) => r.storagePath),
      };
    }

    case "analyze_visuals": {
      if (!args.image_urls?.length) {
        return { success: false, error: "No images provided for analysis" };
      }

      await emit("tool_progress", {
        toolName,
        message: `Analyzing ${args.image_urls.length} ad creatives with AI vision...`,
        progress: 40,
      }, toolName);

      // Use Gemini 2.5 Flash for vision analysis (more reliable than 3-pro-preview)
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      
      if (!lovableApiKey) {
        return { success: false, error: "Vision API not configured" };
      }

      try {
        const imageContent = args.image_urls.slice(0, 5).map((url: string) => ({
          type: "image_url",
          image_url: { url, detail: "high" },
        }));

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are an expert ad creative analyst. Analyze the provided ad images and extract: 1) Hook elements (what grabs attention in first 3 seconds), 2) Visual quality score (1-10), 3) Key messaging, 4) CTA analysis, 5) Recommendations for improvement. Be specific and actionable."
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Analyze these ad creatives for the brand.${args.ad_copy ? ` Ad copy: "${args.ad_copy}"` : ""}${args.brand_context ? ` Brand context: ${args.brand_context}` : ""}\n\nProvide detailed analysis in JSON format with: hookAnalysis, visualScore, keyMessages, ctaAnalysis, recommendations.`,
                  },
                  ...imageContent,
                ],
              },
            ],
            max_tokens: 2048,
          }),
        });

        if (!response.ok) {
          throw new Error(`Vision API error: ${response.status}`);
        }

        const result = await response.json();
        const analysisText = result.choices?.[0]?.message?.content || "";

        // Try to parse as JSON, fallback to text
        let analysis;
        try {
          analysis = JSON.parse(analysisText);
        } catch {
          analysis = { raw_analysis: analysisText };
        }

        return {
          success: true,
          imagesAnalyzed: args.image_urls.length,
          analysis,
        };
      } catch (err) {
        console.error("[TOOL] analyze_visuals error:", err);
        return { success: false, error: err instanceof Error ? err.message : "Vision analysis failed" };
      }
    }

    case "search_web": {
      const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
      
      if (!firecrawlApiKey) {
        return { success: false, error: "Web search not configured" };
      }

      await emit("tool_progress", {
        toolName,
        message: `Searching: "${args.query}"...`,
        progress: 30,
      }, toolName);

      try {
        const mcpEndpoint = `https://mcp.firecrawl.dev/${firecrawlApiKey}/v2/mcp`;
        const response = await fetch(mcpEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method: "tools/call",
            params: {
              name: "firecrawl_search",
              arguments: {
                query: args.query,
                limit: args.num_results || 5,
              },
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const results = data.result?.content || [];
          return {
            success: true,
            resultsFound: results.length,
            results: Array.isArray(results) ? results.slice(0, 5).map((r: any) => ({
              title: r.title,
              url: r.url,
              snippet: r.description?.substring(0, 200),
            })) : [],
          };
        }

        throw new Error("Search request failed");
      } catch (err) {
        console.error("[TOOL] search_web error:", err);
        return { success: false, error: "Web search temporarily unavailable", results: [] };
      }
    }

    case "synthesize_report": {
      await emit("tool_progress", {
        toolName,
        message: "Synthesizing comprehensive report...",
        progress: 80,
      }, toolName);

      // Store report data in database
      const reportData = {
        brand_name: args.brand_name,
        ads_analyzed: args.ads_analyzed || 0,
        key_findings: args.key_findings || [],
        hook_patterns: args.hook_patterns || [],
        script_insights: args.script_insights || [],
        recommendations: args.recommendations || [],
        generated_at: new Date().toISOString(),
      };

      try {
        await supabase.from("ad_audit_reports").insert({
          session_id,
          user_id,
          brand_name: args.brand_name,
          status: "completed",
          report_data: reportData,
        });
      } catch (e) {
        console.warn("[TOOL] Failed to store report:", e);
      }

      return {
        success: true,
        reportGenerated: true,
        summary: `Analysis complete for ${args.brand_name}. Found ${args.key_findings?.length || 0} key insights and ${args.recommendations?.length || 0} recommendations.`,
        report: reportData,
      };
    }

    case "finish": {
      return {
        success: true,
        completed: true,
        summary: args.summary,
        results_delivered: args.results_delivered,
        next_steps: args.next_steps || [],
      };
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

// ============ HELPER FUNCTIONS ============

function getToolActionMessage(toolName: string, args: any): string {
  switch (toolName) {
    case "think_and_plan":
      return "Analyzing task and creating execution plan...";
    case "scrape_competitor_ads":
      return `Searching for "${args.brand_name}" ads on Meta Ads Library...`;
    case "download_videos":
      return `Downloading ${args.video_urls?.length || 0} videos for analysis...`;
    case "analyze_visuals":
      return `Analyzing ${args.image_urls?.length || 0} ad creatives with AI vision...`;
    case "search_web":
      return `Searching: "${args.query}"...`;
    case "synthesize_report":
      return `Creating comprehensive report for ${args.brand_name}...`;
    case "finish":
      return "Completing task and delivering results...";
    default:
      return `Executing ${toolName}...`;
  }
}

function summarizeToolResult(result: any): any {
  if (!result) return { status: "unknown" };
  
  // Return a compact summary for UI display
  return {
    success: result.success,
    ...(result.adsFound !== undefined && { adsFound: result.adsFound }),
    ...(result.downloaded !== undefined && { downloaded: result.downloaded }),
    ...(result.imagesAnalyzed !== undefined && { imagesAnalyzed: result.imagesAnalyzed }),
    ...(result.resultsFound !== undefined && { resultsFound: result.resultsFound }),
    ...(result.reportGenerated !== undefined && { reportGenerated: result.reportGenerated }),
    ...(result.error && { error: result.error }),
  };
}
