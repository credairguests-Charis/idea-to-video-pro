import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invite_id, user_id } = await req.json();

    if (!invite_id || !user_id) {
      return new Response(JSON.stringify({ error: 'invite_id and user_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Record usage
    const { error: insertError } = await supabaseClient
      .from('invite_link_usages')
      .insert({
        invite_id,
        user_id,
      });

    if (insertError) {
      console.error('Error recording invite usage:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Increment current_uses using a direct query
    const { data: currentLink } = await supabaseClient
      .from('invite_links')
      .select('current_uses')
      .eq('id', invite_id)
      .single();

    if (currentLink) {
      await supabaseClient
        .from('invite_links')
        .update({ current_uses: currentLink.current_uses + 1 })
        .eq('id', invite_id);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
