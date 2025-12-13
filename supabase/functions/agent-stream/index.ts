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
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { sessionId, userId, prompt, brandName, streamModes = ["updates", "messages", "custom"] } = body;

    // Also support legacy format
    const session_id = sessionId || body.session_id;
    const user_id = userId || body.user_id;
    const userPrompt = prompt || body.prompt;

    if (!session_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing sessionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AGENT-STREAM] Starting LangChain-style stream for session: ${session_id}, modes: ${streamModes.join(",")}`);

    // Create a TransformStream for Server-Sent Events (SSE)
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Helper to emit events in LangChain format
    const emitEvent = async (event: StreamEvent) => {
      const sseData = `data: ${JSON.stringify(event)}\n\n`;
      await writer.write(encoder.encode(sseData));
    };

    // Tool icons mapping
    const toolIcons: Record<string, string> = {
      scrape: "🔥", download: "⬇️", frames: "🎬", vision: "👁️",
      search: "🔎", report: "📄", embed: "🧮", llm: "🧠",
      firecrawl: "🔥", gemini: "✨", mcp: "🔌", model: "🤖",
    };

    // Helper for logging with streaming
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
        duration_ms: null,
      };

      // Insert to database
      try {
        await supabase.from("agent_execution_logs").insert(logEntry);
      } catch (e) {
        console.error(`[AGENT-STREAM] Log error:`, e);
      }

      // Emit streaming event based on mode
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

    // Process the stream in the background
    (async () => {
      try {
        // Initial event - session_start
        await emitEvent({
          mode: "updates",
          type: "session_start",
          data: { sessionId: session_id, brandName: brandName || "Brand", model: DEFAULT_MODEL },
          timestamp: new Date().toISOString(),
        });

        await logAndEmit("Initializing Agent", "started", "gemini", { brandName, model: DEFAULT_MODEL }, null, null, 5);

        // Store user message
        await supabase.from("agent_chat_messages").insert({
          session_id,
          role: "user",
          content: userPrompt || `Analyze brand`,
        });

        // Create assistant placeholder for streaming
        const { data: assistantMsg } = await supabase.from("agent_chat_messages").insert({
          session_id,
          role: "assistant",
          content: "",
          is_streaming: true,
        }).select().single();

        const assistantMsgId = assistantMsg?.id;

        await logAndEmit("Initializing Agent", "completed", "gemini", null, { status: "ready" }, null, 10);

        // Stream LLM response
        const systemPrompt = `You are Charis, an expert AI ad auditor powered by Gemini 3 Pro. You help brands understand their Meta Ads performance and provide actionable recommendations.

When analyzing ads, you:
1. Analyze hook effectiveness (first 3 seconds)
2. Break down script structure (problem → solution → CTA)
3. Evaluate visual quality and brand consistency
4. Provide specific, actionable recommendations

Be conversational but professional. Explain your analysis clearly.`;

        await logAndEmit("Model Inference", "started", "model", { model: DEFAULT_MODEL }, null, null, 15);

        const response = await fetch(LOVABLE_AI_ENDPOINT, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt || `Analyze ads for ${brandName || "brand"}` },
            ],
            stream: true,
            max_completion_tokens: 2048,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[AGENT-STREAM] LLM error:`, errorText);
          throw new Error(`LLM API error: ${response.status}`);
        }

        // Process streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let tokenCount = 0;
        let lastDbUpdate = Date.now();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter((line) => line.trim().startsWith("data:"));

            for (const line of lines) {
              const jsonStr = line.replace("data: ", "").trim();
              if (jsonStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content || "";
                
                if (delta) {
                  fullContent += delta;
                  tokenCount++;

                  // Emit token stream event (LangChain messages mode)
                  if (streamModes.includes("messages")) {
                    await emitEvent({
                      mode: "messages",
                      type: "token",
                      node: "model",
                      data: {
                        token: delta,
                        tokenIndex: tokenCount,
                        fullContent,
                        metadata: {
                          langgraph_node: "model",
                          model: DEFAULT_MODEL,
                        },
                      },
                      timestamp: new Date().toISOString(),
                    });
                  }

                  // Update assistant message in DB (throttled for performance)
                  const now = Date.now();
                  if (assistantMsgId && (now - lastDbUpdate > 300)) {
                    await supabase.from("agent_chat_messages").update({
                      content: fullContent,
                      updated_at: new Date().toISOString(),
                    }).eq("id", assistantMsgId);
                    lastDbUpdate = now;
                  }
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        // Finalize assistant message
        if (assistantMsgId) {
          await supabase.from("agent_chat_messages").update({
            content: fullContent || "I processed your request.",
            is_streaming: false,
            updated_at: new Date().toISOString(),
          }).eq("id", assistantMsgId);
        }

        await logAndEmit("Model Inference", "completed", "model", null, { 
          tokenCount, 
          contentLength: fullContent.length 
        }, null, 95);

        await logAndEmit("Response Complete", "completed", "llm", null, { 
          summary: "Analysis completed successfully" 
        }, null, 100);

        // Final event - session_end
        await emitEvent({
          mode: "updates",
          type: "session_end",
          data: { 
            sessionId: session_id, 
            status: "completed",
            tokenCount,
            model: DEFAULT_MODEL,
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
