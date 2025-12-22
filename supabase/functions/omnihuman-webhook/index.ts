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

const CREDITS_PER_VIDEO = 70;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Webhook payload received:', JSON.stringify(payload));
    
    // Parse webhook payload according to API documentation
    const taskId = payload?.taskId || payload?.data?.taskId;
    const state = payload?.state || payload?.data?.state;  // API uses 'state' not 'status'
    const resultJsonStr = payload?.resultJson || payload?.data?.resultJson;
    const failCode = payload?.failCode || payload?.data?.failCode;
    const failMsg = payload?.failMsg || payload?.data?.failMsg;
    
    console.log('Parsed webhook data:', { taskId, state, failCode, failMsg, resultJsonStr });
    
    // Parse resultJson if it exists (it's a stringified JSON)
    let resultObj = null;
    if (resultJsonStr) {
      try {
        resultObj = JSON.parse(resultJsonStr);
        console.log('Parsed resultJson from webhook:', JSON.stringify(resultObj));
      } catch (parseError) {
        console.error('Failed to parse resultJson in webhook:', parseError);
      }
    }

    if (!taskId) {
      throw new Error('No taskId in webhook payload');
    }

    // Get the generation record to find the project and user
    const { data: generation, error: fetchError } = await supabase
      .from('omnihuman_generations')
      .select('id, project_id, actor_id, status')
      .eq('task_id', taskId)
      .single();

    if (fetchError || !generation) {
      console.error('Failed to find generation for task:', taskId, fetchError);
      throw new Error('Generation not found');
    }

    // Only process if this is a new state change (avoid double processing)
    if (generation.status === state) {
      console.log(`Task ${taskId} already in state ${state}, skipping`);
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update generation status
    const updateData: Record<string, unknown> = {
      status: state,
      completed_at: new Date().toISOString()
    };

    // Extract video URL if available
    let video_url = null;
    if (state === 'success' && resultObj) {
      // According to API docs, check resultUrls array in parsed resultJson
      if (resultObj.resultUrls && Array.isArray(resultObj.resultUrls) && resultObj.resultUrls.length > 0) {
        // Get the first video URL from the resultUrls array
        video_url = resultObj.resultUrls[0];
        console.log('Extracted video URL from webhook resultUrls:', video_url);
      }
    }

    // Handle failure with proper error message  
    if (state === 'fail') {
      const errorMessage = failMsg || failCode || 'Generation failed';
      updateData.error_message = errorMessage;
      console.log(`Webhook received failure for task ${taskId}: ${errorMessage}`);
    }

    if (video_url) {
      updateData.video_url = video_url;
    }

    const { error: updateError } = await supabase
      .from('omnihuman_generations')
      .update(updateData)
      .eq('task_id', taskId);

    if (updateError) {
      console.error('Failed to update generation:', updateError);
      throw new Error('Failed to update generation status');
    }

    // CREDIT DEDUCTION ON SUCCESS ONLY
    // Only deduct credits when video generation is successful
    if (state === 'success' && video_url) {
      console.log(`Video generation successful for task ${taskId}, deducting credits...`);
      
      // Get the project to find the user_id
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', generation.project_id)
        .single();

      if (projectError || !project) {
        console.error('Failed to find project for credit deduction:', projectError);
      } else {
        // Get current user credits
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('free_credits, paid_credits')
          .eq('user_id', project.user_id)
          .single();

        if (profileError || !profile) {
          console.error('Failed to get user profile for credit deduction:', profileError);
        } else {
          // Deduct from free credits first, then paid credits
          let freeCredits = profile.free_credits || 0;
          let paidCredits = profile.paid_credits || 0;
          let creditsToDeduct = CREDITS_PER_VIDEO;
          let freeUsed = 0;
          let paidUsed = 0;

          // Deduct from free credits first
          if (freeCredits >= creditsToDeduct) {
            freeUsed = creditsToDeduct;
            freeCredits -= creditsToDeduct;
            creditsToDeduct = 0;
          } else {
            freeUsed = freeCredits;
            creditsToDeduct -= freeCredits;
            freeCredits = 0;
          }

          // If still need to deduct, use paid credits
          if (creditsToDeduct > 0) {
            paidUsed = Math.min(paidCredits, creditsToDeduct);
            paidCredits -= paidUsed;
          }

          // Update the profile with new credit values
          const { error: creditUpdateError } = await supabase
            .from('profiles')
            .update({
              free_credits: freeCredits,
              paid_credits: paidCredits
            })
            .eq('user_id', project.user_id);

          if (creditUpdateError) {
            console.error('Failed to update credits:', creditUpdateError);
          } else {
            console.log(`Deducted ${CREDITS_PER_VIDEO} credits (${freeUsed} free, ${paidUsed} paid) from user ${project.user_id}`);

            // Log the transaction
            await supabase.from('transaction_logs').insert({
              user_id: project.user_id,
              credits_change: -CREDITS_PER_VIDEO,
              reason: 'video_generation_success',
              metadata: {
                project_id: generation.project_id,
                generation_id: generation.id,
                actor_id: generation.actor_id,
                task_id: taskId,
                free_credits_used: freeUsed,
                paid_credits_used: paidUsed
              }
            });
          }
        }
      }
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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
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
    const updateData: Record<string, unknown> = {
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
