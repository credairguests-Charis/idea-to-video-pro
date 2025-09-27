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
    const { projectId, actorIds, audioUrl } = await req.json();

    if (!projectId || !actorIds || !audioUrl) {
      throw new Error('Missing required parameters: projectId, actorIds, or audioUrl');
    }

    // Get auth user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const generations = [];

    // Process each actor sequentially to avoid rate limits
    for (const actorId of actorIds) {
      try {
        // Get actor image URL
        const { data: actor, error: actorError } = await supabase
          .from('actors')
          .select('thumbnail_url, name')
          .eq('id', actorId)
          .single();

        if (actorError || !actor?.thumbnail_url) {
          console.error(`Actor not found: ${actorId}`, actorError);
          continue;
        }

        console.log(`Processing actor: ${actor.name} (${actorId})`);

        // Get signed URL for private audio file
        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from('omnihuman-content')
          .createSignedUrl(audioUrl.split('/').pop()!, 3600); // 1 hour expiry

        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.error(`Failed to get signed URL for audio: ${audioUrl}`, signedUrlError);
          throw new Error('Failed to get signed URL for audio');
        }

        console.log(`Using signed audio URL for actor: ${actor.name}`);

        // Call OmniHuman API via KIE - Using correct endpoint and format
        const omniResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('KIE_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'omni-human',
            callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/omnihuman-webhook`,
            inputImage: actor.thumbnail_url,
            inputAudio: signedUrlData.signedUrl
          }),
        });

        if (!omniResponse.ok) {
          const errorText = await omniResponse.text();
          console.error(`OmniHuman API error for actor ${actorId}:`, errorText);
          throw new Error(`OmniHuman API error: ${errorText}`);
        }

        const omniData = await omniResponse.json();
        console.log(`OmniHuman API response for actor ${actorId}:`, JSON.stringify(omniData));
        
        // Handle nested response structure
        const taskId = omniData?.data?.taskId || omniData?.taskId;

        if (!taskId) {
          console.error(`No taskId in response for actor ${actorId}:`, omniData);
          throw new Error(`No taskId returned from OmniHuman API. Response: ${JSON.stringify(omniData)}`);
        }

        console.log(`Created OmniHuman task: ${taskId} for actor: ${actor.name}`);

        // Store generation record
        const { data: generation, error: insertError } = await supabase
          .from('omnihuman_generations')
          .insert({
            project_id: projectId,
            actor_id: actorId,
            task_id: taskId,
            status: 'pending',
            audio_url: audioUrl
          })
          .select()
          .single();

        if (insertError) {
          console.error('Failed to store generation record:', insertError);
          throw new Error('Failed to store generation record');
        }

        generations.push({ 
          actorId, 
          taskId, 
          generationId: generation.id,
          actorName: actor.name
        });

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing actor ${actorId}:`, error);
        // Continue with next actor even if one fails
        continue;
      }
    }

    // Update project status
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        generation_status: 'generating',
        generation_progress: 0,
        omnihuman_task_ids: generations.map(g => g.taskId)
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to update project status:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      generations,
      message: `Started generation for ${generations.length} actor(s)`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('OmniHuman generation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});