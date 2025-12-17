import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { slug } = await req.json();

    const { data: link, error } = await supabase
      .from('marketing_links')
      .select('*, marketing_link_logos(*)')
      .eq('slug', slug)
      .single();

    if (error || !link) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Link not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if revoked
    if (link.revoked) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This promotional signup link has been revoked.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if inactive
    if (!link.is_active) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This promotional link is currently inactive.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(link.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This promotional link has expired.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max uses
    if (link.max_uses && link.current_uses >= link.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, error: 'This promotional link has reached its maximum number of signups.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        valid: true, 
        link_id: link.id,
        title: link.title,
        initial_credits: link.initial_credits,
        logos: link.marketing_link_logos || [],
        og_image_url: link.og_image_url || null,
        og_thumbnail_url: link.og_thumbnail_url || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating marketing link:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Failed to validate link' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});