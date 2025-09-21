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
    const { text, voice = "alloy", language = "en-US", projectId } = await req.json();
    
    // Validate input
    if (!text || text.length > 4000) {
      throw new Error('Text is required and must be under 4000 characters');
    }

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Call OpenAI TTS API
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3'
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('TTS API error:', errorText);
      throw new Error(`TTS generation failed: ${errorText}`);
    }

    // Get audio as array buffer
    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBlob = new Uint8Array(audioBuffer);
    
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

    // Upload audio to Supabase Storage
    const fileName = `${user.id}/${projectId}/tts/${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('omnihuman-content')
      .upload(fileName, audioBlob, {
        contentType: 'audio/mpeg',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload audio file');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('omnihuman-content')
      .getPublicUrl(fileName);

    // Store audio file record
    const { data: audioFile, error: dbError } = await supabase
      .from('audio_files')
      .insert({
        project_id: projectId,
        source_type: 'tts',
        file_url: publicUrl,
        file_size_bytes: audioBlob.length,
        tts_settings: { voice, language, text: text.substring(0, 100) }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save audio file record');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      audioUrl: publicUrl,
      audioFileId: audioFile.id,
      settings: { voice, language }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('TTS generation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});