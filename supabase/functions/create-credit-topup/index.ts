import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credit package definitions
const CREDIT_PACKAGES = {
  small: {
    priceId: "price_1Sg9afHtRqlJeQR0iWhxbZ0B",
    credits: 350,
    name: "350 Credits",
  },
  medium: {
    priceId: "price_1Sg9b4HtRqlJeQR0M02tQpGl",
    credits: 700,
    name: "700 Credits",
  },
  large: {
    priceId: "price_1Sg9bXHtRqlJeQR09WvuQTfM",
    credits: 1400,
    name: "1400 Credits",
  },
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CREDIT-TOPUP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { packageId } = await req.json();
    logStep("Package requested", { packageId });

    const selectedPackage = CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES];
    if (!selectedPackage) {
      throw new Error(`Invalid package ID: ${packageId}`);
    }
    logStep("Package validated", selectedPackage);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer lookup", { customerId: customerId || "new customer" });

    const origin = req.headers.get("origin") || "https://usecharis.com";

    // Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: selectedPackage.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/app/projects?topup=success&credits=${selectedPackage.credits}`,
      cancel_url: `${origin}/app/projects?topup=cancelled`,
      metadata: {
        user_id: user.id,
        credits: selectedPackage.credits.toString(),
        package_id: packageId,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
