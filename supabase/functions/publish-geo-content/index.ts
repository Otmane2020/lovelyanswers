import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString();

    // Fetch GEO contents scheduled for today or earlier, not yet published
    const { data: contents, error } = await supabase
      .from("geo_contents")
      .select("*, projects!geo_contents_project_id_fkey(id, brand_name, website_url, user_id)")
      .lte("scheduled_date", today)
      .is("published_at", null)
      .limit(10);

    if (error) {
      console.error("Fetch error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${contents?.length || 0} GEO contents to publish`);

    let published = 0;

    for (const content of contents || []) {
      const project = content.projects;
      if (!project) continue;

      // Check if project has a connected CMS integration
      const { data: integration } = await supabase
        .from("integrations")
        .select("*")
        .eq("project_id", content.project_id)
        .eq("is_connected", true)
        .maybeSingle();

      if (integration) {
        // Push to CMS via cms-publish function
        try {
          const cmsRes = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/cms-publish`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                projectId: content.project_id,
                title: content.title,
                content: content.content,
                slug: content.slug,
                metaDescription: content.meta_description,
                contentType: "geo",
              }),
            }
          );

          const cmsData = await cmsRes.json();

          if (cmsData?.url) {
            await supabase
              .from("geo_contents")
              .update({
                published_at: new Date().toISOString(),
                is_public: true,
                published_url: cmsData.url,
              })
              .eq("id", content.id);

            published++;
            console.log(`Published GEO content ${content.id} to CMS: ${cmsData.url}`);
            continue;
          }
        } catch (cmsErr) {
          console.error(`CMS publish failed for ${content.id}:`, cmsErr);
        }
      }

      // Fallback: mark as published internally (no CMS)
      await supabase
        .from("geo_contents")
        .update({
          published_at: new Date().toISOString(),
          is_public: true,
        })
        .eq("id", content.id);

      published++;
      console.log(`Published GEO content ${content.id} internally`);
    }

    console.log(`Published ${published} GEO contents`);

    return new Response(
      JSON.stringify({ success: true, published, total: contents?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Publish GEO error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
