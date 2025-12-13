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

// Tool definitions for the LangChain-style agent
const TOOLS = [
  {
    name: "scrape_meta_ads",
    description: "Scrape Meta Ads Library for brand's ad creatives using Firecrawl MCP",
    parameters: {
      type: "object",
      properties: {
        brandName: { type: "string", description: "The brand name to search for" },
        maxAds: { type: "number", description: "Maximum number of ads to scrape" },
      },
      required: ["brandName"],
    },
  },
  {
    name: "download_video",
    description: "Download video assets from URLs to Supabase Storage",
    parameters: {
      type: "object",
      properties: {
        videoUrls: { type: "array", items: { type: "string" } },
        sessionId: { type: "string" },
      },
      required: ["videoUrls", "sessionId"],
    },
  },
  {
    name: "analyze_ad_creative",
    description: "Analyze ad screenshots and frames using Gemini 3 Pro Vision",
    parameters: {
      type: "object",
      properties: {
        screenshots: { type: "array", items: { type: "string" } },
        frames: { type: "array", items: { type: "string" } },
        adCopy: { type: "string" },
        brandContext: { type: "string" },
      },
      required: ["screenshots", "adCopy"],
    },
  },
  {
    name: "search_brand_niche",
    description: "Search for brand information and competitor landscape",
    parameters: {
      type: "object",
      properties: {
        brandName: { type: "string" },
        category: { type: "string" },
      },
      required: ["brandName"],
    },
  },
];

// Lovable AI Gateway configuration
const LOVABLE_AI_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
// Using gemini-2.5-flash as it properly supports tool calling without thought_signature issues
const DEFAULT_MODEL = "google/gemini-2.5-flash";

// Tool icons mapping
const toolIcons: Record<string, string> = {
  scrape_meta_ads: "🔥",
  download_video: "⬇️",
  extract_video_frames: "🎬",
  analyze_ad_creative: "👁️",
  search_brand_niche: "🔎",
  generate_audit_report: "📄",
  model: "🤖",
  llm: "🧠",
  gemini: "✨",
  firecrawl: "🔥",
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
      maxAds = 10,
      streamModes = ["updates", "messages", "custom"] 
    } = body;

    const session_id = sessionId || body.session_id || crypto.randomUUID();
    const user_id = userId || body.user_id;
    const userPrompt = prompt || body.prompt || `Analyze ads for ${brandName || "brand"}`;

    console.log(`[AGENT-STREAM] Starting LangChain agent for session: ${session_id}, brand: ${brandName}`);

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
        console.error(`[AGENT-STREAM] Log error:`, e);
      }

      if (streamModes.includes("updates")) {
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
      }

      if (streamModes.includes("custom") && (inputData || outputData)) {
        await emitEvent({
          mode: "custom",
          type: "tool_data",
          step: stepName,
          data: { input: inputData, output: outputData, error: errorMessage },
          timestamp: new Date().toISOString(),
        });
      }
    };

    // Process the stream in background
    (async () => {
      try {
        // Session start event
        await emitEvent({
          mode: "updates",
          type: "session_start",
          data: { sessionId: session_id, brandName, model: DEFAULT_MODEL },
          timestamp: new Date().toISOString(),
        });

        // Create/update session
        await supabase.from("agent_sessions").upsert({
          id: session_id,
          user_id,
          state: "running",
          progress: 0,
          current_step: "initializing",
          title: `Ad Audit: ${brandName || "Brand"}`,
          metadata: { brandName, model: DEFAULT_MODEL, startedAt: new Date().toISOString() },
        });

        await logAndEmit("Initializing Agent", "started", "gemini", { brandName, model: DEFAULT_MODEL }, null, null, 5);

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

        await logAndEmit("Initializing Agent", "completed", "gemini", null, { status: "ready" }, null, 10);

        // Workflow data collection
        const workflowData = {
          scrapedAds: [] as any[],
          downloadedVideos: [] as any[],
          visualAnalyses: [] as any[],
          brandResearch: null as any,
        };

        // ============ TOOL EXECUTION LOOP ============
        const agentMessages: any[] = [
          {
            role: "system",
            content: `You are Charis, an expert AI ad auditor powered by Gemini 3 Pro. Analyze Meta Ads for "${brandName || "brand"}".

Available tools:
${TOOLS.map(t => `- ${t.name}: ${t.description}`).join("\n")}

Workflow:
1. Use scrape_meta_ads to gather ad creatives from Meta Ads Library
2. For video ads, use download_video to save them
3. Use analyze_ad_creative with Gemini Vision to analyze creatives
4. Use search_brand_niche to understand competitive landscape
5. Provide actionable recommendations

Be thorough but efficient. Focus on hook effectiveness, script structure, and actionable insights.`,
          },
          {
            role: "user",
            content: `Perform a comprehensive ad audit for "${brandName}".\n\n${attachedUrls?.length ? `Also analyze these URLs: ${attachedUrls.map((u: any) => u.url).join(", ")}` : ""}\n\nProvide:\n1. Hook analysis (first 3 seconds)\n2. Script breakdown (problem → solution → CTA)\n3. Visual quality assessment\n4. 2 actionable recommendations`,
          },
        ];

        let iteration = 0;
        const maxIterations = 8;
        let isComplete = false;
        let fullContent = "";

        while (iteration < maxIterations && !isComplete) {
          iteration++;
          const progress = Math.min(10 + iteration * 10, 85);

          await supabase.from("agent_sessions").update({
            progress,
            current_step: `iteration_${iteration}`,
            updated_at: new Date().toISOString(),
          }).eq("id", session_id);

          await logAndEmit(`Agent Iteration ${iteration}`, "started", "model", { iteration }, null, null, progress);

          // Call Lovable AI with tool definitions
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
            console.error(`[AGENT-STREAM] LLM error:`, errorText);
            
            if (response.status === 429) throw new Error("Rate limits exceeded. Please try again later.");
            if (response.status === 402) throw new Error("Payment required. Please add funds to Lovable AI.");
            throw new Error(`LLM API error: ${response.status}`);
          }

          // Process streaming response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let assistantMessage: any = { role: "assistant", content: "", tool_calls: [] };
          let currentToolCall: any = null;

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
                  
                  if (delta?.content) {
                    assistantMessage.content += delta.content;
                    fullContent += delta.content;

                    // Stream token to client
                    if (streamModes.includes("messages")) {
                      await emitEvent({
                        mode: "messages",
                        type: "token",
                        node: "model",
                        data: { token: delta.content, fullContent },
                        timestamp: new Date().toISOString(),
                      });
                    }

                    // Update assistant message in DB (throttled)
                    if (assistantMsgId && fullContent.length % 50 === 0) {
                      await supabase.from("agent_chat_messages").update({
                        content: fullContent,
                        updated_at: new Date().toISOString(),
                      }).eq("id", assistantMsgId);
                    }
                  }

                  // Handle tool calls in streaming
                  if (delta?.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      if (tc.index !== undefined) {
                        if (!assistantMessage.tool_calls[tc.index]) {
                          assistantMessage.tool_calls[tc.index] = { id: tc.id, type: "function", function: { name: "", arguments: "" } };
                        }
                        if (tc.function?.name) assistantMessage.tool_calls[tc.index].function.name += tc.function.name;
                        if (tc.function?.arguments) assistantMessage.tool_calls[tc.index].function.arguments += tc.function.arguments;
                      }
                    }
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }

          agentMessages.push(assistantMessage);

          // Execute tool calls if any
          if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
            for (const toolCall of assistantMessage.tool_calls) {
              if (!toolCall?.function?.name) continue;
              
              const toolName = toolCall.function.name;
              let toolArgs: any = {};
              try {
                toolArgs = JSON.parse(toolCall.function.arguments || "{}");
              } catch (e) {
                console.warn(`[AGENT-STREAM] Invalid tool args for ${toolName}`);
              }

              console.log(`[AGENT-STREAM] Executing tool: ${toolName}`, toolArgs);
              await logAndEmit(`Tool: ${toolName}`, "started", toolName, toolArgs, null, null, progress);

              let toolResult: any;

              try {
                switch (toolName) {
                  case "scrape_meta_ads": {
                    const { data, error } = await supabase.functions.invoke("firecrawl-mcp-scraper", {
                      body: {
                        brandName: toolArgs.brandName || brandName,
                        maxAds: toolArgs.maxAds || maxAds,
                        sessionId: session_id,
                        userId: user_id,
                      },
                    });
                    if (error) throw error;
                    workflowData.scrapedAds = data?.ads || [];
                    toolResult = { success: true, adsFound: workflowData.scrapedAds.length, ads: workflowData.scrapedAds.slice(0, 3) };
                    break;
                  }

                  case "download_video": {
                    const { data, error } = await supabase.functions.invoke("video-download-service", {
                      body: {
                        videoUrls: toolArgs.videoUrls,
                        sessionId: toolArgs.sessionId || session_id,
                      },
                    });
                    if (error) throw error;
                    workflowData.downloadedVideos = data?.results?.filter((r: any) => r.success) || [];
                    toolResult = { success: true, downloaded: workflowData.downloadedVideos.length };
                    break;
                  }

                  case "analyze_ad_creative": {
                    const { data, error } = await supabase.functions.invoke("gemini-vision-analysis", {
                      body: {
                        screenshots: toolArgs.screenshots || [],
                        frames: toolArgs.frames || [],
                        adCopy: toolArgs.adCopy,
                        brandContext: toolArgs.brandContext || brandName,
                      },
                    });
                    if (error) throw error;
                    workflowData.visualAnalyses.push(data);
                    toolResult = { success: true, analysis: data };
                    break;
                  }

                  case "search_brand_niche": {
                    if (firecrawlApiKey) {
                      try {
                        const mcpEndpoint = `https://mcp.firecrawl.dev/${firecrawlApiKey}/v2/mcp`;
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
                                query: `${toolArgs.brandName || brandName} ${toolArgs.category || ""} brand competitors market`,
                                limit: 5,
                              },
                            },
                          }),
                        });

                        if (searchResponse.ok) {
                          const searchData = await searchResponse.json();
                          workflowData.brandResearch = searchData.result?.content || null;
                          toolResult = { success: true, research: workflowData.brandResearch };
                        } else {
                          throw new Error("Search failed");
                        }
                      } catch (e) {
                        console.warn(`[AGENT-STREAM] Search fallback:`, e);
                        toolResult = { success: false, error: "Search temporarily unavailable" };
                      }
                    } else {
                      toolResult = { success: false, error: "Firecrawl not configured" };
                    }
                    break;
                  }

                  default:
                    toolResult = { error: `Unknown tool: ${toolName}` };
                }

                await logAndEmit(`Tool: ${toolName}`, "completed", toolName, toolArgs, toolResult, null, progress + 5);
              } catch (toolError) {
                console.error(`[AGENT-STREAM] Tool error:`, toolError);
                toolResult = { error: toolError instanceof Error ? toolError.message : "Tool failed" };
                await logAndEmit(`Tool: ${toolName}`, "failed", toolName, toolArgs, null, toolResult.error, progress);
              }

              agentMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult),
              });
            }
          } else {
            // No tool calls - check if done
            const content = assistantMessage.content || "";
            if (content.length > 200 || iteration >= maxIterations - 1) {
              isComplete = true;
            }
          }

          await logAndEmit(`Agent Iteration ${iteration}`, "completed", "model", null, { tokensGenerated: fullContent.length }, null, progress + 5);
        }

        // Finalize assistant message
        if (assistantMsgId) {
          await supabase.from("agent_chat_messages").update({
            content: fullContent || "Analysis completed. Check the workspace for detailed results.",
            is_streaming: false,
            updated_at: new Date().toISOString(),
          }).eq("id", assistantMsgId);
        }

        await logAndEmit("Analysis Complete", "completed", "llm", null, {
          adsFound: workflowData.scrapedAds.length,
          videosDownloaded: workflowData.downloadedVideos.length,
          analysesGenerated: workflowData.visualAnalyses.length,
        }, null, 100);

        // Update session as completed
        await supabase.from("agent_sessions").update({
          state: "completed",
          progress: 100,
          current_step: "completed",
          completed_at: new Date().toISOString(),
          metadata: {
            brandName,
            model: DEFAULT_MODEL,
            durationMs: Date.now() - startTime,
            adsFound: workflowData.scrapedAds.length,
            videosDownloaded: workflowData.downloadedVideos.length,
          },
        }).eq("id", session_id);

        // Session end event
        await emitEvent({
          mode: "updates",
          type: "session_end",
          data: {
            sessionId: session_id,
            status: "completed",
            model: DEFAULT_MODEL,
            adsFound: workflowData.scrapedAds.length,
            durationMs: Date.now() - startTime,
          },
          timestamp: new Date().toISOString(),
        });

        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      } catch (error) {
        console.error(`[AGENT-STREAM] Stream error:`, error);

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
    console.error(`[AGENT-STREAM] Fatal error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
