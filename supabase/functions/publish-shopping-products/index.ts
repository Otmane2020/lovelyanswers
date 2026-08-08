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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];

    // Scheduled for today or earlier, not yet published — `lte` (not `eq`)
    // so a row that failed to publish (see publishFailed below, which
    // deliberately leaves `published` false) gets picked up and retried on
    // the next run instead of falling out of every future day's exact-date
    // match.
    const { data: todayEntries, error: fetchError } = await supabase
      .from("shopping_planning")
      .select("*, product:shopping_products(*)")
      .lte("scheduled_date", today)
      .eq("published", false);

    if (fetchError) throw fetchError;

    if (!todayEntries || todayEntries.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No products scheduled for today",
        published: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let publishedCount = 0;

    for (const entry of todayEntries) {
      const product = entry.product;
      if (!product || !product.ai_title) continue;

      // Get project info for CMS publishing
      const { data: project } = await supabase
        .from("projects")
        .select("id, website_url, language, brand_name")
        .eq("id", entry.project_id)
        .single();

      if (!project) continue;

      // Get integration for publishing
      const { data: integration } = await supabase
        .from("integrations")
        .select("*")
        .eq("project_id", entry.project_id)
        .eq("is_connected", true)
        .limit(1)
        .single();

      // Build article HTML from product AI content
      const faqHtml = Array.isArray(product.ai_faq) && product.ai_faq.length > 0
        ? `<h2>Questions fréquentes</h2>${product.ai_faq.map((f: any) =>
            `<h3>${f.question}</h3><p>${f.answer}</p>`
          ).join("")}`
        : "";

      const schemaScript = product.ai_schema_markup
        ? `<script type="application/ld+json">${JSON.stringify(product.ai_schema_markup)}</script>`
        : "";

      // The real catalog image was fetched and stored at import time
      // (product.image_url) but this function never rendered it — the
      // published article had no <img> at all, and the AI-authored
      // ai_schema_markup JSON-LD isn't visible content. Use the real
      // product image(s), never a stock/hallucinated one; alt text is the
      // product title plus brand for context, not the raw filename.
      const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      const productName = product.ai_title || product.title;
      const altText = escapeAttr(product.brand ? `${productName} — ${product.brand}` : productName);
      const allImages = [product.image_url, ...(product.additional_images || [])].filter(Boolean);
      const imagesHtml = allImages.length
        ? allImages.map((url: string, i: number) =>
            `<img src="${escapeAttr(url)}" alt="${i === 0 ? altText : `${altText} — image ${i + 1}`}" loading="lazy">`
          ).join("")
        : "";

      const priceHtml = product.price
        ? product.sale_price && product.sale_price < product.price
          ? `<p><strong>Prix : ${product.sale_price} ${product.currency || "EUR"}</strong> <s>${product.price} ${product.currency || "EUR"}</s></p>`
          : `<p><strong>Prix : ${product.price} ${product.currency || "EUR"}</strong></p>`
        : "";

      const ctaHtml = product.product_url
        ? `<p><a href="${escapeAttr(product.product_url)}" rel="nofollow">Voir le produit</a></p>`
        : "";

      const htmlContent = `
        <article>
          ${imagesHtml}
          ${product.ai_description ? `<p>${product.ai_description}</p>` : ""}
          ${priceHtml}
          ${ctaHtml}
          ${faqHtml}
          ${schemaScript}
        </article>
      `.trim();

      const slug = (product.ai_title || product.title)
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // If CMS integration exists, publish via cms-publish — and only
      // treat it as published if that actually succeeded. This used to
      // log-and-continue on any CMS error, then unconditionally mark the
      // product "published" right after regardless of outcome — a false
      // positive that made real publish failures invisible.
      let publishedUrl: string | null = null;
      let publishFailed = false;
      let publishErrorMessage: string | null = null;

      if (integration) {
        try {
          const { data: cmsData, error: cmsError } = await supabase.functions.invoke("cms-publish", {
            body: {
              projectId: entry.project_id,
              title: product.ai_title || product.title,
              content: htmlContent,
              slug,
              metaDescription: product.ai_description?.substring(0, 160),
            },
          });
          if (cmsError || !cmsData?.success) {
            publishFailed = true;
            publishErrorMessage = cmsError?.message || cmsData?.message || "CMS publish did not succeed";
            console.error("CMS publish error:", publishErrorMessage);
          } else {
            publishedUrl = cmsData.publishedUrl || `/${slug}`;
          }
        } catch (e) {
          publishFailed = true;
          publishErrorMessage = e instanceof Error ? e.message : String(e);
          console.error("CMS publish failed:", e);
        }
      } else {
        // No CMS connected — nowhere else to send it, publish internally
        // (matches publish-geo-content's fallback for the same case).
        publishedUrl = `/${slug}`;
      }

      if (publishFailed) {
        await supabase
          .from("shopping_products")
          .update({ publish_error: publishErrorMessage })
          .eq("id", product.id);
        continue; // leave it eligible for the next run instead of marking it live
      }

      // Update product status
      await supabase
        .from("shopping_products")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          published_url: publishedUrl,
          publish_error: null,
        })
        .eq("id", product.id);

      // Mark planning entry as published
      await supabase
        .from("shopping_planning")
        .update({ published: true, published_at: new Date().toISOString() })
        .eq("id", entry.id);

      publishedCount++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      published: publishedCount,
      total: todayEntries.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
