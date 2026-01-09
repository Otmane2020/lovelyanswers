import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const userId = claimsData.claims.sub;
    const { domain, days = 30 } = await req.json();

    if (!domain) {
      return new Response(JSON.stringify({ error: "Domain is required" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Get GSC data first
    const gscResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/get-search-console-data`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain, days }),
      }
    );

    if (!gscResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch GSC data" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const gscData = await gscResponse.json();
    const data = gscData.data || [];

    if (data.length < 14) {
      return new Response(JSON.stringify({ 
        summary: { total_alerts: 0 }, 
        message: "Not enough data to analyze anomalies" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Split data into two periods
    const halfLength = Math.floor(data.length / 2);
    const recentPeriod = data.slice(halfLength);
    const previousPeriod = data.slice(0, halfLength);

    // Calculate metrics for each period
    const calcMetrics = (period: any[]) => ({
      clicks: period.reduce((sum, d) => sum + d.clicks, 0),
      impressions: period.reduce((sum, d) => sum + d.impressions, 0),
      avgCtr: period.reduce((sum, d) => sum + d.ctr, 0) / period.length,
      avgPosition: period.reduce((sum, d) => sum + d.position, 0) / period.length,
    });

    const recent = calcMetrics(recentPeriod);
    const previous = calcMetrics(previousPeriod);

    const alerts: any[] = [];
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check for significant drops (>20%)
    const metrics = [
      { name: "clicks", prev: previous.clicks, curr: recent.clicks },
      { name: "impressions", prev: previous.impressions, curr: recent.impressions },
      { name: "ctr", prev: previous.avgCtr, curr: recent.avgCtr },
    ];

    for (const metric of metrics) {
      if (metric.prev > 0) {
        const changePercent = ((metric.curr - metric.prev) / metric.prev) * 100;
        
        if (changePercent < -20) {
          const severity = changePercent < -50 ? "critical" : changePercent < -30 ? "high" : "medium";
          
          // Check if alert already exists
          const { data: existingAlert } = await adminClient
            .from("gsc_alerts")
            .select("id")
            .eq("user_id", userId)
            .eq("domain", domain)
            .eq("metric_name", metric.name)
            .eq("is_resolved", false)
            .single();

          if (!existingAlert) {
            const { error: insertError } = await adminClient
              .from("gsc_alerts")
              .insert({
                user_id: userId,
                domain,
                metric_name: metric.name,
                previous_value: metric.prev,
                current_value: metric.curr,
                change_percentage: changePercent,
                severity,
                detection_date: new Date().toISOString(),
              });

            if (!insertError) {
              alerts.push({ metric: metric.name, change: changePercent, severity });
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      summary: { total_alerts: alerts.length },
      alerts 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
