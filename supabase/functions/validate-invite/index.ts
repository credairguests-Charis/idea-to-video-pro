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
    const { slug } = await req.json();

    if (!slug) {
      return new Response(JSON.stringify({ valid: false, error: 'Slug is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Fetch invite link
    const { data: inviteLink, error: fetchError } = await supabaseClient
      .from('invite_links')
      .select('*')
      .eq('slug', slug)
      .single();

    if (fetchError || !inviteLink) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invite link not found' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if revoked
    if (inviteLink.revoked) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invite link has been revoked' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if expired
    if (new Date(inviteLink.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invite link has expired' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check max uses
    if (inviteLink.max_uses && inviteLink.current_uses >= inviteLink.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invite link has reached maximum uses' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ valid: true, invite_id: inviteLink.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ valid: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
