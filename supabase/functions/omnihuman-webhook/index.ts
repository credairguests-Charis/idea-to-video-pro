import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { taskId, state, resultUrls, errorMessage } = payload;

    console.log('Webhook received:', { taskId, state, resultUrls, errorMessage });

    if (!taskId) {
      throw new Error('No taskId in webhook payload');
    }

    // Update generation status
    const updateData: any = {
      status: state,
      completed_at: new Date().toISOString()
    };

    if (state === 'success' && resultUrls) {
      try {
        const results = typeof resultUrls === 'string' ? JSON.parse(resultUrls) : resultUrls;
        if (results && results.length > 0 && results[0]?.video_url) {
          updateData.video_url = results[0].video_url;
        }
      } catch (e) {
        console.error('Failed to parse result URLs:', e);
      }
    }

    if (state === 'fail' && errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { data: generation, error } = await supabase
      .from('omnihuman_generations')
      .update(updateData)
      .eq('task_id', taskId)
      .select('project_id')
      .single();

    if (error) {
      console.error('Failed to update generation:', error);
      throw new Error('Failed to update generation status');
    }

    if (generation?.project_id) {
      // Update project progress
      await updateProjectProgress(generation.project_id);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function updateProjectProgress(projectId: string) {
  try {
    // Get all generations for this project
    const { data: generations, error: generationsError } = await supabase
      .from('omnihuman_generations')
      .select('status')
      .eq('project_id', projectId);

    if (generationsError) {
      console.error('Failed to fetch generations:', generationsError);
      return;
    }

    if (!generations || generations.length === 0) {
      return;
    }

    const totalGenerations = generations.length;
    const completedGenerations = generations.filter(
      g => g.status === 'success' || g.status === 'fail'
    ).length;
    const successfulGenerations = generations.filter(
      g => g.status === 'success'
    ).length;

    const progress = Math.round((completedGenerations / totalGenerations) * 100);
    
    let status = 'generating';
    let videoUrls: string[] = [];

    if (completedGenerations === totalGenerations) {
      if (successfulGenerations > 0) {
        status = 'completed';
        
        // Get all successful video URLs
        const { data: successfulGens, error: urlsError } = await supabase
          .from('omnihuman_generations')
          .select('video_url')
          .eq('project_id', projectId)
          .eq('status', 'success')
          .not('video_url', 'is', null);

        if (!urlsError && successfulGens) {
          videoUrls = successfulGens.map(g => g.video_url).filter(Boolean);
        }
      } else {
        status = 'failed';
      }
    }

    // Update project
    const updateData: any = {
      generation_progress: progress,
      generation_status: status
    };

    if (videoUrls.length > 0) {
      updateData.omnihuman_video_urls = videoUrls;
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to update project progress:', updateError);
    } else {
      console.log(`Updated project ${projectId} progress: ${progress}%, status: ${status}`);
    }

  } catch (error) {
    console.error('Error updating project progress:', error);
  }
}