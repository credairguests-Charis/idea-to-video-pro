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
    const { audioData, fileName, projectId, duration } = await req.json();

    if (!audioData || !fileName || !projectId) {
      throw new Error('Missing required parameters: audioData, fileName, or projectId');
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

    // Decode base64 audio data
    const binaryString = atob(audioData);
    const audioBuffer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      audioBuffer[i] = binaryString.charCodeAt(i);
    }

    // Upload audio to Supabase Storage
    const fileExtension = fileName.split('.').pop() || 'mp3';
    const storageFileName = `${user.id}/${projectId}/uploads/${Date.now()}.${fileExtension}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('omnihuman-content')
      .upload(storageFileName, audioBuffer, {
        contentType: `audio/${fileExtension === 'mp3' ? 'mpeg' : fileExtension}`,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload audio file');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('omnihuman-content')
      .getPublicUrl(storageFileName);

    // Store audio file record
    const { data: audioFile, error: dbError } = await supabase
      .from('audio_files')
      .insert({
        project_id: projectId,
        source_type: 'upload',
        file_url: publicUrl,
        duration_seconds: duration,
        file_size_bytes: audioBuffer.length
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
      audioFileId: audioFile.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Audio upload error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});