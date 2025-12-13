import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// LangChain-style streaming modes
type StreamMode = "updates" | "messages" | "custom";

interface StreamEvent {
  mode: StreamMode;
  type: string;
  data: any;
  timestamp: string;
  step?: string;
  node?: string;
}

// Tool definitions - the agent can use these based on its plan
const TOOLS = [
  {
    name: "plan_task",
    description: "Create an execution plan for the given task. Always call this FIRST to analyze the task and decide which tools to use.",
    parameters: {
      type: "object",
      properties: {
        task_analysis: { type: "string", description: "Your analysis of what the user wants" },
        steps: { 
          type: "array", 
          items: { 
            type: "object",
            properties: {
              step_number: { type: "number" },
              action: { type: "string" },
              tool_to_use: { type: "string" },
              reasoning: { type: "string" },
            },
          },
          description: "Ordered list of steps to execute" 
        },
        expected_outcome: { type: "string", description: "What the final result should look like" },
      },
      required: ["task_analysis", "steps", "expected_outcome"],
    },
  },
  {
    name: "scrape_meta_ads",
    description: "Scrape Meta Ads Library for a brand's active ad creatives. Returns ad URLs, screenshots, video URLs, and ad copy.",
    parameters: {
      type: "object",
      properties: {
        brandName: { type: "string", description: "The brand/advertiser name to search for" },
        maxAds: { type: "number", description: "Maximum number of ads to retrieve (default: 10)" },
      },
      required: ["brandName"],
    },
  },
  {
    name: "download_video",
    description: "Download video files from URLs and store them for analysis.",
    parameters: {
      type: "object",
      properties: {
        videoUrls: { type: "array", items: { type: "string" }, description: "Array of video URLs to download" },
      },
      required: ["videoUrls"],
    },
  },
  {
    name: "analyze_ad_creative",
    description: "Analyze ad images/screenshots using AI vision to extract hooks, messaging, visual elements, and effectiveness insights.",
    parameters: {
      type: "object",
      properties: {
        imageUrls: { type: "array", items: { type: "string" }, description: "URLs of images/screenshots to analyze" },
        adCopy: { type: "string", description: "The ad copy/text to analyze alongside visuals" },
        context: { type: "string", description: "Additional context about the brand/campaign" },
      },
      required: ["imageUrls"],
    },
  },
  {
    name: "search_web",
    description: "Search the web for information about brands, competitors, market trends, or any topic.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        limit: { type: "number", description: "Number of results to return (default: 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "complete_task",
    description: "Mark the task as complete and provide the final response to the user. Call this when all planned steps are done.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Summary of what was accomplished" },
        key_findings: { type: "array", items: { type: "string" }, description: "List of key findings/insights" },
        recommendations: { type: "array", items: { type: "string" }, description: "Actionable recommendations" },
      },
      required: ["summary", "key_findings"],
    },
  },
];

// Lovable AI Gateway configuration
const LOVABLE_AI_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

// Tool icons for UI display
const toolIcons: Record<string, string> = {
  plan_task: "📋",
  scrape_meta_ads: "🔥",
  download_video: "⬇️",
  analyze_ad_creative: "👁️",
  search_web: "🔎",
  complete_task: "✅",
  model: "🤖",
  llm: "🧠",
  thinking: "💭",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
  const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");

  const supabase = createClient(supabaseUrl, supabaseKey);
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { 
      sessionId, 
      userId, 
      prompt, 
      brandName,
      attachedUrls,
      streamModes = ["updates", "messages", "custom"] 
    } = body;

    const session_id = sessionId || crypto.randomUUID();
    const user_id = userId;
    const userPrompt = prompt || `Analyze ads for ${brandName || "brand"}`;

    console.log(`[AGENT] Starting autonomous agent for session: ${session_id}`);

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Helper to emit SSE events
    const emitEvent = async (event: StreamEvent) => {
      const sseData = `data: ${JSON.stringify(event)}\n\n`;
      await writer.write(encoder.encode(sseData));
    };

    // Helper for logging and emitting
    const logAndEmit = async (
      stepName: string,
      status: "started" | "completed" | "failed",
      toolName: string | null,
      inputData: any = null,
      outputData: any = null,
      errorMessage: string | null = null,
      progressPercent: number | null = null
    ) => {
      const logEntry = {
        session_id,
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
      };

      try {
        await supabase.from("agent_execution_logs").insert(logEntry);
      } catch (e) {
        console.error(`[AGENT] Log error:`, e);
      }

      // Emit update event
      await emitEvent({
        mode: "updates",
        type: status === "started" ? "step_start" : status === "completed" ? "step_end" : "step_error",
        step: stepName,
        node: toolName || "agent",
        data: {
          stepName,
          status,
          toolName,
          toolIcon: toolName ? toolIcons[toolName] || "⚙️" : null,
          progressPercent,
          ...(outputData || {}),
        },
        timestamp: new Date().toISOString(),
      });

      // Emit custom event for detailed data
      if (inputData || outputData) {
        await emitEvent({
          mode: "custom",
          type: "tool_data",
          step: stepName,
          data: { input: inputData, output: outputData, error: errorMessage },
          timestamp: new Date().toISOString(),
        });
      }
    };

    // Execute tool based on name
    const executeTool = async (toolName: string, toolArgs: any): Promise<any> => {
      console.log(`[AGENT] Executing tool: ${toolName}`, toolArgs);
      
      switch (toolName) {
        case "plan_task": {
          // Planning is handled by the LLM - just log the plan
          return { 
            success: true, 
            plan: toolArgs,
            message: "Plan created successfully. Proceeding with execution." 
          };
        }

        case "scrape_meta_ads": {
          const { data, error } = await supabase.functions.invoke("firecrawl-mcp-scraper", {
            body: {
              brandName: toolArgs.brandName,
              maxAds: toolArgs.maxAds || 10,
              sessionId: session_id,
              userId: user_id,
            },
          });
          if (error) throw error;
          const ads = data?.ads || [];
          return { 
            success: true, 
            adsFound: ads.length, 
            ads: ads.slice(0, 5),
            videoUrls: ads.filter((a: any) => a.videoUrl).map((a: any) => a.videoUrl),
          };
        }

        case "download_video": {
          const { data, error } = await supabase.functions.invoke("video-download-service", {
            body: {
              videoUrls: toolArgs.videoUrls,
              sessionId: session_id,
            },
          });
          if (error) throw error;
          const results = data?.results?.filter((r: any) => r.success) || [];
          return { success: true, downloaded: results.length, videos: results };
        }

        case "analyze_ad_creative": {
          const { data, error } = await supabase.functions.invoke("gemini-vision-analysis", {
            body: {
              screenshots: toolArgs.imageUrls || [],
              frames: [],
              adCopy: toolArgs.adCopy || "",
              brandContext: toolArgs.context || "",
            },
          });
          if (error) throw error;
          return { success: true, analysis: data };
        }

        case "search_web": {
          if (!firecrawlApiKey) {
            return { success: false, error: "Search not configured" };
          }
          
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
                    query: toolArgs.query,
                    limit: toolArgs.limit || 5,
                  },
                },
              }),
            });

            if (response.ok) {
              const data = await response.json();
              return { success: true, results: data.result?.content || [] };
            }
            throw new Error("Search request failed");
          } catch (e) {
            return { success: false, error: "Search temporarily unavailable" };
          }
        }

        case "complete_task": {
          return { 
            success: true, 
            completed: true,
            summary: toolArgs.summary,
            key_findings: toolArgs.key_findings,
            recommendations: toolArgs.recommendations,
          };
        }

        default:
          return { error: `Unknown tool: ${toolName}` };
      }
    };

    // Process the stream in background
    (async () => {
      try {
        // Session start
        await emitEvent({
          mode: "updates",
          type: "session_start",
          data: { sessionId: session_id, model: DEFAULT_MODEL },
          timestamp: new Date().toISOString(),
        });

        // Create/update session
        await supabase.from("agent_sessions").upsert({
          id: session_id,
          user_id,
          state: "running",
          progress: 0,
          current_step: "initializing",
          title: brandName ? `Ad Audit: ${brandName}` : "Agent Task",
          metadata: { model: DEFAULT_MODEL, startedAt: new Date().toISOString() },
        });

        await logAndEmit("Initializing Agent", "started", "thinking", { task: userPrompt }, null, null, 5);

        // Store user message
        await supabase.from("agent_chat_messages").insert({
          session_id,
          role: "user",
          content: userPrompt,
          metadata: { attachedUrls },
        });

        // Create streaming assistant placeholder
        const { data: assistantMsg } = await supabase.from("agent_chat_messages").insert({
          session_id,
          role: "assistant",
          content: "",
          is_streaming: true,
        }).select().single();
        const assistantMsgId = assistantMsg?.id;

        await logAndEmit("Initializing Agent", "completed", "thinking", null, { status: "ready" }, null, 10);

        // ============ AUTONOMOUS AGENT LOOP ============
        // The LLM is the brain - it analyzes, plans, and decides what tools to use
        
        const systemPrompt = `You are Charis, an autonomous AI agent specialized in ad analysis and competitor research.

## Your Capabilities
You have access to these tools:
${TOOLS.map(t => `- ${t.name}: ${t.description}`).join("\n")}

## How You Work
1. **FIRST**: Always call plan_task to analyze the user's request and create an execution plan
2. **THEN**: Execute your plan step by step, calling the appropriate tools
3. **FINALLY**: Call complete_task when done to summarize findings

## Important Rules
- Always start by planning - understand the task before acting
- Execute tools in the order that makes sense for the task
- If a tool fails, adapt your plan and try alternatives
- Provide clear, actionable insights in your final response
- Be autonomous - don't ask for clarification, make reasonable assumptions

## Response Style
- Be concise but thorough
- Focus on actionable insights
- Use structured formats for clarity`;

        const agentMessages: any[] = [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `${userPrompt}${attachedUrls?.length ? `\n\nAlso analyze these URLs: ${attachedUrls.map((u: any) => u.url).join(", ")}` : ""}` 
          },
        ];

        let iteration = 0;
        const maxIterations = 12;
        let isComplete = false;
        let fullContent = "";
        let currentPlan: any = null;

        while (iteration < maxIterations && !isComplete) {
          iteration++;
          const baseProgress = Math.min(10 + iteration * 7, 90);

          await supabase.from("agent_sessions").update({
            progress: baseProgress,
            current_step: `iteration_${iteration}`,
          }).eq("id", session_id);

          await logAndEmit(`Agent Thinking (Step ${iteration})`, "started", "llm", { iteration }, null, null, baseProgress);

          // Call LLM with tools
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
                function: { name: t.name, description: t.description, parameters: t.parameters },
              })),
              tool_choice: "auto",
              stream: true,
              max_completion_tokens: 4096,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[AGENT] LLM error:`, errorText);
            if (response.status === 429) throw new Error("Rate limits exceeded. Please try again later.");
            if (response.status === 402) throw new Error("Payment required. Please add funds to Lovable AI.");
            throw new Error(`LLM API error: ${response.status}`);
          }

          // Process streaming response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let assistantMessage: any = { role: "assistant", content: "", tool_calls: [] };

          if (reader) {
            let buffer = "";
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const jsonStr = line.slice(5).trim();
                if (jsonStr === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(jsonStr);
                  const delta = parsed.choices?.[0]?.delta;
                  
                  // Stream content tokens
                  if (delta?.content) {
                    assistantMessage.content += delta.content;
                    fullContent += delta.content;

                    await emitEvent({
                      mode: "messages",
                      type: "token",
                      node: "model",
                      data: { token: delta.content, fullContent },
                      timestamp: new Date().toISOString(),
                    });

                    // Update DB periodically
                    if (assistantMsgId && fullContent.length % 50 === 0) {
                      await supabase.from("agent_chat_messages").update({
                        content: fullContent,
                      }).eq("id", assistantMsgId);
                    }
                  }

                  // Handle tool calls
                  if (delta?.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      if (tc.index !== undefined) {
                        if (!assistantMessage.tool_calls[tc.index]) {
                          assistantMessage.tool_calls[tc.index] = { 
                            id: tc.id, 
                            type: "function", 
                            function: { name: "", arguments: "" } 
                          };
                        }
                        if (tc.function?.name) assistantMessage.tool_calls[tc.index].function.name += tc.function.name;
                        if (tc.function?.arguments) assistantMessage.tool_calls[tc.index].function.arguments += tc.function.arguments;
                      }
                    }
                  }
                } catch (e) {
                  // Skip invalid JSON chunks
                }
              }
            }
          }

          agentMessages.push(assistantMessage);
          await logAndEmit(`Agent Thinking (Step ${iteration})`, "completed", "llm", null, { hasToolCalls: assistantMessage.tool_calls.length > 0 }, null, baseProgress + 3);

          // Execute tool calls if any
          if (assistantMessage.tool_calls?.length > 0) {
            for (const toolCall of assistantMessage.tool_calls) {
              if (!toolCall?.function?.name) continue;
              
              const toolName = toolCall.function.name;
              let toolArgs: any = {};
              try {
                toolArgs = JSON.parse(toolCall.function.arguments || "{}");
              } catch (e) {
                console.warn(`[AGENT] Invalid tool args for ${toolName}`);
                continue;
              }

              await logAndEmit(`Executing: ${toolName}`, "started", toolName, toolArgs, null, null, baseProgress + 5);

              let toolResult: any;
              try {
                toolResult = await executeTool(toolName, toolArgs);
                await logAndEmit(`Executing: ${toolName}`, "completed", toolName, toolArgs, toolResult, null, baseProgress + 7);

                // Check if plan_task was called - store the plan
                if (toolName === "plan_task" && toolResult.success) {
                  currentPlan = toolArgs;
                  await emitEvent({
                    mode: "custom",
                    type: "plan_created",
                    data: { plan: currentPlan },
                    timestamp: new Date().toISOString(),
                  });
                }

                // Check if task is complete
                if (toolName === "complete_task" && toolResult.success) {
                  isComplete = true;
                }
              } catch (toolError) {
                console.error(`[AGENT] Tool error:`, toolError);
                toolResult = { error: toolError instanceof Error ? toolError.message : "Tool failed" };
                await logAndEmit(`Executing: ${toolName}`, "failed", toolName, toolArgs, null, toolResult.error, baseProgress);
              }

              // Add tool result back to conversation
              agentMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult),
              });
            }
          } else {
            // No tool calls - LLM provided a direct response
            // Check if we should continue or are done
            const content = assistantMessage.content || "";
            if (content.length > 300 || iteration >= maxIterations - 1) {
              isComplete = true;
            }
          }
        }

        // Finalize
        if (assistantMsgId) {
          await supabase.from("agent_chat_messages").update({
            content: fullContent || "Task completed. Check the workspace for results.",
            is_streaming: false,
          }).eq("id", assistantMsgId);
        }

        await logAndEmit("Task Complete", "completed", "complete_task", null, { 
          iterations: iteration,
          plan: currentPlan,
        }, null, 100);

        await supabase.from("agent_sessions").update({
          state: "completed",
          progress: 100,
          current_step: "completed",
          completed_at: new Date().toISOString(),
          metadata: {
            model: DEFAULT_MODEL,
            durationMs: Date.now() - startTime,
            iterations: iteration,
            plan: currentPlan,
          },
        }).eq("id", session_id);

        await emitEvent({
          mode: "updates",
          type: "session_end",
          data: { sessionId: session_id, status: "completed", durationMs: Date.now() - startTime },
          timestamp: new Date().toISOString(),
        });

        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      } catch (error) {
        console.error(`[AGENT] Error:`, error);

        await logAndEmit("Error", "failed", null, null, null, 
          error instanceof Error ? error.message : "Unknown error", null);

        await emitEvent({
          mode: "updates",
          type: "error",
          data: { error: error instanceof Error ? error.message : "Unknown error" },
          timestamp: new Date().toISOString(),
        });

        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      }
    })();

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
