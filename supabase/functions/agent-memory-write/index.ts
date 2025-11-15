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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { content, memoryType, metadata = {} } = await req.json();

    console.log(`Writing memory for user ${user.id}, type: ${memoryType}`);

    // Generate embedding for content using OpenAI
    let embedding;
    if (openaiKey) {
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: content,
        }),
      });

      if (!embeddingResponse.ok) {
        throw new Error(`OpenAI API error: ${embeddingResponse.statusText}`);
      }

      const embeddingData = await embeddingResponse.json();
      embedding = embeddingData.data[0].embedding;
    } else {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Insert memory into database
    const { data: memory, error: insertError } = await supabase
      .from('agent_memory')
      .insert({
        user_id: user.id,
        memory_type: memoryType,
        content: content,
        embedding: embedding,
        metadata: metadata
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting memory:', insertError);
      throw insertError;
    }

    console.log(`Memory created: ${memory.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        memoryId: memory.id,
        message: 'Memory saved successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in agent-memory-write:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});