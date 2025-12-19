import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREDIT-TOPUP-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const event = JSON.parse(body);

    logStep("Event type", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only process one-time payments (not subscriptions)
      if (session.mode !== "payment") {
        logStep("Skipping non-payment session", { mode: session.mode });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const userId = session.metadata?.user_id;
      const credits = parseInt(session.metadata?.credits || "0", 10);
      const packageId = session.metadata?.package_id;

      if (!userId || !credits) {
        logStep("Missing metadata, skipping", { userId, credits });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Processing credit topup", { userId, credits, packageId });

      // Add credits to user profile
      const { data: profile, error: fetchError } = await supabaseClient
        .from("profiles")
        .select("credits")
        .eq("user_id", userId)
        .single();

      if (fetchError) {
        logStep("Error fetching profile", { error: fetchError.message });
        throw fetchError;
      }

      const currentCredits = profile?.credits || 0;
      const newCredits = currentCredits + credits;

      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ credits: newCredits })
        .eq("user_id", userId);

      if (updateError) {
        logStep("Error updating credits", { error: updateError.message });
        throw updateError;
      }

      logStep("Credits updated", { previousCredits: currentCredits, newCredits });

      // Log the transaction
      await supabaseClient.from("transaction_logs").insert({
        user_id: userId,
        credits_change: credits,
        reason: `Credit top-up: ${packageId} package`,
        metadata: {
          package_id: packageId,
          stripe_session_id: session.id,
          amount_paid: session.amount_total,
        },
      });

      logStep("Transaction logged");
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
