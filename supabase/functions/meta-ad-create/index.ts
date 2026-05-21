import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const META_API = "https://graph.facebook.com/v21.0";

async function uploadImage(adAccountId: string, token: string, url: string) {
  const r = await fetch(url);
  const blob = await r.blob();
  const fd = new FormData();
  fd.append("source", blob, "creative.jpg");
  fd.append("access_token", token);
  const up = await fetch(`${META_API}/${adAccountId}/adimages`, { method: "POST", body: fd });
  const data = await up.json();
  if (data.error) throw new Error(`Image upload: ${data.error.message}`);
  return Object.values(data.images || {})[0]?.["hash"] as string;
}

async function uploadVideo(adAccountId: string, token: string, url: string) {
  const r = await fetch(url);
  const blob = await r.blob();
  const fd = new FormData();
  fd.append("source", blob, "creative.mp4");
  fd.append("access_token", token);
  const up = await fetch(`${META_API}/${adAccountId}/advideos`, { method: "POST", body: fd });
  const data = await up.json();
  if (data.error) throw new Error(`Video upload: ${data.error.message}`);
  return data.id as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = Deno.env.get("META_ACCESS_TOKEN");
    const adAccountId = Deno.env.get("META_AD_ACCOUNT_ID");
    if (!token || !adAccountId) throw new Error("Meta credentials not configured");

    const {
      project_id, adset_id, name, status = "PAUSED",
      page_id, instagram_actor_id, pixel_id,
      format = "single", // single | carousel
      // single
      media_url, media_type = "image",
      // common
      primary_text, headline, description, link_url, cta_type = "LEARN_MORE",
      // multi-variant (Dynamic Creative-style)
      primary_text_variants = [], headline_variants = [],
      // carousel
      cards = [], // [{media_url, headline, description, link_url}]
      // tracking
      url_tags, // 'utm_source=facebook&utm_medium=cpc&utm_campaign=...'
    } = await req.json();

    if (!adset_id || !name) throw new Error("adset_id and name required");
    if (!page_id) throw new Error("page_id required (sync account first)");
    if (format === "single" && (!media_url || !link_url)) throw new Error("media_url and link_url required for single ad");
    if (format === "carousel" && cards.length < 2) throw new Error("carousel requires at least 2 cards");

    const objectStorySpec: any = { page_id };
    if (instagram_actor_id) objectStorySpec.instagram_actor_id = instagram_actor_id;

    let savedMediaUrl = media_url;
    let savedMediaType = media_type;

    if (format === "carousel") {
      // Upload each card image
      const childAttachments: any[] = [];
      for (const c of cards) {
        const hash = await uploadImage(adAccountId, token, c.media_url);
        childAttachments.push({
          image_hash: hash,
          link: c.link_url || link_url,
          name: c.headline,
          description: c.description,
          call_to_action: { type: cta_type, value: { link: c.link_url || link_url } },
        });
      }
      objectStorySpec.link_data = {
        link: link_url, message: primary_text,
        child_attachments: childAttachments,
      };
      savedMediaUrl = cards[0].media_url;
      savedMediaType = "carousel";
    } else if (media_type === "video") {
      const video_id = await uploadVideo(adAccountId, token, media_url);
      objectStorySpec.video_data = {
        video_id, title: headline, message: primary_text, link_description: description,
        call_to_action: { type: cta_type, value: { link: link_url } },
      };
    } else {
      const image_hash = await uploadImage(adAccountId, token, media_url);
      objectStorySpec.link_data = {
        image_hash, link: link_url, message: primary_text,
        name: headline, description,
        call_to_action: { type: cta_type, value: { link: link_url } },
      };
    }

    const creativeBody: any = {
      name: `${name} creative`,
      object_story_spec: objectStorySpec,
    };
    if (url_tags) creativeBody.url_tags = url_tags;

    // Asset feed for multi-variants (single format only)
    if (format === "single" && (primary_text_variants.length > 1 || headline_variants.length > 1)) {
      creativeBody.asset_feed_spec = {
        bodies: (primary_text_variants.length ? primary_text_variants : [primary_text]).map((t: string) => ({ text: t })),
        titles: (headline_variants.length ? headline_variants : [headline]).map((t: string) => ({ text: t })),
        link_urls: [{ website_url: link_url }],
        call_to_action_types: [cta_type],
      };
    }

    const crParams = new URLSearchParams();
    Object.entries(creativeBody).forEach(([k, v]) => {
      crParams.append(k, typeof v === "string" ? v : JSON.stringify(v));
    });
    crParams.append("access_token", token);
    const crRes = await fetch(`${META_API}/${adAccountId}/adcreatives`, { method: "POST", body: crParams });
    const crData = await crRes.json();
    if (crData.error) throw new Error(`Creative: ${crData.error.message}`);

    // Tracking specs (pixel events)
    const trackingSpecs = pixel_id ? [
      { "action.type": ["offsite_conversion"], fb_pixel: [pixel_id] },
    ] : undefined;

    const adBody: any = {
      name, adset_id, status,
      creative: JSON.stringify({ creative_id: crData.id }),
      access_token: token,
    };
    if (trackingSpecs) adBody.tracking_specs = JSON.stringify(trackingSpecs);

    const adParams = new URLSearchParams(adBody);
    const adRes = await fetch(`${META_API}/${adAccountId}/ads`, { method: "POST", body: adParams });
    const adData = await adRes.json();
    if (adData.error) throw new Error(`Ad: ${adData.error.message}`);

    if (project_id) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await supabase.from("meta_creatives").insert({
        project_id, name, media_type: savedMediaType, media_url: savedMediaUrl,
        title: headline, body: primary_text, cta_type, link_url,
      });
    }

    return new Response(JSON.stringify({ success: true, ad: adData, creative_id: crData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("meta-ad-create error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
