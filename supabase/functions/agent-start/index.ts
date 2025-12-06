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
    const { error: initLogError } = await supabaseClient.from("agent_execution_logs").insert({
      session_id,
      step_name: "Initialization",
      status: "success",
      input_data: { prompt },
      output_data: { message: "Agent workflow starting..." },
    });

    if (initLogError) {
      console.error("Error inserting init log:", initLogError);
    }

    // Update session state
    await supabaseClient
      .from("agent_sessions")
      .update({
        state: "running",
        current_step: "Brand Analysis",
        progress: 10,
      })
      .eq("id", session_id);

    // Add small delay to allow real-time to propagate
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 1: Brand Analysis
    await executeStep(supabaseClient, session_id, "Brand Analysis", 20, async () => {
      // Simulate brand analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        brand_analysis: {
          voice: "Professional, informative, and engaging",
          target_audience: "Gen Z and Millennials interested in wellness",
        },
      };
    });

    // Step 2: Competitor Research
    await executeStep(supabaseClient, session_id, "Competitor Research", 40, async () => {
      // Simulate competitor research
      await new Promise(resolve => setTimeout(resolve, 2500));
      return {
        competitor_insights: {
          top_hooks: ["Did you know...", "This changed my life", "Stop scrolling!"],
          formats: ["UGC", "Product Demo", "Testimonial"],
        },
      };
    });

    // Step 3: Trend Analysis
    await executeStep(supabaseClient, session_id, "Trend Analysis", 60, async () => {
      // Simulate trend analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        trends: [
          { name: "Authentic UGC", description: "Raw, unedited content performing well" },
          { name: "Story-driven ads", description: "Narrative hooks gaining traction" },
        ],
      };
    });

    // Step 4: Creative Generation
    await executeStep(supabaseClient, session_id, "Creative Generation", 80, async () => {
      // Simulate creative generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      return {
        script: {
          hook: "Stop scrolling! This changed everything for my morning routine",
          body: "I used to struggle with energy until I discovered this simple hack. Now I feel amazing every single day.",
          cta: "Try it for yourself - link in bio!",
        },
      };
    });

    // Step 5: Video Generation
    await executeStep(supabaseClient, session_id, "Video Generation", 95, async () => {
      // Simulate video generation
      await new Promise(resolve => setTimeout(resolve, 2500));
      return {
        video: {
          status: "Generated",
          message: "Video draft created successfully",
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

    console.log("Agent workflow completed successfully");

    return new Response(
      JSON.stringify({ success: true, session_id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in agent-start:", error);
    
    // Update session to error state
    if (session_id) {
      await supabaseClient
        .from("agent_sessions")
        .update({
          state: "error",
          current_step: "Error",
        })
        .eq("id", session_id);
    }
    
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
    const { error: sessionUpdateError } = await supabase
      .from("agent_sessions")
      .update({
        current_step: stepName,
        progress,
      })
      .eq("id", sessionId);

    if (sessionUpdateError) {
      console.error("Error updating session:", sessionUpdateError);
    }

    // Log step start
    const { error: startLogError } = await supabase.from("agent_execution_logs").insert({
      session_id: sessionId,
      step_name: stepName,
      status: "started",
    });

    if (startLogError) {
      console.error("Error inserting start log:", startLogError);
    }

    // Small delay for real-time propagation
    await new Promise(resolve => setTimeout(resolve, 300));

    // Execute step logic
    const result = await executor();

    // Log step completion
    const { error: completeLogError } = await supabase.from("agent_execution_logs").insert({
      session_id: sessionId,
      step_name: stepName,
      status: "success",
      output_data: result,
      duration_ms: Date.now() - startTime,
    });

    if (completeLogError) {
      console.error("Error inserting completion log:", completeLogError);
    }

    // Small delay for real-time propagation
    await new Promise(resolve => setTimeout(resolve, 300));

    return result;
  } catch (error) {
    console.error(`Error in step ${stepName}:`, error);
    
    // Log step error
    const { error: errorLogError } = await supabase.from("agent_execution_logs").insert({
      session_id: sessionId,
      step_name: stepName,
      status: "error",
      error_message: error.message,
      duration_ms: Date.now() - startTime,
    });

    if (errorLogError) {
      console.error("Error inserting error log:", errorLogError);
    }

    throw error;
  }
}
