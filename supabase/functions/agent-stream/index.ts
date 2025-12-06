import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StreamRequest {
  session_id: string;
  prompt: string;
  tool?: string;
}

const getSystemPrompt = (tool?: string): string => {
  const basePrompt = "You are a helpful AI assistant.";
  
  switch (tool) {
    case "createImage":
      return `${basePrompt} When asked to create an image, use the generateImage tool with a detailed prompt.`;
    case "searchWeb":
      return `${basePrompt} When asked to search, use the searchWeb tool with relevant keywords.`;
    case "writeCode":
      return `${basePrompt} You are an expert programmer. Write clean, well-documented code.`;
    case "deepResearch":
      return `${basePrompt} Conduct thorough research and provide detailed analysis with multiple perspectives.`;
    case "thinkLonger":
      return `${basePrompt} Take your time to think through the problem step-by-step before providing a solution.`;
    default:
      return basePrompt;
  }
};

const getTools = (tool?: string) => {
  const tools: any[] = [];
  
  if (tool === "createImage" || !tool) {
    tools.push({
      type: "function",
      function: {
        name: "generateImage",
        description: "Generate an image based on a text prompt",
        parameters: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "The image generation prompt" },
          },
          required: ["prompt"],
        },
      },
    });
  }
  
  if (tool === "searchWeb" || !tool) {
    tools.push({
      type: "function",
      function: {
        name: "searchWeb",
        description: "Search the web for information",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query" },
          },
          required: ["query"],
        },
      },
    });
  }
  
  return tools;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, prompt, tool }: StreamRequest = await req.json();

    if (!session_id || !prompt) {
      throw new Error("Missing required fields");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create placeholder assistant message for streaming
    const { data: assistantMsg, error: msgError } = await supabaseClient
      .from("agent_chat_messages")
      .insert({
        session_id,
        role: "assistant",
        content: "",
        is_streaming: true,
        metadata: { tool: tool || "general" },
      })
      .select()
      .single();

    if (msgError) {
      console.error("Failed to create assistant message:", msgError);
    }

    const assistantMsgId = assistantMsg?.id;

    // Log stream start
    await supabaseClient.from("agent_execution_logs").insert({
      session_id,
      step_name: `AI Processing (${tool || 'general'})`,
      status: "started",
      tool_name: tool || "general",
      input_data: { prompt },
    });

    // Call Lovable AI with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: getSystemPrompt(tool) },
          { role: "user", content: prompt },
        ],
        tools: getTools(tool),
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} ${errorText}`);
    }

    // Create a transform stream to process and log the data
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Process the stream in the background
    (async () => {
      try {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullResponse = "";
        let toolCalls: any[] = [];
        let lastUpdateTime = Date.now();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim() || line.startsWith(":")) continue;
            if (!line.startsWith("data: ")) continue;

            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              // Collect content
              if (delta?.content) {
                fullResponse += delta.content;
                
                // Update the assistant message every 500ms to show streaming
                const now = Date.now();
                if (assistantMsgId && now - lastUpdateTime > 500) {
                  await supabaseClient
                    .from("agent_chat_messages")
                    .update({ content: fullResponse })
                    .eq("id", assistantMsgId);
                  lastUpdateTime = now;
                }
              }

              // Collect tool calls
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (!toolCalls[tc.index]) {
                    toolCalls[tc.index] = {
                      id: tc.id,
                      type: tc.type,
                      function: { name: tc.function?.name || "", arguments: "" },
                    };
                  }
                  if (tc.function?.arguments) {
                    toolCalls[tc.index].function.arguments += tc.function.arguments;
                  }
                }
              }

              // Forward the chunk to the client
              await writer.write(encoder.encode(`data: ${data}\n\n`));
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }

        // Execute any tool calls
        if (toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            const toolName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            let toolResult: any = {};

            if (toolName === "generateImage") {
              // Call image generation
              const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash-image-preview",
                  messages: [
                    { role: "user", content: args.prompt },
                  ],
                }),
              });

              const imgData = await imgResponse.json();
              const imageUrl = imgData.choices?.[0]?.message?.content || "";
              toolResult = { imageUrl, prompt: args.prompt };

              // Log tool execution
              await supabaseClient.from("agent_execution_logs").insert({
                session_id,
                step_name: "Image Generation",
                status: "completed",
                tool_name: "generateImage",
                input_data: args,
                output_data: toolResult,
              });
            } else if (toolName === "searchWeb") {
              // Simulate search results
              toolResult = {
                results: [
                  {
                    title: `Result for: ${args.query}`,
                    snippet: "Detailed information about your search query...",
                    url: `https://example.com/search?q=${encodeURIComponent(args.query)}`,
                  },
                ],
              };

              // Log tool execution
              await supabaseClient.from("agent_execution_logs").insert({
                session_id,
                step_name: "Web Search",
                status: "completed",
                tool_name: "searchWeb",
                input_data: args,
                output_data: toolResult,
              });
            }
          }
        }

        // Finalize the assistant message
        if (assistantMsgId) {
          await supabaseClient
            .from("agent_chat_messages")
            .update({
              content: fullResponse || "I processed your request.",
              is_streaming: false,
              metadata: { tool: tool || "general", toolCalls: toolCalls.length },
            })
            .eq("id", assistantMsgId);
        }

        // Log completion
        await supabaseClient.from("agent_execution_logs").insert({
          session_id,
          step_name: `AI Processing Complete`,
          status: "completed",
          tool_name: tool || "general",
          output_data: { response: fullResponse, toolCalls: toolCalls.length },
        });

        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      } catch (error) {
        console.error("Stream processing error:", error);
        
        // Update assistant message with error
        if (assistantMsgId) {
          await supabaseClient
            .from("agent_chat_messages")
            .update({
              content: "Sorry, I encountered an error while processing your request.",
              is_streaming: false,
              metadata: { error: true, errorMessage: error.message },
            })
            .eq("id", assistantMsgId);
        }
        
        await supabaseClient.from("agent_execution_logs").insert({
          session_id,
          step_name: "AI Processing Error",
          status: "failed",
          error_message: error.message,
        });
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in agent-stream:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
