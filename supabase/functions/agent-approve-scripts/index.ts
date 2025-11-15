import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { orchestrateAgentWorkflow } from "../agent-orchestrate/index.ts";

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

    const { sessionId, approved, selectedScripts } = await req.json();

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    console.log(`Processing script approval for session ${sessionId}: ${approved}`);

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('agent_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    if (approved) {
      // Log approval
      await supabase.from('agent_execution_logs').insert({
        session_id: sessionId,
        step_name: 'scripts_approved',
        status: 'completed',
        output_data: { approved: true, selectedScripts },
      });

      // Update session with approved scripts
      await supabase
        .from('agent_sessions')
        .update({
          metadata: { 
            ...session.metadata, 
            approvedScripts: selectedScripts 
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      // Resume orchestration workflow (continue to video generation)
      const brandContext = session.metadata?.brandContext || '';
      orchestrateAgentWorkflow(supabase, sessionId, user.id, brandContext).catch(error => {
        console.error('Orchestration error:', error);
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Scripts approved. Proceeding to video generation...'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      // Reject and request regeneration
      await supabase.from('agent_execution_logs').insert({
        session_id: sessionId,
        step_name: 'scripts_rejected',
        status: 'completed',
        output_data: { approved: false },
      });

      // Update session to regenerate scripts
      await supabase
        .from('agent_sessions')
        .update({
          state: 'generate_scripts',
          current_step: 'Regenerating scripts',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Scripts rejected. Regenerating...'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
  } catch (error) {
    console.error('Error in agent-approve-scripts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
