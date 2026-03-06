import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optional API key validation
    const apiKey = Deno.env.get("ARTICLE_API_KEY");
    if (apiKey) {
      const providedKey = req.headers.get("x-api-key");
      if (providedKey !== apiKey) {
        console.log("[receive-article] Invalid API key provided");
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Parse request body
    const text = await req.text();
    console.log("[receive-article] Received body:", text.substring(0, 500));
    
    let body;
    try {
      body = JSON.parse(text);
    } catch (parseError) {
      console.error("[receive-article] JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract fields - accept both 'body' and 'content' for the article content
    const { title, body: articleBody, content, slug, sourceId, metaDescription, author } = body;
    const finalBody = articleBody || content;

    console.log("[receive-article] Parsed fields - title:", title, "slug:", slug, "hasBody:", !!finalBody);

    // Validate required fields
    if (!title || !finalBody || !slug) {
      console.log("[receive-article] Missing required fields");
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: title, body, slug",
          received: { title: !!title, body: !!finalBody, slug: !!slug }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert article (update if slug exists, insert if new)
    const { data: article, error } = await supabase
      .from("published_articles")
      .upsert(
        {
          title,
          body: finalBody,
          slug,
          source_id: sourceId || null,
          meta_description: metaDescription || null,
          author: author || null,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" }
      )
      .select()
      .single();

    if (error) {
      console.error("[receive-article] Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save article", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the public URL for this article
    // Use the app URL (not the edge function URL)
    const publicUrl = `https://autopilotgeo.com/blog/${slug}`;

    console.log("[receive-article] Article saved successfully:", slug);

    return new Response(
      JSON.stringify({
        success: true,
        article: {
          id: article.id,
          slug: article.slug,
          url: publicUrl,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[receive-article] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
