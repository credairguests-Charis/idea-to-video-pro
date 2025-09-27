import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    console.log('Starting status polling for pending OmniHuman tasks...');

    // Get all pending generations that are older than 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    
    const { data: pendingGenerations, error: fetchError } = await supabase
      .from('omnihuman_generations')
      .select('id, task_id, project_id, created_at')
      .eq('status', 'pending')
      .lt('created_at', thirtySecondsAgo);

    if (fetchError) {
      console.error('Failed to fetch pending generations:', fetchError);
      throw new Error('Failed to fetch pending generations');
    }

    if (!pendingGenerations || pendingGenerations.length === 0) {
      console.log('No pending generations to poll');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending generations to poll',
        polled: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${pendingGenerations.length} pending generations to poll`);
    let updatedCount = 0;

    // Poll each task
    for (const generation of pendingGenerations) {
      try {
        console.log(`Polling task: ${generation.task_id}`);
        
        // Call the status API
        const statusResponse = await fetch(`https://api.kie.ai/api/v1/jobs/recordsInfo?taskId=${generation.task_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('KIE_API_KEY')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!statusResponse.ok) {
          console.error(`Status API error for task ${generation.task_id}:`, statusResponse.status, statusResponse.statusText);
          continue;
        }

        const statusData = await statusResponse.json();
        console.log(`Status response for ${generation.task_id}:`, JSON.stringify(statusData, null, 2));

        // Check if task is completed
        if (statusData.status === 'success' || statusData.status === 'fail') {
          const updateData: any = {
            status: statusData.status,
            completed_at: new Date().toISOString()
          };

          if (statusData.status === 'success' && statusData.resultUrls && statusData.resultUrls.length > 0) {
            // Extract video URL from the first result
            const videoResult = statusData.resultUrls[0];
            if (videoResult && videoResult.video_url) {
              updateData.video_url = videoResult.video_url;
            }
          }

          if (statusData.status === 'fail' && statusData.errorMessage) {
            updateData.error_message = statusData.errorMessage;
          }

          // Update the generation record
          const { error: updateError } = await supabase
            .from('omnihuman_generations')
            .update(updateData)
            .eq('id', generation.id);

          if (updateError) {
            console.error(`Failed to update generation ${generation.id}:`, updateError);
            continue;
          }

          console.log(`Updated generation ${generation.id} with status: ${statusData.status}`);
          updatedCount++;

          // Update project progress
          await updateProjectProgress(generation.project_id);
        }

        // Small delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error polling task ${generation.task_id}:`, error);
        continue;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Polled ${pendingGenerations.length} tasks, updated ${updatedCount} generations`,
      polled: pendingGenerations.length,
      updated: updatedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Polling error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
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
      .select('status, video_url')
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
        videoUrls = generations
          .filter(g => g.status === 'success' && g.video_url)
          .map(g => g.video_url!)
          .filter(Boolean);
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