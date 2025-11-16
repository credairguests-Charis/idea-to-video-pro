import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AgentStartRequest {
  session_id: string;
  prompt: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, prompt }: AgentStartRequest = await req.json();

    if (!session_id || !prompt) {
      throw new Error("Missing required fields: session_id or prompt");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get session details
    const { data: session, error: sessionError } = await supabaseClient
      .from("agent_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionError) throw sessionError;

    console.log("Starting agent execution for session:", session_id);

    // Log initial step
    await supabaseClient.from("agent_execution_logs").insert({
      session_id,
      step_name: "Initialization",
      status: "success",
      input_data: { prompt },
      output_data: { message: "Agent workflow starting..." },
    });

    // Update session state
    await supabaseClient
      .from("agent_sessions")
      .update({
        state: "running",
        current_step: "Brand Analysis",
        progress: 10,
      })
      .eq("id", session_id);

    // Step 1: Brand Analysis
    await executeStep(supabaseClient, session_id, "Brand Analysis", 20, async () => {
      // TODO: Implement actual brand analysis using agent memory
      return {
        brand_analysis: {
          voice: "Extracted from user memory or inferred from prompt",
          target_audience: "Analyzed based on historical data",
        },
      };
    });

    // Step 2: Competitor Research
    await executeStep(supabaseClient, session_id, "Competitor Research", 40, async () => {
      // TODO: Call Meta Ads Library MCP, TikTok MCP, YouTube MCP
      return {
        competitor_insights: {
          top_hooks: ["Hook 1", "Hook 2", "Hook 3"],
          formats: ["UGC", "Product Demo", "Testimonial"],
        },
      };
    });

    // Step 3: Trend Analysis
    await executeStep(supabaseClient, session_id, "Trend Analysis", 60, async () => {
      // TODO: Call TikTok Trends MCP
      return {
        trends: [
          { name: "Trend 1", description: "Popular on TikTok" },
          { name: "Trend 2", description: "Rising on Instagram" },
        ],
      };
    });

    // Step 4: Creative Generation
    await executeStep(supabaseClient, session_id, "Creative Generation", 80, async () => {
      // TODO: Use LLM to generate script based on insights
      return {
        script: {
          hook: "Generated hook based on competitor insights",
          body: "Generated body copy with brand voice",
          cta: "Generated CTA",
        },
      };
    });

    // Step 5: Video Generation (Placeholder)
    await executeStep(supabaseClient, session_id, "Video Generation", 95, async () => {
      // TODO: Implement Sora 2 video generation
      return {
        video: {
          status: "Queued for generation",
          message: "Video generation will be implemented in next phase",
        },
      };
    });

    // Complete session
    await supabaseClient
      .from("agent_sessions")
      .update({
        state: "completed",
        current_step: "Completed",
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    await supabaseClient.from("agent_execution_logs").insert({
      session_id,
      step_name: "Completion",
      status: "success",
      output_data: { message: "Agent workflow completed successfully" },
    });

    return new Response(
      JSON.stringify({ success: true, session_id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in agent-start:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function executeStep(
  supabase: any,
  sessionId: string,
  stepName: string,
  progress: number,
  executor: () => Promise<any>
) {
  const startTime = Date.now();

  try {
    // Update session progress
    await supabase
      .from("agent_sessions")
      .update({
        current_step: stepName,
        progress,
      })
      .eq("id", sessionId);

    // Log step start
    await supabase.from("agent_execution_logs").insert({
      session_id: sessionId,
      step_name: stepName,
      status: "in_progress",
    });

    // Execute step logic
    const result = await executor();

    // Log step completion
    await supabase.from("agent_execution_logs").insert({
      session_id: sessionId,
      step_name: stepName,
      status: "success",
      output_data: result,
      duration_ms: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    // Log step error
    await supabase.from("agent_execution_logs").insert({
      session_id: sessionId,
      step_name: stepName,
      status: "error",
      error_message: error.message,
      duration_ms: Date.now() - startTime,
    });

    throw error;
  }
}
