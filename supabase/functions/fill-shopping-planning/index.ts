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
    const { projectId } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth check (allow service_role bypass)
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader && !authHeader.includes(serviceRoleKey)) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    // Fetch all products with AI content for this project
    const { data: products, error: prodError } = await supabase
      .from("shopping_products")
      .select("id, title, ai_title, ai_description, status")
      .eq("project_id", projectId)
      .not("ai_title", "is", null);

    if (prodError) throw prodError;
    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No products with AI content found. Generate AI content first." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing planning entries for next 30 days
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 29);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("shopping_planning")
      .select("scheduled_date")
      .eq("project_id", projectId)
      .gte("scheduled_date", formatDate(today))
      .lte("scheduled_date", formatDate(endDate));

    const existingDates = new Set((existing || []).map((e: any) => e.scheduled_date));

    // Fill missing days with random products
    const inserts: any[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = formatDate(d);

      if (existingDates.has(dateStr)) continue;

      // Pick a random product
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      inserts.push({
        project_id: projectId,
        product_id: randomProduct.id,
        scheduled_date: dateStr,
        published: false,
      });
    }

    if (inserts.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Planning already complete", 
        daysAdded: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await supabase
      .from("shopping_planning")
      .insert(inserts);

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ 
      success: true, 
      daysAdded: inserts.length,
      totalProducts: products.length 
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
