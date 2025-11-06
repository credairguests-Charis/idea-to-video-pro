import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Universal Sora 2 UGC Video System Prompt
const SYSTEM_PROMPT = `Create a realistic, authentic UGC-style short-form video that looks like it was recorded by a real person using a smartphone camera in a natural, well-lit environment. The tone must feel personal, trustworthy, and engaging — like organic social media content on TikTok, Instagram Reels, or YouTube Shorts.

The video must be approximately 14 seconds long and never exceed 15 seconds. The human actor must naturally complete the script within this duration.

If a product image is provided through the app, automatically recognize it and authentically showcase, demonstrate, or reference that product in a realistic and human way — exactly how real creators promote products on social platforms. The integration must look genuine, not like an advertisement.

Follow this storytelling structure for every video:

1. Hook (0–3s):
   - Immediately grab attention with a bold statement, surprising visual, or question.
   - Use curiosity, emotion, or movement to interrupt the scroll.
   - Optionally include on-screen text or subtitles to engage muted viewers.

2. Body / Value (4–12s):
   - Deliver concise value or story that matches the user intent.
   - Keep pacing fast and energy high; insert a mid-video re-hook if attention may dip.
   - Feature the uploaded product naturally if available, in use or contextually relevant to its niche.

3. Conclusion / CTA (13–15s):
   - End with a natural wrap-up and a clear, engaging call-to-action (e.g., 'Check it out', 'Tap the link', 'Follow for more').
   - Finish with a memorable moment that encourages engagement or sharing.

Tone & Style:
- Always sound natural, conversational, and human — avoid robotic or overly polished delivery.
- Use handheld-style framing, natural lighting, and real-world environments.
- Prioritize scroll-stopping visual or verbal hooks within the first 3 seconds.
- Encourage interaction subtly through dialogue or visual cues ('tag a friend', 'comment below', etc.).
- Keep visuals in portrait (9:16) aspect ratio unless otherwise specified.

Adapt the scene automatically to the niche indicated by the user's intent or script:
- E-commerce / DTC: authentic review or demo
- Agency / Tech: confident explanation or insight
- Real Estate / Automotive: walk-through or feature highlight
- Fashion / Lifestyle: natural modeling or daily-use storytelling
- Healthcare / Wellness: sincere and trustworthy tone
- Hardware / Hardtech: practical demo or innovation showcase

The final output must feel human-made, scroll-stopping, and optimized for viral performance across TikTok, Reels, and Shorts. It must dynamically adapt to the user input while maintaining this universal structure and tone.`;

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, image_url, image_urls, aspect_ratio = 'landscape', n_frames = '10', remove_watermark = true, project_id } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Support both single image_url and multiple image_urls
    const finalImageUrls = image_urls || (image_url ? [image_url] : []);

    console.log('Creating Sora 2 task for user:', user.id);

    // Combine system prompt with user prompt
    const enhancedPrompt = `${SYSTEM_PROMPT}\n\nUser intent or script: ${prompt}`;

    const soraResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sora-2-image-to-video',
        input: {
          prompt: enhancedPrompt,
          image_urls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
          aspect_ratio,
          n_frames,
          remove_watermark,
        },
      }),
    });

    const soraData = await soraResponse.json();

    if (!soraResponse.ok || soraData.code !== 200) {
      console.error('Sora API error:', soraData);
      return new Response(
        JSON.stringify({ error: soraData.msg || 'Failed to create task' }),
        { status: soraResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const taskId = soraData.data.taskId;
    console.log('Task created successfully:', taskId);

    const { data: generation, error: insertError } = await supabaseClient
      .from('video_generations')
      .insert({
        user_id: user.id,
        prompt,
        image_url: finalImageUrls.length > 0 ? finalImageUrls[0] : null,
        task_id: taskId,
        status: 'waiting',
        aspect_ratio,
        n_frames,
        remove_watermark,
        project_id: project_id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save generation record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        taskId,
        generation 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sora-create-task:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
