import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionSuccessEmailRequest {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: SubscriptionSuccessEmailRequest = await req.json();

    console.log(`Sending subscription success email to ${email} (${fullName})`);

    const baseUrl = req.headers.get("origin") || "https://fd178190-4e25-4a6b-a609-bdf282c1854b.lovableproject.com";

    const emailResponse = await resend.emails.send({
      from: "Charis <charis@onboard.usecharis.com>",
      to: [email],
      subject: "🎉 Welcome to Charis Pro - Start Creating Amazing Videos!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 28px; margin-bottom: 20px;">🎉 Congratulations, ${fullName}!</h1>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Your subscription to Charis Pro is now active! You now have unlimited access to create stunning UGC video ads with AI actors.
          </p>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Here's what you can do now:
          </p>
          
          <ul style="font-size: 16px; color: #555; line-height: 1.8;">
            <li>✨ Generate unlimited UGC videos with AI actors</li>
            <li>🎬 Access our full library of diverse AI actors</li>
            <li>📸 Upload your product images and create compelling ads</li>
            <li>💾 Download high-quality videos for your campaigns</li>
            <li>🚀 Scale your marketing with AI-powered content</li>
          </ul>
          
          <div style="margin: 30px 0;">
            <a href="${baseUrl}/app" 
               style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
              Start Creating Videos Now
            </a>
          </div>
          
          <p style="font-size: 14px; color: #777; margin-top: 30px;">
            Need help getting started? Check out our tutorials or reach out to our support team anytime.
          </p>
          
          <p style="font-size: 14px; color: #777;">
            Thank you for choosing Charis!<br>
            Best regards,<br>
            The Charis Team
          </p>
        </div>
      `,
    });

    console.log("Subscription success email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-subscription-success-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
