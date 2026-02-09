import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, email } = await req.json();
    
    if (!url || !email) {
      return new Response(
        JSON.stringify({ error: "URL and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-audit-email] Starting audit for ${url}, sending to ${email}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Step 1: Run the audit (call free-audit logic inline to avoid function-to-function calls)
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY")!;

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    let domain: string;
    try {
      domain = new URL(cleanUrl).hostname.replace("www.", "");
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-audit-email] Scraping ${cleanUrl}...`);

    // Scrape website
    let pageContent = "";
    let pageTitle = "";
    let metaDescription = "";

    if (firecrawlApiKey) {
      try {
        const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: cleanUrl,
            formats: ["markdown", "html"],
            onlyMainContent: false,
          }),
        });

        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json();
          pageContent = scrapeData.data?.markdown || "";
          pageTitle = scrapeData.data?.metadata?.title || "";
          metaDescription = scrapeData.data?.metadata?.description || "";
          console.log(`[send-audit-email] Scraped ${pageContent.length} chars`);
        }
      } catch (scrapeError) {
        console.error("[send-audit-email] Firecrawl error:", scrapeError);
      }
    }

    // Fallback: direct fetch
    if (!pageContent) {
      try {
        const response = await fetch(cleanUrl, {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
        });
        if (response.ok) {
          const htmlContent = await response.text();
          const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
          pageTitle = titleMatch?.[1]?.trim() || "";
          const descMatch = htmlContent.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
          metaDescription = descMatch?.[1]?.trim() || "";
          const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
          if (bodyMatch) {
            pageContent = bodyMatch[1]
              .replace(/<script[\s\S]*?<\/script>/gi, "")
              .replace(/<style[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .substring(0, 5000);
          }
        }
      } catch (e) {
        console.error("[send-audit-email] Direct fetch error:", e);
      }
    }

    // AI audit analysis
    console.log("[send-audit-email] Running AI audit...");
    const auditPrompt = `You are an expert SEO and AEO (Answer Engine Optimization) auditor. Analyze this website comprehensively.

URL: ${cleanUrl}
Domain: ${domain}
Page Title: ${pageTitle || "Not found"}
Meta Description: ${metaDescription || "Not found"}
Content Length: ${pageContent.length} characters

Page Content (first 4000 chars):
${pageContent.substring(0, 4000)}

Perform a COMPREHENSIVE audit with exactly 15 checks across these categories:

**SEO Checks (8-9 checks):**
1. Title Tag - Is it present, optimal length (30-60 chars), contains keywords?
2. Meta Description - Present, compelling, optimal length (120-160 chars)?
3. H1 Tag - Single H1 present, keyword-optimized?
4. Heading Hierarchy - Proper H1>H2>H3 structure?
5. Content Depth - Enough content (min 300+ words)? Quality assessment
6. Internal Links - Are there internal links for navigation?
7. Schema Markup / Structured Data - JSON-LD present?
8. Mobile & Speed - Viewport meta, responsive indicators?
9. Image Optimization - Alt tags, lazy loading?

**AEO Checks (6-7 checks):**
10. AI-Citable Content - Content structured with clear Q&A or definitions AI can quote?
11. FAQ Schema - FAQ structured data present?
12. Entity Authority - Clear brand/entity information, About page, contact info?
13. Content Freshness - Recent publication dates, blog/news section?
14. llms.txt / AI Crawlability - Indicators that AI bots can access content?
15. Topical Authority - Deep coverage of core topics, supporting articles?

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "category": "Title Tag",
    "status": "pass",
    "title": "Title tag is well optimized",
    "description": "The title is 52 characters and includes main keyword",
    "impact": "high",
    "recommendation": "Consider adding brand name at the end"
  }
]

Rules:
- status must be "pass", "warning", or "fail"
- impact must be "high", "medium", or "low"
- Be specific with actual findings
- Include actionable recommendations for warnings and fails
- Return exactly 15 checks`;

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lovelyanswers.com",
        "X-Title": "LovelyAnswers Audit",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an SEO & AEO expert auditor. Always respond with valid JSON arrays only." },
          { role: "user", content: auditPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const auditContent = aiData.choices?.[0]?.message?.content;

    let auditResults: any[] = [];
    try {
      const jsonMatch = auditContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                        auditContent.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, auditContent];
      auditResults = JSON.parse((jsonMatch[1] || auditContent).trim());
    } catch {
      auditResults = [
        { category: "Technical", status: "warning", title: "Audit partially completed", description: "Some checks could not be processed.", impact: "medium" },
      ];
    }

    // Calculate scores
    const totalChecks = auditResults.length;
    const passCount = auditResults.filter((r: any) => r.status === "pass").length;
    const warningCount = auditResults.filter((r: any) => r.status === "warning").length;
    const failCount = auditResults.filter((r: any) => r.status === "fail").length;
    const overallScore = Math.round((passCount * 100 + warningCount * 50) / Math.max(totalChecks, 1));

    const aeoCategories = ["AI-Citable Content", "FAQ Schema", "Entity Authority", "Content Freshness", "llms.txt", "AI Crawlability", "Topical Authority", "AEO"];
    const seoResults = auditResults.filter((r: any) => !aeoCategories.some(c => r.category.toLowerCase().includes(c.toLowerCase())));
    const aeoResultsFiltered = auditResults.filter((r: any) => aeoCategories.some(c => r.category.toLowerCase().includes(c.toLowerCase())));

    const seoScore = seoResults.length > 0
      ? Math.round(seoResults.reduce((acc: number, r: any) => acc + (r.status === "pass" ? 100 : r.status === "warning" ? 50 : 0), 0) / seoResults.length)
      : 50;

    const aeoScore = aeoResultsFiltered.length > 0
      ? Math.round(aeoResultsFiltered.reduce((acc: number, r: any) => acc + (r.status === "pass" ? 100 : r.status === "warning" ? 50 : 0), 0) / aeoResultsFiltered.length)
      : 30;

    const scores = { overall: overallScore, seo: seoScore, aeo: aeoScore };
    const summary = { total: totalChecks, passed: passCount, warnings: warningCount, failed: failCount };

    console.log(`[send-audit-email] Scores: Overall=${overallScore}, SEO=${seoScore}, AEO=${aeoScore}`);

    // Step 2: Save to site_audits table
    const { data: savedAudit, error: saveError } = await supabaseAdmin
      .from("site_audits")
      .insert({
        url: cleanUrl,
        domain,
        page_title: pageTitle,
        email,
        scores,
        summary,
        results: auditResults,
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("[send-audit-email] Save error:", saveError);
      throw new Error("Failed to save audit");
    }

    const auditId = savedAudit.id;
    console.log(`[send-audit-email] Audit saved with ID: ${auditId}`);

    // Step 3: Send email via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const auditUrl = `https://lovelyanswers.lovable.app/audit?id=${auditId}`;

    // Build top 3 critical issues for email
    const criticalIssues = auditResults
      .filter((r: any) => r.status === "fail" || r.status === "warning")
      .sort((a: any, b: any) => {
        const priority: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const statusPriority: Record<string, number> = { fail: 2, warning: 1, pass: 0 };
        return (statusPriority[b.status] + priority[b.impact]) - (statusPriority[a.status] + priority[a.impact]);
      })
      .slice(0, 3);

    const issuesHtml = criticalIssues.map((issue: any) => {
      const iconSvg = issue.status === "fail" 
        ? `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="vertical-align:middle;margin-right:8px;"><circle cx="10" cy="10" r="10" fill="#FEE2E2"/><path d="M13 7L7 13M7 7l6 6" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="vertical-align:middle;margin-right:8px;"><circle cx="10" cy="10" r="10" fill="#FEF3C7"/><path d="M10 6v4m0 4h.01" stroke="#D97706" stroke-width="2" stroke-linecap="round"/></svg>`;
      const impactBadge = issue.impact === "high" 
        ? `<span style="display:inline-block;font-size:10px;font-weight:700;color:#DC2626;background:#FEE2E2;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:0.5px;margin-left:8px;">High Impact</span>`
        : issue.impact === "medium"
        ? `<span style="display:inline-block;font-size:10px;font-weight:700;color:#D97706;background:#FEF3C7;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:0.5px;margin-left:8px;">Medium</span>`
        : '';
      return `
        <tr>
          <td style="padding:16px 20px;border-bottom:1px solid #F3F4F6;">
            <div style="font-size:15px;font-weight:600;color:#111827;line-height:1.4;">${iconSvg}${issue.title}${impactBadge}</div>
            <div style="font-size:13px;color:#6B7280;margin-top:6px;line-height:1.5;padding-left:28px;">${issue.description}</div>
            ${issue.recommendation ? `<div style="font-size:12px;color:#4F46E5;margin-top:8px;padding:8px 12px;background:#EEF2FF;border-radius:8px;border-left:3px solid #4F46E5;margin-left:28px;line-height:1.4;"><strong>Recommendation:</strong> ${issue.recommendation}</div>` : ""}
          </td>
        </tr>`;
    }).join("");

    const scoreColor = (s: number) => s >= 70 ? "#059669" : s >= 40 ? "#D97706" : "#DC2626";
    const scoreBg = (s: number) => s >= 70 ? "#ECFDF5" : s >= 40 ? "#FFFBEB" : "#FEF2F2";
    const scoreLabel = (s: number) => s >= 70 ? "Good" : s >= 40 ? "Needs Work" : "Critical";

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your SEO & AEO Audit Report</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#F9FAFB;-webkit-font-smoothing:antialiased;">
  <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
    
    <!-- Logo & Branding Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:12px 16px;border-radius:12px;margin-bottom:16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span style="color:white;font-size:18px;font-weight:800;margin-left:8px;vertical-align:middle;letter-spacing:-0.3px;">Lovely Answers</span>
      </div>
    </div>

    <!-- Main Card -->
    <div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.05);">
      
      <!-- Hero Section -->
      <div style="background:linear-gradient(135deg,#1E1B4B,#312E81,#4338CA);padding:40px 32px;text-align:center;">
        <div style="margin-bottom:16px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="display:inline-block;"><circle cx="11" cy="11" r="8" stroke="white" stroke-width="2"/><path d="m21 21-4.35-4.35" stroke="white" stroke-width="2" stroke-linecap="round"/><path d="M11 8v6m0 0-2-2m2 2 2-2" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h1 style="font-size:26px;font-weight:800;color:white;margin:0 0 8px;letter-spacing:-0.5px;line-height:1.2;">
          SEO & AEO Audit Report
        </h1>
        <p style="font-size:15px;color:rgba(255,255,255,0.75);margin:0;font-weight:500;">
          ${domain}
        </p>
      </div>

      <!-- Score Section -->
      <div style="padding:32px 24px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="33%" style="text-align:center;padding:0 4px;">
              <div style="background:${scoreBg(overallScore)};border-radius:16px;padding:20px 8px;">
                <div style="font-size:42px;font-weight:800;color:${scoreColor(overallScore)};line-height:1;">${overallScore}</div>
                <div style="font-size:10px;font-weight:700;color:${scoreColor(overallScore)};text-transform:uppercase;letter-spacing:1.5px;margin-top:4px;">Overall</div>
                <div style="font-size:11px;color:${scoreColor(overallScore)};margin-top:2px;font-weight:600;">${scoreLabel(overallScore)}</div>
              </div>
            </td>
            <td width="33%" style="text-align:center;padding:0 4px;">
              <div style="background:${scoreBg(seoScore)};border-radius:16px;padding:20px 8px;">
                <div style="font-size:42px;font-weight:800;color:${scoreColor(seoScore)};line-height:1;">${seoScore}</div>
                <div style="font-size:10px;font-weight:700;color:${scoreColor(seoScore)};text-transform:uppercase;letter-spacing:1.5px;margin-top:4px;">SEO</div>
                <div style="font-size:11px;color:${scoreColor(seoScore)};margin-top:2px;font-weight:600;">${scoreLabel(seoScore)}</div>
              </div>
            </td>
            <td width="33%" style="text-align:center;padding:0 4px;">
              <div style="background:${scoreBg(aeoScore)};border-radius:16px;padding:20px 8px;">
                <div style="font-size:42px;font-weight:800;color:${scoreColor(aeoScore)};line-height:1;">${aeoScore}</div>
                <div style="font-size:10px;font-weight:700;color:${scoreColor(aeoScore)};text-transform:uppercase;letter-spacing:1.5px;margin-top:4px;">AEO</div>
                <div style="font-size:11px;color:${scoreColor(aeoScore)};margin-top:2px;font-weight:600;">${scoreLabel(aeoScore)}</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Summary Stats -->
        <div style="display:flex;justify-content:center;margin-top:20px;text-align:center;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align:center;padding:12px 0;border-top:1px solid #F3F4F6;">
                <span style="display:inline-block;padding:4px 12px;background:#ECFDF5;border-radius:20px;font-size:12px;font-weight:600;color:#059669;margin:0 4px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:4px;"><path d="M20 6L9 17l-5-5" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  ${passCount} Passed
                </span>
                <span style="display:inline-block;padding:4px 12px;background:#FFFBEB;border-radius:20px;font-size:12px;font-weight:600;color:#D97706;margin:0 4px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:4px;"><path d="M12 9v4m0 4h.01M12 2l10 18H2z" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  ${warningCount} Warnings
                </span>
                <span style="display:inline-block;padding:4px 12px;background:#FEF2F2;border-radius:20px;font-size:12px;font-weight:600;color:#DC2626;margin:0 4px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:4px;"><path d="M18 6L6 18M6 6l12 12" stroke="#DC2626" stroke-width="3" stroke-linecap="round"/></svg>
                  ${failCount} Failed
                </span>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Critical Issues -->
      ${criticalIssues.length > 0 ? `
      <div style="padding:0 24px 24px;">
        <div style="background:#FAFAFA;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">
          <div style="padding:16px 20px;border-bottom:1px solid #E5E7EB;background:white;">
            <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0;display:flex;align-items:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:8px;"><path d="M12 9v4m0 4h.01M12 2l10 18H2z" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Priority Issues to Fix
            </h2>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${issuesHtml}
          </table>
        </div>
      </div>
      ` : ""}

      <!-- View Full Report CTA -->
      <div style="padding:8px 24px 32px;text-align:center;">
        <a href="${auditUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;letter-spacing:-0.2px;box-shadow:0 4px 14px rgba(79,70,229,0.4);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:8px;"><path d="M15 3h6v6m0-6L13 11M10 5H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          View Full Report
        </a>
      </div>
    </div>

    <!-- Premium Audit Upsell -->
    <div style="background:white;border-radius:20px;overflow:hidden;margin-top:24px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07);border:2px solid #E0E7FF;">
      <div style="background:linear-gradient(135deg,#EEF2FF,#E0E7FF);padding:28px 24px;text-align:center;">
        <div style="margin-bottom:12px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style="display:inline-block;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#4F46E5" stroke-width="2" fill="#C7D2FE" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h3 style="font-size:20px;font-weight:800;color:#1E1B4B;margin:0 0 8px;letter-spacing:-0.3px;">
          Go deeper with a Premium Audit
        </h3>
        <p style="font-size:14px;color:#4338CA;margin:0 0 20px;line-height:1.5;max-width:400px;display:inline-block;">
          Competitor landscape, AI citation scoring, content gap mapping, and a 90-day strategic roadmap.
        </p>
        <br>
        <a href="https://lovelyanswers.lovable.app/audit-premium?url=${encodeURIComponent(cleanUrl)}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;box-shadow:0 4px 14px rgba(79,70,229,0.3);">
          Get Premium Audit →
        </a>
      </div>
    </div>

    <!-- Autopilot CTA -->
    <div style="background:white;border-radius:20px;overflow:hidden;margin-top:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07);">
      <div style="padding:28px 24px;text-align:center;">
        <div style="margin-bottom:12px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style="display:inline-block;"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#111827" stroke-width="2" fill="#FEF3C7" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h3 style="font-size:18px;font-weight:800;color:#111827;margin:0 0 8px;letter-spacing:-0.3px;">
          Fix these issues on autopilot
        </h3>
        <p style="font-size:14px;color:#6B7280;margin:0 0 20px;line-height:1.5;max-width:400px;display:inline-block;">
          Lovely Answers publishes 30 SEO-optimized articles/month and boosts your AI visibility — all automatically.
        </p>
        <br>
        <a href="https://lovelyanswers.lovable.app/onboarding" style="display:inline-block;padding:14px 32px;background:#111827;color:white;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;box-shadow:0 4px 14px rgba(0,0,0,0.15);">
          Start Free Trial →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:32px 0 16px;">
      <p style="font-size:11px;color:#9CA3AF;margin:0 0 8px;">
        This report was generated by Lovely Answers — the AI-powered SEO & AEO platform.
      </p>
      <a href="https://lovelyanswers.com" style="font-size:11px;color:#6366F1;text-decoration:none;font-weight:600;">lovelyanswers.com</a>
      <p style="font-size:10px;color:#D1D5DB;margin:12px 0 0;">
        You received this because you requested an audit on ${domain}.
      </p>
    </div>
  </div>
</body>
</html>`;

    const { error: emailError } = await resend.emails.send({
      from: "LovelyAnswers <audit@lovelyanswers.com>",
      to: [email],
      subject: `🔍 Your SEO & AEO Audit: ${domain} scored ${overallScore}/100`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("[send-audit-email] Resend error:", emailError);
      // Still return success since audit was saved
    } else {
      console.log("[send-audit-email] Email sent successfully!");
      // Mark email as sent
      await supabaseAdmin
        .from("site_audits")
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .eq("id", auditId);
    }

    return new Response(
      JSON.stringify({ success: true, auditId, scores, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-audit-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
