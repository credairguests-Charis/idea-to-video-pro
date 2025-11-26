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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify admin user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData, error: roleError } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { expires_at, max_uses } = await req.json();

    if (!expires_at) {
      return new Response(JSON.stringify({ error: 'expires_at is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate random slug
    const slug = crypto.randomUUID().split('-')[0] + crypto.randomUUID().split('-')[0];

    // Create invite link
    const { data: inviteLink, error: insertError } = await supabaseClient
      .from('invite_links')
      .insert({
        slug,
        expires_at,
        max_uses: max_uses || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invite link:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate full URL
    const origin = req.headers.get('origin') || 'https://yourapp.com';
    const inviteUrl = `${origin}/invite/${slug}`;

    return new Response(
      JSON.stringify({ 
        ...inviteLink, 
        invite_url: inviteUrl 
      }),
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
