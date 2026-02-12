import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productId, projectId, language, all } = await req.json();
    if (!projectId) throw new Error("projectId required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get project info for context
    const { data: project } = await supabase
      .from("projects")
      .select("brand_name, business_description, language, website_url")
      .eq("id", projectId)
      .single();

    const lang = language || project?.language || "fr";

    // Get products to process
    let query = supabase.from("shopping_products").select("*").eq("project_id", projectId);
    if (!all && productId) {
      query = query.eq("id", productId);
    } else {
      query = query.eq("status", "imported");
    }
    const { data: products, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!products || products.length === 0) throw new Error("No products to process");

    const results = [];
    for (const product of products) {
      try {
        const systemPrompt = `You are an AI Shopping Optimization expert. Your job is to optimize product listings for AI recommendation engines (ChatGPT, Gemini, Perplexity, Claude, Google SGE).

IMPORTANT: All output MUST be in ${lang === "fr" ? "French" : lang === "en" ? "English" : lang === "de" ? "German" : lang === "es" ? "Spanish" : lang === "it" ? "Italian" : lang === "nl" ? "Dutch" : lang === "pt" ? "Portuguese" : lang}. Do NOT mix languages.

Brand context: ${project?.brand_name || "Unknown"} - ${project?.business_description || "E-commerce store"}

You must return a JSON object using tool calling with these fields:
- ai_title: An enriched product title format: Product + benefit + target audience + key advantage
- ai_description: A recommendation-oriented description answering: Who is it for? In what context? Why choose it? What problem does it solve?
- ai_faq: Array of 6-8 Q&A objects with {question, answer} - natural questions covering: comparison, budget, shipping, durability, safety, special occasion, alternatives, value for money
- ai_schema_markup: Complete JSON-LD schema with @context, @type Product, name, description, brand, offers, and FAQPage schema
- ai_score: A score from 0-100 rating how well the product is optimized for AI citation`;

        const userPrompt = `Optimize this product for AI recommendation engines:

Title: ${product.title}
Description: ${product.description || "N/A"}
Price: ${product.price || "N/A"} ${product.currency || ""}
Brand: ${product.brand || "N/A"}
Category: ${product.category || "N/A"}
Availability: ${product.availability || "N/A"}
Condition: ${product.condition || "N/A"}
GTIN: ${product.gtin || "N/A"}
URL: ${product.product_url || "N/A"}`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            tools: [{
              type: "function",
              function: {
                name: "optimize_product",
                description: "Return optimized product content for AI engines",
                parameters: {
                  type: "object",
                  properties: {
                    ai_title: { type: "string", description: "Enriched product title" },
                    ai_description: { type: "string", description: "Recommendation-oriented description" },
                    ai_faq: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: { type: "string" },
                          answer: { type: "string" },
                        },
                        required: ["question", "answer"],
                      },
                      description: "6-8 natural Q&A pairs",
                    },
                    ai_schema_markup: { type: "object", description: "Complete JSON-LD schema" },
                    ai_score: { type: "number", description: "AI optimization score 0-100" },
                  },
                  required: ["ai_title", "ai_description", "ai_faq", "ai_schema_markup", "ai_score"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "optimize_product" } },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`AI error for product ${product.id}:`, response.status, errText);
          if (response.status === 429) throw new Error("Rate limit exceeded, please try again later");
          if (response.status === 402) throw new Error("Payment required, please add credits");
          continue;
        }

        const aiData = await response.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) {
          console.error("No tool call in response for product", product.id);
          continue;
        }

        const optimized = JSON.parse(toolCall.function.arguments);

        // Update product in DB
        await supabase
          .from("shopping_products")
          .update({
            ai_title: optimized.ai_title,
            ai_description: optimized.ai_description,
            ai_faq: optimized.ai_faq,
            ai_schema_markup: optimized.ai_schema_markup,
            ai_score: optimized.ai_score,
            status: "optimized",
          })
          .eq("id", product.id);

        results.push({ id: product.id, status: "optimized" });
      } catch (productError) {
        console.error(`Error processing product ${product.id}:`, productError);
        results.push({ id: product.id, status: "error", error: productError.message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-product-ai error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
