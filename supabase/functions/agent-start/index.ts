import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { projectId, brandContext } = await req.json();

    console.log(`Starting agent session for user ${user.id}, project ${projectId}`);

    // Create agent session
    const { data: session, error: sessionError } = await supabase
      .from('agent_sessions')
      .insert({
        user_id: user.id,
        project_id: projectId,
        state: 'initializing',
        progress: 0,
        metadata: { brandContext }
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      throw sessionError;
    }

    console.log(`Agent session created: ${session.id}`);

    // Log initial step
    await supabase.from('agent_execution_logs').insert({
      session_id: session.id,
      step_name: 'initialize',
      status: 'started',
      input_data: { brandContext }
    });

    // Start the agent workflow asynchronously
    // In a real implementation, this would trigger the agent orchestration
    setTimeout(async () => {
      try {
        // Update to analyzing_brand state
        await supabase
          .from('agent_sessions')
          .update({
            state: 'analyzing_brand',
            current_step: 'Analyzing brand memory and preferences',
            progress: 10
          })
          .eq('id', session.id);

        await supabase.from('agent_execution_logs').insert({
          session_id: session.id,
          step_name: 'analyze_brand',
          status: 'started',
          tool_name: 'memory_search'
        });

        // This is a placeholder - real implementation would call MCP tools
        console.log('Agent workflow started for session:', session.id);
      } catch (error) {
        console.error('Error in agent workflow:', error);
        await supabase
          .from('agent_sessions')
          .update({
            state: 'error',
            metadata: { error: error.message }
          })
          .eq('id', session.id);
      }
    }, 0);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId: session.id,
        message: 'Agent session started successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in agent-start:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});