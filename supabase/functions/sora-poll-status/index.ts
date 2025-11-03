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
    const KIE_API_KEY = Deno.env.get('KIE_API_KEY');
    if (!KIE_API_KEY) {
      console.error('KIE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching pending video generations...');

    const { data: pendingGenerations, error: fetchError } = await supabaseClient
      .from('video_generations')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching pending generations:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending generations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingGenerations || pendingGenerations.length === 0) {
      console.log('No pending generations to poll');
      return new Response(
        JSON.stringify({ message: 'No pending tasks', updated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Polling ${pendingGenerations.length} pending generations...`);
    let updatedCount = 0;

    for (const generation of pendingGenerations) {
      try {
        console.log(`Checking status for task ${generation.task_id}`);

        const statusResponse = await fetch(
          `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${generation.task_id}`,
          {
            headers: {
              'Authorization': `Bearer ${KIE_API_KEY}`,
            },
          }
        );

        const statusData = await statusResponse.json();

        if (!statusResponse.ok || statusData.code !== 200) {
          console.error(`Error fetching status for ${generation.task_id}:`, statusData);
          continue;
        }

        const taskState = statusData.data.state;
        console.log(`Task ${generation.task_id} status: ${taskState}`);

        if (taskState === 'success') {
          const resultJson = JSON.parse(statusData.data.resultJson || '{}');
          const videoUrl = resultJson.resultUrls?.[0];

          await supabaseClient
            .from('video_generations')
            .update({
              status: 'success',
              result_url: videoUrl,
              completed_at: new Date().toISOString(),
              cost_time: statusData.data.costTime,
            })
            .eq('task_id', generation.task_id);

          console.log(`Task ${generation.task_id} completed successfully`);
          updatedCount++;
        } else if (taskState === 'fail') {
          await supabaseClient
            .from('video_generations')
            .update({
              status: 'fail',
              fail_code: statusData.data.failCode,
              fail_msg: statusData.data.failMsg,
              completed_at: new Date().toISOString(),
            })
            .eq('task_id', generation.task_id);

          console.log(`Task ${generation.task_id} failed:`, statusData.data.failMsg);
          updatedCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error polling task ${generation.task_id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Polling complete', 
        polled: pendingGenerations.length,
        updated: updatedCount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sora-poll-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
