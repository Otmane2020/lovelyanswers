import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const META_API = "https://graph.facebook.com/v21.0";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = Deno.env.get("META_ACCESS_TOKEN");
    const adAccountId = Deno.env.get("META_AD_ACCOUNT_ID");
    const pageId = Deno.env.get("META_PAGE_ID");
    if (!token || !adAccountId) throw new Error("Meta credentials not configured");

    const {
      project_id, adset_id, name, page_id,
      media_url, media_type = "image",
      title, body: msgBody, link_url, cta_type = "LEARN_MORE",
      status = "PAUSED",
    } = await req.json();
    if (!adset_id || !name || !media_url || !link_url) throw new Error("adset_id, name, media_url, link_url required");

    const usedPageId = page_id || pageId;
    if (!usedPageId) throw new Error("META_PAGE_ID not set");

    // 1) Upload media
    let image_hash: string | undefined;
    let video_id: string | undefined;
    const mediaRes = await fetch(media_url);
    const mediaBlob = await mediaRes.blob();

    if (media_type === "image") {
      const fd = new FormData();
      fd.append("source", mediaBlob, "creative.jpg");
      fd.append("access_token", token);
      const up = await fetch(`${META_API}/${adAccountId}/adimages`, { method: "POST", body: fd });
      const upData = await up.json();
      if (upData.error) throw new Error(upData.error.message);
      image_hash = Object.values(upData.images || {})[0]?.["hash"];
    } else {
      const fd = new FormData();
      fd.append("source", mediaBlob, "creative.mp4");
      fd.append("access_token", token);
      const up = await fetch(`${META_API}/${adAccountId}/advideos`, { method: "POST", body: fd });
      const upData = await up.json();
      if (upData.error) throw new Error(upData.error.message);
      video_id = upData.id;
    }

    // 2) Build creative
    const objectStorySpec: any = { page_id: usedPageId };
    if (image_hash) {
      objectStorySpec.link_data = {
        image_hash, link: link_url, message: msgBody, name: title,
        call_to_action: { type: cta_type, value: { link: link_url } },
      };
    } else if (video_id) {
      objectStorySpec.video_data = {
        video_id, title, message: msgBody,
        call_to_action: { type: cta_type, value: { link: link_url } },
      };
    }
    const creativeParams = new URLSearchParams({
      name: `${name} creative`,
      object_story_spec: JSON.stringify(objectStorySpec),
      access_token: token,
    });
    const crRes = await fetch(`${META_API}/${adAccountId}/adcreatives`, { method: "POST", body: creativeParams });
    const crData = await crRes.json();
    if (crData.error) throw new Error(crData.error.message);

    // 3) Create ad
    const adParams = new URLSearchParams({
      name, adset_id, status,
      creative: JSON.stringify({ creative_id: crData.id }),
      access_token: token,
    });
    const adRes = await fetch(`${META_API}/${adAccountId}/ads`, { method: "POST", body: adParams });
    const adData = await adRes.json();
    if (adData.error) throw new Error(adData.error.message);

    // 4) Save creative
    if (project_id) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await supabase.from("meta_creatives").insert({
        project_id, name, media_type, media_url, image_hash, video_id,
        title, body: msgBody, cta_type, link_url,
      });
    }

    return new Response(JSON.stringify({ success: true, ad: adData, creative_id: crData.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("meta-ad-create error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
