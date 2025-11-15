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

    // Trigger orchestration workflow via HTTP (non-blocking)
    fetch(`${supabaseUrl}/functions/v1/agent-orchestrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        sessionId: session.id,
        userId: user.id,
        brandContext: brandContext || ''
      })
    }).catch(error => {
      console.error('Failed to trigger orchestration:', error);
    });

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