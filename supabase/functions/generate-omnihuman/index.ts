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

// Helper function to classify error types
const isFatalError = (errorCode: number, errorMessage: string): boolean => {
  // 402 = Insufficient credits - fatal for entire project
  if (errorCode === 402) return true;
  
  // Other potentially fatal errors
  if (errorCode === 401 || errorCode === 403) return true; // Auth issues
  if (errorCode === 429) return true; // Rate limit exceeded
  
  return false;
};

const getFatalErrorMessage = (errorCode: number, errorMessage: string): string => {
  switch (errorCode) {
    case 402:
      return 'Insufficient credits in your KIE.ai account. Please top up your account and try again.';
    case 401:
    case 403:
      return 'Authentication error with KIE.ai API. Please check your API key configuration.';
    case 429:
      return 'Rate limit exceeded. Please wait a moment and try again.';
    default:
      return `API error (code ${errorCode}): ${errorMessage}`;
  }
};

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
    let fatalError: { code: number; message: string } | null = null;

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

        // Normalize actor image URL to absolute URL
        let imageUrl = actor.thumbnail_url;
        if (imageUrl.startsWith('/')) {
          // Handle relative URLs by making them absolute
          const origin = req.headers.get('origin') || 'https://fd178190-4e25-4a6b-a609-bdf282c1854b.lovableproject.com';
          imageUrl = origin + imageUrl;
          console.log(`Normalized relative image URL to: ${imageUrl}`);
        }

        // Handle audio URL - create signed URL for storage paths, pass through external URLs
        let audioToUse = audioUrl;
        
        // If audioUrl appears to be a storage key (no http/https), create signed URL
        if (!audioUrl.startsWith('http')) {
          const storageKey = audioUrl;
          console.log(`Creating signed URL for storage key: ${storageKey}`);
          
          // Use 24-hour expiry to avoid expiration during processing
          const { data: signedUrlData, error: signedUrlError } = await supabase
            .storage
            .from('omnihuman-content')
            .createSignedUrl(storageKey, 86400); // 24 hours

          if (signedUrlError || !signedUrlData?.signedUrl) {
            console.error(`Failed to get signed URL for storage key: ${storageKey}`, signedUrlError);
            throw new Error('Failed to get signed URL for audio');
          }
          
          audioToUse = signedUrlData.signedUrl;
        }

        console.log(`Final URLs - Image: ${imageUrl}, Audio: ${audioToUse.substring(0, 50)}...`);

        // Preflight checks - verify URLs are publicly accessible
        try {
          console.log(`Performing preflight check for image: ${imageUrl}`);
          const imageCheck = await fetch(imageUrl, { method: 'HEAD' });
          if (!imageCheck.ok) {
            console.error(`Image URL preflight failed: ${imageCheck.status} ${imageCheck.statusText}`);
            throw new Error(`Image URL is not accessible: ${imageCheck.status} ${imageCheck.statusText}`);
          }

          console.log(`Performing preflight check for audio: ${audioToUse.substring(0, 50)}...`);
          const audioCheck = await fetch(audioToUse, { method: 'HEAD' });
          if (!audioCheck.ok) {
            console.error(`Audio URL preflight failed: ${audioCheck.status} ${audioCheck.statusText}`);
            throw new Error(`Audio URL is not accessible: ${audioCheck.status} ${audioCheck.statusText}`);
          }

          console.log('Preflight checks passed for both URLs');
        } catch (preflightError) {
          console.error(`Preflight check failed for actor ${actorId}:`, preflightError);
          throw preflightError;
        }

        // Call OmniHuman API via KIE - Using correct format per API docs
        const kieRequest = {
          model: 'bytedance/omni-human',
          input: {
            image: imageUrl,
            audio: audioToUse
          },
          callBackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/omnihuman-webhook`
        };

        console.log(`Calling KIE API for actor ${actor.name} with request:`, JSON.stringify(kieRequest, null, 2));

        const omniResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('KIE_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(kieRequest),
        });

        if (!omniResponse.ok) {
          const errorText = await omniResponse.text();
          console.error(`OmniHuman API HTTP error for actor ${actorId}: ${omniResponse.status} ${omniResponse.statusText}`, errorText);
          throw new Error(`OmniHuman API HTTP error: ${omniResponse.status} ${omniResponse.statusText} - ${errorText}`);
        }

        const omniData = await omniResponse.json();
        console.log(`OmniHuman API response for actor ${actorId}:`, JSON.stringify(omniData));
        
        // Check for API-level errors
        if (omniData.code && omniData.code !== 200) {
          const errorMsg = omniData.msg || omniData.error || 'Unknown API error';
          console.error(`OmniHuman API returned error code ${omniData.code} for actor ${actorId}: ${errorMsg}`);
          
          // Check if this is a fatal error that should stop the entire project
          if (isFatalError(omniData.code, errorMsg)) {
            console.error(`Fatal error detected (code ${omniData.code}): ${errorMsg}. Stopping project processing.`);
            fatalError = { code: omniData.code, message: errorMsg };
            break; // Exit the loop immediately
          }
          
          throw new Error(`OmniHuman API error (code ${omniData.code}): ${errorMsg}`);
        }
        
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
        // Continue with next actor only if it's not a fatal error
        if (error instanceof Error && error.message && error.message.includes('code 402')) {
          // This was already handled above, but just in case
          console.error('Fatal error detected in catch block. Stopping processing.');
          fatalError = { code: 402, message: error.message };
          break;
        }
        continue;
      }
    }

    // Handle fatal errors first
    if (fatalError) {
      const specificErrorMessage = getFatalErrorMessage(fatalError.code, fatalError.message);
      console.error(`Project failed due to fatal error: ${specificErrorMessage}`);

      // Update project with specific error message
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          generation_status: 'failed',
          generation_progress: 0,
          omnihuman_task_ids: []
        })
        .eq('id', projectId);

      if (updateError) {
        console.error('Failed to update project status to failed:', updateError);
      }

      return new Response(JSON.stringify({ 
        success: false, 
        error: specificErrorMessage,
        errorCode: fatalError.code,
        generations: []
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update project status based on results
    if (generations.length === 0) {
      // No tasks were created, mark project as failed
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          generation_status: 'failed',
          generation_progress: 0,
          omnihuman_task_ids: []
        })
        .eq('id', projectId);

      if (updateError) {
        console.error('Failed to update project status to failed:', updateError);
      }

      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No OmniHuman tasks could be started. Please check your media files and try again.',
        generations: []
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Tasks were created successfully
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