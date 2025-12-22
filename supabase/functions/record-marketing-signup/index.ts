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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { link_id, user_id, device_info, referrer, utm_parameters } = await req.json();

    // Get marketing link
    const { data: link } = await supabase
      .from('marketing_links')
      .select('*')
      .eq('id', link_id)
      .single();

    if (!link) {
      return new Response(
        JSON.stringify({ error: 'Link not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment current_uses
    const { error: updateError } = await supabase
      .from('marketing_links')
      .update({ current_uses: link.current_uses + 1 })
      .eq('id', link_id);

    if (updateError) throw updateError;

    // Grant credits to user as FREE credits (marketing signups get free credits)
    // Using free_credits column - the trigger will auto-calculate total credits
    const { error: creditsError } = await supabase
      .from('profiles')
      .update({ free_credits: link.initial_credits })
      .eq('user_id', user_id);

    if (creditsError) {
      console.error('Error updating credits:', creditsError);
      // If update fails, it might be because profile doesn't exist yet - try insert
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ 
          user_id, 
          free_credits: link.initial_credits,
          paid_credits: 0
        });
      
      if (insertError) throw insertError;
    }

    // Log transaction
    const { error: logError } = await supabase
      .from('transaction_logs')
      .insert({
        user_id,
        credits_change: link.initial_credits,
        reason: 'marketing_signup',
        metadata: { 
          link_id, 
          link_title: link.title,
          credit_type: 'free'
        }
      });

    if (logError) throw logError;

    // Record usage
    const { error: usageError } = await supabase
      .from('marketing_link_usages')
      .insert({
        marketing_link_id: link_id,
        user_id,
        credited_amount: link.initial_credits,
        device_info,
        referrer,
        utm_parameters
      });

    if (usageError) throw usageError;

    return new Response(
      JSON.stringify({ success: true, credits_granted: link.initial_credits }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error recording marketing signup:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
