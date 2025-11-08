import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to ${email} (${fullName})`);

    const emailResponse = await resend.emails.send({
      from: "Charis <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Charis - Let's Create Amazing UGC Videos!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 28px; margin-bottom: 20px;">Welcome to Charis, ${fullName}! 🎉</h1>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Thank you for joining Charis! We're excited to help you create winning UGC video ads with AI.
          </p>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Here's what you can do next:
          </p>
          
          <ul style="font-size: 16px; color: #555; line-height: 1.8;">
            <li>Create your first project</li>
            <li>Upload product images</li>
            <li>Generate stunning UGC videos with AI actors</li>
            <li>Download and use your videos for marketing campaigns</li>
          </ul>
          
          <div style="margin: 30px 0;">
            <a href="${req.headers.get("origin") || "https://fd178190-4e25-4a6b-a609-bdf282c1854b.lovableproject.com"}" 
               style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
              Get Started
            </a>
          </div>
          
          <p style="font-size: 14px; color: #777; margin-top: 30px;">
            If you have any questions, feel free to reach out to our support team.
          </p>
          
          <p style="font-size: 14px; color: #777;">
            Best regards,<br>
            The Charis Team
          </p>
        </div>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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
