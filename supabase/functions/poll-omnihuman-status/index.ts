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
        console.log(`Status response for task ${generation.task_id}:`, JSON.stringify(statusData));

        // Handle nested response structure - check both direct and nested paths
        const dataObj = statusData?.data || statusData;
        const status = dataObj.status || dataObj.state || statusData.status;
        const result = dataObj.result || dataObj.output || dataObj.resultUrls || statusData.result;
        // Check if task is completed
        if (status === 'success' || status === 'fail') {
          const updateData: any = {
            status: status,
            completed_at: new Date().toISOString()
          };

          // Extract video URL if task completed successfully with comprehensive checking
          if (status === 'success' && result) {
            let video_url = null;
            
            // Try different possible video URL fields
            video_url = result.video_url || result.videoUrl || result.output_url || result.outputUrl ||
                       result.url || result.downloadUrl || result.file_url;
            
            // Check if result has resultUrls array (from polling API)
            if (result.resultUrls && Array.isArray(result.resultUrls) && result.resultUrls.length > 0) {
              const firstResult = result.resultUrls[0];
              video_url = firstResult.video_url || firstResult.videoUrl || firstResult.output_url ||
                         firstResult.outputUrl || firstResult.url || firstResult.downloadUrl || firstResult.file_url;
            }
            
            // If result is array, check first item
            if (Array.isArray(result) && result.length > 0) {
              const firstResult = result[0];
              video_url = firstResult.video_url || firstResult.videoUrl || firstResult.output_url ||
                         firstResult.outputUrl || firstResult.url || firstResult.downloadUrl || firstResult.file_url;
            }
            
            // If result is a string URL, use it directly
            if (typeof result === 'string' && result.startsWith('http')) {
              video_url = result;
            }
            
            console.log('Extracted video URL from polling:', video_url);
            
            if (video_url) {
              updateData.video_url = video_url;
            }
          }

          if (status === 'fail' && (dataObj.errorMessage || statusData.errorMessage)) {
            updateData.error_message = dataObj.errorMessage || statusData.errorMessage;
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