import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GrantAccessRequest {
  target_user_id?: string;
  target_email?: string;
  grant_access: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client for user auth check
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await authClient.auth.getUser(token);
    
    if (authError || !userData.user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminId = userData.user.id;

    // Create admin client for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin using the has_role function
    const { data: isAdmin, error: roleError } = await adminClient.rpc('has_role', {
      _user_id: adminId,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { target_user_id, target_email, grant_access }: GrantAccessRequest = await req.json();

    if (!target_user_id && !target_email) {
      return new Response(
        JSON.stringify({ error: "Either target_user_id or target_email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId = target_user_id;

    // If email provided, find the user
    if (!userId && target_email) {
      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('user_id')
        .eq('email', target_email)
        .single();

      if (profileError || !profile) {
        // User doesn't exist yet - we'll create a placeholder profile if they sign up
        // For now, return error
        return new Response(
          JSON.stringify({ error: "User not found with this email. They must sign up first." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = profile.user_id;
    }

    // Update the user's profile with unlimited access
    const updateData: Record<string, any> = {
      has_unlimited_access: grant_access,
    };

    if (grant_access) {
      updateData.unlimited_access_granted_at = new Date().toISOString();
      updateData.unlimited_access_granted_by = adminId;
    } else {
      updateData.unlimited_access_granted_at = null;
      updateData.unlimited_access_granted_by = null;
    }

    const { data: updatedProfile, error: updateError } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update user access", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log this action
    await adminClient.from('admin_audit_logs').insert({
      admin_id: adminId,
      action: grant_access ? 'grant_unlimited_access' : 'revoke_unlimited_access',
      target_type: 'user',
      target_id: userId,
      details: {
        target_email: target_email || updatedProfile.email,
        grant_access,
      },
    });

    console.log(`Admin ${adminId} ${grant_access ? 'granted' : 'revoked'} unlimited access for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: grant_access 
          ? "Unlimited access granted successfully" 
          : "Unlimited access revoked successfully",
        user: {
          user_id: userId,
          email: updatedProfile.email,
          has_unlimited_access: updatedProfile.has_unlimited_access,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
