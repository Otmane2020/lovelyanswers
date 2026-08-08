import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { feedUrl, projectId, language } = await req.json();
    if (!feedUrl || !projectId) throw new Error("feedUrl and projectId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the feed XML
    const feedResponse = await fetch(feedUrl);
    if (!feedResponse.ok) throw new Error(`Failed to fetch feed: ${feedResponse.status}`);
    const feedText = await feedResponse.text();

    // Parse XML feed (Google Merchant Center format)
    const products = parseGoogleMerchantFeed(feedText);
    if (products.length === 0) throw new Error("No products found in feed");

    // Insert products into database
    const productsToInsert = products.map((p: any) => ({
      project_id: projectId,
      title: p.title || "Untitled Product",
      description: p.description || null,
      price: p.price ? parseFloat(p.price.replace(/[^0-9.]/g, "")) : null,
      sale_price: p.sale_price ? parseFloat(p.sale_price.replace(/[^0-9.]/g, "")) : null,
      currency: p.currency || "EUR",
      image_url: p.image_link || null,
      additional_images: p.additional_image_links?.length ? p.additional_image_links : null,
      product_url: p.link || null,
      brand: p.brand || null,
      category: p.product_type || p.google_product_category || null,
      availability: p.availability || null,
      condition: p.condition || null,
      gtin: p.gtin || null,
      mpn: p.mpn || null,
      feed_item_id: p.id || null,
      language: language || "fr",
      // status is deliberately omitted: the column defaults to 'imported'
      // for a genuinely new row, but on an upsert-triggered UPDATE (product
      // already enriched/published from a previous sync) including it here
      // would silently reset status back to 'imported' on every re-sync.
    }));

    // Upsert on (project_id, feed_item_id) so re-syncing a feed updates
    // existing products instead of inserting duplicates every time. Rows
    // with no feed_item_id (id missing from the feed) always insert fresh
    // since NULL never conflicts — same as before for that edge case.
    const { data, error } = await supabase
      .from("shopping_products")
      .upsert(productsToInsert, { onConflict: "project_id,feed_item_id" })
      .select("id");

    if (error) throw error;

    // Save feed record
    await supabase.from("shopping_feeds").insert({
      project_id: projectId,
      feed_url: feedUrl,
      feed_type: "xml",
      last_synced_at: new Date().toISOString(),
      product_count: products.length,
      status: "active",
    });

    return new Response(JSON.stringify({ count: products.length, products: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-shopping-feed error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseGoogleMerchantFeed(xml: string): any[] {
  const products: any[] = [];
  // Extract all <item> or <entry> blocks
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const product: any = {};
    // Extract standard Google Merchant fields
    const fields = [
      "id", "title", "description", "link", "image_link",
      "price", "sale_price", "brand", "gtin", "mpn", "condition",
      "availability", "product_type", "google_product_category",
    ];
    for (const field of fields) {
      // Match both <field> and <g:field> namespaced variants
      const fieldRegex = new RegExp(`<(?:g:)?${field}[^>]*>([\\s\\S]*?)<\\/(?:g:)?${field}>`, "i");
      const fieldMatch = fieldRegex.exec(itemXml);
      if (fieldMatch) {
        product[field] = fieldMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
      }
    }
    // additional_image_link can appear multiple times per item — a single
    // fieldRegex.exec() (like the loop above) only ever captures the first.
    const extraImageRegex = /<(?:g:)?additional_image_link[^>]*>([\s\S]*?)<\/(?:g:)?additional_image_link>/gi;
    const extraImages: string[] = [];
    let extraImageMatch;
    while ((extraImageMatch = extraImageRegex.exec(itemXml)) !== null) {
      const url = extraImageMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
      if (url) extraImages.push(url);
    }
    if (extraImages.length) product.additional_image_links = extraImages;
    // Extract currency from price
    if (product.price) {
      const currencyMatch = product.price.match(/[A-Z]{3}/);
      if (currencyMatch) product.currency = currencyMatch[0];
      product.price = product.price.replace(/[^0-9.]/g, "");
    }
    if (product.sale_price) {
      product.sale_price = product.sale_price.replace(/[^0-9.]/g, "");
    }
    if (product.title) products.push(product);
  }
  return products;
}
