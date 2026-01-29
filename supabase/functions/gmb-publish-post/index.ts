import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { projectId, content, type, imageUrl } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get GMB integration WITH project ownership verification
    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .select("*, projects!inner(user_id)")
      .eq("project_id", projectId)
      .eq("platform", "google_business")
      .single();

    if (intError || !integration?.config?.access_token) {
      return new Response(
        JSON.stringify({ error: "GMB not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CRITICAL SECURITY CHECK: Verify user owns this integration
    const integrationOwnerId = (integration.projects as { user_id: string }).user_id;
    if (integrationOwnerId !== user.id) {
      console.error(`[gmb-publish-post] SECURITY VIOLATION: User ${user.id} attempted to access integration owned by ${integrationOwnerId}`);
      return new Response(
        JSON.stringify({ error: "Access denied - integration belongs to another user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = integration.config.access_token;
    const locationName = integration.config.location_name;

    if (!locationName) {
      return new Response(
        JSON.stringify({ error: "No business location configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build post body
    const postBody: any = {
      languageCode: "en",
      summary: content.substring(0, 1500),
      topicType: type || "STANDARD",
    };

    // Add call to action if it's an offer
    if (type === "OFFER") {
      postBody.callToAction = {
        actionType: "LEARN_MORE",
        url: integration.config.website_url || "",
      };
    }

    // Add media if provided
    if (imageUrl) {
      postBody.media = [
        {
          mediaFormat: "PHOTO",
          sourceUrl: imageUrl,
        },
      ];
    }

    // Create local post
    const postResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postBody),
      }
    );

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error("GMB post error:", errorText);
      throw new Error(`Failed to publish post: ${errorText}`);
    }

    const postData = await postResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        post: postData,
        message: "Post published to Google Business Profile" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error publishing GMB post:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
