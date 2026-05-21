import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const META_API = "https://graph.facebook.com/v21.0";

// Generate Meta-rendered preview iframe for a temporary creative spec
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = Deno.env.get("META_ACCESS_TOKEN");
    let adAccountId = Deno.env.get("META_AD_ACCOUNT_ID");
    if (!token || !adAccountId) throw new Error("Meta credentials not configured");
    if (!adAccountId.startsWith("act_")) adAccountId = `act_${adAccountId}`;

    const {
      page_id, instagram_actor_id,
      format = "single", // single | carousel
      media, // {image_hash?, video_id?, image_url?} for single
      cards = [], // [{image_hash, name, description, link, call_to_action}]
      primary_text, headline, description, link_url,
      cta_type = "LEARN_MORE",
      ad_format = "MOBILE_FEED_STANDARD",
    } = await req.json();

    if (!page_id) throw new Error("page_id required");

    const objectStorySpec: any = { page_id };
    if (instagram_actor_id) objectStorySpec.instagram_actor_id = instagram_actor_id;

    if (format === "carousel" && cards.length >= 2) {
      objectStorySpec.link_data = {
        link: link_url,
        message: primary_text,
        child_attachments: cards.map((c: any) => ({
          image_hash: c.image_hash,
          link: c.link || link_url,
          name: c.name,
          description: c.description,
          call_to_action: { type: cta_type, value: { link: c.link || link_url } },
        })),
      };
    } else if (media?.video_id) {
      objectStorySpec.video_data = {
        video_id: media.video_id,
        title: headline,
        message: primary_text,
        link_description: description,
        call_to_action: { type: cta_type, value: { link: link_url } },
      };
    } else {
      objectStorySpec.link_data = {
        ...(media?.image_hash ? { image_hash: media.image_hash } : {}),
        ...(media?.image_url ? { picture: media.image_url } : {}),
        link: link_url,
        message: primary_text,
        name: headline,
        description,
        call_to_action: { type: cta_type, value: { link: link_url } },
      };
    }

    // generatepreviews accepts a creative spec via creative={...}
    const creative = { object_story_spec: objectStorySpec };
    const params = new URLSearchParams({
      creative: JSON.stringify(creative),
      ad_format,
      access_token: token,
    });

    const res = await fetch(`${META_API}/${adAccountId}/generatepreviews`, { method: "POST", body: params });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const body = data.data?.[0]?.body || null;

    return new Response(JSON.stringify({ success: true, html: body, ad_format }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("meta-ad-preview error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
