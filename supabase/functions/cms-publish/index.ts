import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PublishRequest {
  integrationId?: string;
  projectId?: string;
  articleId?: string;
  answerId?: string;
  content?: {
    title: string;
    body: string;
    type: "answer" | "article";
    sourceId: string;
  };
  // Legacy support
  platform?: string;
  credentials?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ============ GET REQUEST: Serve published content as HTML ============
  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/").filter(Boolean);
      
      // Expected path: /cms-publish/answer/{id} or /cms-publish/article/{id}
      // pathParts after functions/v1: ["cms-publish", "answer", "{id}"]
      const cmsIndex = pathParts.findIndex(p => p === "cms-publish");
      const contentType = pathParts[cmsIndex + 1]; // "answer" or "article"
      const contentId = pathParts[cmsIndex + 2]; // UUID
      
      console.log(`[cms-publish] GET request: type=${contentType}, id=${contentId}`);
      
      if (!contentId || !contentType) {
        return new Response(
          generateErrorHTML("Content Not Found", "Invalid URL format. Expected: /cms-publish/answer/{id} or /cms-publish/article/{id}"),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
        );
      }

      if (contentType === "answer") {
        // Fetch the answer from database
        const { data: answer, error } = await supabase
          .from("answers")
          .select("*, projects(brand_name, website_url, language)")
          .eq("id", contentId)
          .single();

        if (error || !answer) {
          console.error("[cms-publish] Answer not found:", error);
          return new Response(
            generateErrorHTML("Answer Not Found", "This answer does not exist or has been removed."),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
          );
        }

        // Generate and return HTML page
        const html = generatePublicAnswerHTML(answer);
        return new Response(html, {
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }
        });

      } else if (contentType === "article") {
        // Fetch the article from database
        const { data: article, error } = await supabase
          .from("articles")
          .select("*, projects(brand_name, website_url, language)")
          .eq("id", contentId)
          .single();

        if (error || !article) {
          console.error("[cms-publish] Article not found:", error);
          return new Response(
            generateErrorHTML("Article Not Found", "This article does not exist or has been removed."),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
          );
        }

        // Generate and return HTML page
        const html = generatePublicArticleHTML(article);
        return new Response(html, {
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }
        });
      } else {
        return new Response(
          generateErrorHTML("Invalid Content Type", "Supported types: answer, article"),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
        );
      }
    } catch (error) {
      console.error("[cms-publish] GET error:", error);
      return new Response(
        generateErrorHTML("Server Error", error instanceof Error ? error.message : "Unknown error"),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }
  }

  // ============ POST REQUEST: Publish content to CMS ============
  try {
    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    
    // Check if this is an internal call (from other edge functions using service role key)
    const isInternalCall = authHeader?.includes(supabaseKey);
    
    // Track userId for GSC indexation (using user's OAuth tokens)
    let authenticatedUserId: string | null = null;
    
    // Verify user is authenticated (skip for internal calls)
    if (authHeader && !isInternalCall) {
      const token = authHeader.replace("Bearer ", "");
      const authClient = createClient(supabaseUrl, anonKey);
      const { data: { user }, error: authError } = await authClient.auth.getUser(token);
      
      if (authError || !user) {
        console.error("[cms-publish] Auth error:", authError?.message);
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`[cms-publish] Authenticated user: ${user.email}`);
      authenticatedUserId = user.id;
    } else if (isInternalCall) {
      console.log(`[cms-publish] Internal call from edge function`);
    }

    // Parse request body with error handling for empty/invalid JSON
    let requestData: PublishRequest;
    try {
      const bodyText = await req.text();
      if (!bodyText || bodyText.trim() === "") {
        return new Response(
          JSON.stringify({ error: "Request body is required for POST requests" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      requestData = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("[cms-publish] JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    let platform: string;
    let config: Record<string, string>;
    let content: { title: string; body: string };

    // New flow: use integrationId to get stored config
    if (requestData.integrationId) {
      console.log(`[cms-publish] Using integration ${requestData.integrationId}`);
      
      const { data: integration, error: intError } = await supabase
        .from("integrations")
        .select("*")
        .eq("id", requestData.integrationId)
        .single();

      if (intError || !integration) {
        throw new Error("Integration not found");
      }

      platform = integration.platform;
      config = integration.config as Record<string, string>;

      if (requestData.content) {
        content = {
          title: requestData.content.title,
          body: requestData.content.body,
        };
      } else {
        throw new Error("Content is required");
      }
    }
    // Legacy flow: use provided credentials
    else if (requestData.platform && requestData.credentials) {
      platform = requestData.platform;
      config = requestData.credentials;

      if (requestData.articleId) {
        const { data: article, error: articleError } = await supabase
          .from("articles")
          .select("*")
          .eq("id", requestData.articleId)
          .single();

        if (articleError || !article) {
          throw new Error("Article not found");
        }
        content = { title: article.title, body: article.content || "" };
      } else {
        throw new Error("Article ID is required");
      }
    } else {
      throw new Error("Either integrationId or platform+credentials is required");
    }

    console.log(`[cms-publish] Publishing to ${platform}`);

    let publishResult: {
      success: boolean;
      publishedUrl?: string;
      publishedId?: string;
      message?: string;
    };

    switch (platform) {
      case "wordpress":
        publishResult = await publishToWordPress(content, config);
        break;
      case "webflow":
        publishResult = await publishToWebflow(content, config);
        break;
      case "shopify":
        publishResult = await publishToShopify(content, config);
        break;
      case "wix":
        publishResult = await publishToWix(content, config);
        break;
      case "webhook":
        publishResult = await publishToWebhook(content, config);
        break;
      case "api":
        publishResult = await publishToCustomApi(content, config);
        break;
      case "duda":
        publishResult = await publishToDuda(content, config);
        break;
      case "bigcommerce":
        publishResult = await publishToBigCommerce(content, config);
        break;
      case "framer":
      case "snapps":
        publishResult = await publishToWebhook(content, config);
        break;
      case "lovable":
        publishResult = await publishToLovable(content, config, requestData.content?.sourceId);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    if (publishResult.success && requestData.articleId) {
      await supabase
        .from("articles")
        .update({ status: "published" })
        .eq("id", requestData.articleId);

      // Request Google Search Console indexation if URL is available
      if (publishResult.publishedUrl) {
        // Get userId for GSC indexation - try authenticated user first, then fallback to project owner
        let userIdForIndexation = authenticatedUserId;
        
        if (!userIdForIndexation && requestData.integrationId) {
          // Get project owner from integration -> project -> user_id
          const { data: integration } = await supabase
            .from("integrations")
            .select("project_id")
            .eq("id", requestData.integrationId)
            .single();
          
          if (integration?.project_id) {
            const { data: project } = await supabase
              .from("projects")
              .select("user_id")
              .eq("id", integration.project_id)
              .single();
            
            userIdForIndexation = project?.user_id || null;
          }
        }
        
        if (userIdForIndexation) {
          try {
            console.log(`[cms-publish] Requesting GSC indexation for: ${publishResult.publishedUrl} (userId: ${userIdForIndexation})`);
            
            const indexingResponse = await fetch(`${supabaseUrl}/functions/v1/gsc-request-indexing`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                articleId: requestData.articleId,
                publishedUrl: publishResult.publishedUrl,
                userId: userIdForIndexation,
              }),
            });

            const indexingResult = await indexingResponse.json();
            console.log(`[cms-publish] GSC indexation result:`, indexingResult);
          } catch (indexError) {
            console.error("[cms-publish] GSC indexation error (non-blocking):", indexError);
            // Don't fail the publish if indexation fails
          }
        } else {
          console.log("[cms-publish] No userId available for GSC indexation, skipping");
        }
      }
    }

    console.log(`[cms-publish] Result: ${JSON.stringify(publishResult)}`);

    return new Response(
      JSON.stringify({
        success: publishResult.success,
        platform,
        publishedUrl: publishResult.publishedUrl,
        publishedId: publishResult.publishedId,
        message: publishResult.message,
        publishedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[cms-publish] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function publishToWordPress(
  content: { title: string; body: string },
  config: Record<string, string>
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  if (!config.endpoint) {
    return { success: false, message: "WordPress site URL is required. Check your configuration." };
  }

  try {
    // Clean up endpoint URL
    let siteUrl = config.endpoint.trim().replace(/\/+$/, '');
    if (!siteUrl.startsWith("http")) {
      siteUrl = `https://${siteUrl}`;
    }
    
    console.log(`[WordPress] Publishing to ${siteUrl}`);
    
    // Build authorization header
    let authHeader: string;
    
    // Get username and password
    let username = config.username?.trim() || "";
    let password = config.token?.trim() || "";
    
    // Application passwords can have spaces - remove them for the auth header
    // WordPress returns them with spaces but they work without
    password = password.replace(/\s+/g, "");
    
    if (!username || !password) {
      return { success: false, message: "WordPress username and Application Password are required." };
    }
    
    // Use Basic Auth with username:application_password
    const basicAuth = btoa(`${username}:${password}`);
    authHeader = `Basic ${basicAuth}`;
    
    console.log(`[WordPress] Using Basic Auth for user: ${username}`);
    
    const response = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: content.title,
        content: content.body,
        status: "publish",
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error(`[WordPress] Error ${status}: ${errorText}`);
      
      if (status === 401 || status === 403) {
        return { success: false, message: "Invalid credentials. Check your username and Application Password in Users → Profile → Application Passwords." };
      } else if (status === 404) {
        return { success: false, message: "WordPress REST API not found. Verify the site URL is correct and permalinks are enabled." };
      } else if (status === 429) {
        return { success: false, message: "Rate limit exceeded. Try again later." };
      }
      return { success: false, message: `WordPress API error (${status}): ${errorText.substring(0, 200)}` };
    }

    const data = await response.json();
    console.log(`[WordPress] Published successfully: ${data.link}`);
    return {
      success: true,
      publishedUrl: data.link,
      publishedId: String(data.id),
    };
  } catch (error) {
    console.error("[WordPress] Exception:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "WordPress publish failed - network error",
    };
  }
}

async function publishToWebflow(
  content: { title: string; body: string },
  config: Record<string, string>
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  if (!config.token || !config.endpoint) {
    throw new Error("Webflow token and collection ID required");
  }

  try {
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${config.endpoint}/items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isArchived: false,
          isDraft: false,
          fieldData: {
            name: content.title,
            slug: content.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            "post-body": content.body,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webflow API error: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      publishedId: data.id,
      publishedUrl: data.slug ? `https://site.webflow.io/blog/${data.slug}` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Webflow publish failed",
    };
  }
}

async function publishToShopify(
  content: { title: string; body: string },
  config: Record<string, string>
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  if (!config.endpoint || !config.token) {
    return { success: false, message: "Shopify store URL and Admin API token required. Check your configuration." };
  }

  try {
    // Clean up endpoint - remove trailing slashes
    const storeUrl = config.endpoint.replace(/\/+$/, '');
    console.log(`[Shopify] Publishing to ${storeUrl}`);
    
    // Get the first blog ID
    const blogsResponse = await fetch(`${storeUrl}/admin/api/2024-01/blogs.json`, {
      headers: { "X-Shopify-Access-Token": config.token },
    });
    
    if (!blogsResponse.ok) {
      const status = blogsResponse.status;
      const errorText = await blogsResponse.text();
      console.error(`[Shopify] Failed to get blogs: ${status} - ${errorText}`);
      
      if (status === 401) {
        return { success: false, message: "Invalid Admin API Access Token. Create a new token in your Shopify app." };
      } else if (status === 404) {
        return { success: false, message: "Store not found. Check your Store URL (must be your-store.myshopify.com)." };
      }
      return { success: false, message: `Failed to access Shopify store (${status}): ${errorText.substring(0, 100)}` };
    }
    
    const blogsData = await blogsResponse.json();
    const blogId = blogsData.blogs?.[0]?.id;
    
    if (!blogId) {
      return { success: false, message: "No blog found in your Shopify store. Create a blog first in Online Store → Blog Posts." };
    }

    console.log(`[Shopify] Using blog ID: ${blogId}`);
    
    const response = await fetch(`${storeUrl}/admin/api/2024-01/blogs/${blogId}/articles.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": config.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        article: {
          title: content.title,
          body_html: content.body,
          published: true,
        },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error(`[Shopify] Article creation failed (${status}): ${errorText}`);
      
      if (status === 422) {
        return { success: false, message: "Invalid article data. Check title and content format." };
      }
      return { success: false, message: `Shopify API error (${status}): ${errorText.substring(0, 200)}` };
    }

    const data = await response.json();
    console.log(`[Shopify] Published successfully: ${data.article.id}`);
    return {
      success: true,
      publishedId: String(data.article.id),
      publishedUrl: `${storeUrl}/blogs/news/${data.article.handle}`,
    };
  } catch (error) {
    console.error("[Shopify] Exception:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Shopify publish failed - network error",
    };
  }
}

async function publishToWix(
  content: { title: string; body: string },
  config: Record<string, string>
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  const apiKey = config.token?.trim();
  const siteId = config.siteId?.trim();

  if (!apiKey) {
    return { success: false, message: "Wix API Key required" };
  }

  if (!apiKey.startsWith("IST.")) {
    return { success: false, message: "Invalid API Key format. Wix API Keys should start with 'IST.'" };
  }

  if (!siteId) {
    return { success: false, message: "Wix Site ID required" };
  }

  try {
    console.log(`[Wix] Publishing to site: ${siteId.substring(0, 8)}...`);

    const response = await fetch(`https://www.wixapis.com/blog/v3/posts`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "wix-site-id": siteId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post: {
          title: content.title,
          richContent: {
            nodes: [
              {
                type: "PARAGRAPH",
                nodes: [{ type: "TEXT", textData: { text: content.body } }],
              },
            ],
          },
        },
        publish: true,
      }),
    });

    console.log(`[Wix] Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[Wix] Error:`, JSON.stringify(errorData));
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: "API Key invalide ou permissions insuffisantes. Vérifiez les permissions Blog." };
      }
      return { success: false, message: `Wix API error (${response.status}): ${errorData.message || response.statusText}` };
    }

    const data = await response.json();
    console.log(`[Wix] Published successfully: ${data.post?.id}`);
    return {
      success: true,
      publishedId: data.post?.id,
      publishedUrl: data.post?.url,
    };
  } catch (error) {
    console.error("[Wix] Exception:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Wix publish failed",
    };
  }
}

async function publishToWebhook(
  content: { title: string; body: string },
  config: Record<string, string>
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  if (!config.endpoint) {
    throw new Error("Webhook URL required");
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (config.token) {
      headers["Authorization"] = `Bearer ${config.token}`;
    }

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: content.title,
        content: content.body,
        publishedAt: new Date().toISOString(),
        source: "AEO Planning",
      }),
    });

    // For webhooks, we consider it successful if the request was sent
    return {
      success: true,
      message: "Webhook triggered successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Webhook failed",
    };
  }
}

async function publishToCustomApi(
  content: { title: string; body: string },
  config: Record<string, string>
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  if (!config.endpoint) {
    throw new Error("API endpoint required");
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (config.token) {
      headers["Authorization"] = config.token;
    }

    const method = config.method?.toUpperCase() || "POST";

    const response = await fetch(config.endpoint, {
      method,
      headers,
      body: JSON.stringify({
        title: content.title,
        content: content.body,
        publishedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      publishedId: data.id,
      publishedUrl: data.url,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "API publish failed",
    };
  }
}

async function publishToDuda(
  content: { title: string; body: string },
  config: Record<string, string>
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  if (!config.endpoint || !config.token) {
    throw new Error("Duda site name and API key required");
  }

  try {
    const response = await fetch(
      `https://api.duda.co/api/sites/multiscreen/${config.endpoint}/blog/posts`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${config.token}:`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: content.title,
          content: content.body,
          status: "published",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Duda API error: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      publishedId: data.id,
      publishedUrl: data.url,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Duda publish failed",
    };
  }
}

async function publishToBigCommerce(
  content: { title: string; body: string },
  config: Record<string, string>
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  if (!config.endpoint || !config.token) {
    throw new Error("BigCommerce store hash and token required");
  }

  try {
    const response = await fetch(
      `https://api.bigcommerce.com/stores/${config.endpoint}/v2/blog/posts`,
      {
        method: "POST",
        headers: {
          "X-Auth-Token": config.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: content.title,
          body: content.body,
          is_published: true,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BigCommerce API error: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      publishedId: String(data.id),
      publishedUrl: data.url,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "BigCommerce publish failed",
    };
  }
}

async function publishToLovable(
  content: { title: string; body: string },
  config: Record<string, string>,
  sourceId?: string,
  slug?: string
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  // For Lovable-hosted sites, use the published site URL with /blog/:slug route
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // If user has configured a custom endpoint (external Lovable project), use webhook
    if (config.endpoint && !config.endpoint.includes(supabaseUrl)) {
      // External Lovable project - send via webhook
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (config.token) {
          headers["Authorization"] = `Bearer ${config.token}`;
        }
        
        const response = await fetch(config.endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: content.title,
            body: content.body,
            sourceId: sourceId,
            publishedAt: new Date().toISOString(),
            source: "LovelyAnswers",
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Lovable] External endpoint error: ${errorText}`);
          return { success: false, message: `External Lovable endpoint error: ${errorText.substring(0, 100)}` };
        }
        
        const data = await response.json().catch(() => ({}));
        console.log(`[Lovable] Published to external Lovable project`);
        
        return {
          success: true,
          publishedUrl: data.url || config.endpoint,
          publishedId: sourceId,
          message: "Content published to external Lovable project",
        };
      } catch (error) {
        console.error("[Lovable] External publish error:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to publish to external Lovable project",
        };
      }
    }
    
    // Internal Lovable site - use the published site URL with /blog/:slug route
    // Get the answer slug from database
    let answerSlug = slug;
    if (!answerSlug && sourceId) {
      const { data: answer } = await supabase
        .from("answers")
        .select("slug")
        .eq("id", sourceId)
        .single();
      answerSlug = answer?.slug;
    }
    
    if (!answerSlug) {
      console.error("[Lovable] No slug found for answer");
      return { success: false, message: "No slug found for answer" };
    }
    
    // Use the published site URL (configured in integration or default to lovelyanswers.com)
    // Priority: config.siteUrl -> lovelyanswers.com (hardcoded for this project)
    const siteUrl = config.siteUrl?.replace(/\/+$/, '') || "https://lovelyanswers.com";
    const publishedUrl = `${siteUrl}/blog/${answerSlug}`;
    
    console.log(`[Lovable] Content published at: ${publishedUrl}`);
    
    return {
      success: true,
      publishedUrl,
      publishedId: sourceId,
      message: "Content published to Lovable site",
    };
  } catch (error) {
    console.error("[Lovable] Publish error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Lovable publish failed",
    };
  }
}

// ============ HTML Generation Functions for GET requests ============

function generateErrorHTML(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | LovelyAnswers</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 2rem; }
    .container { max-width: 500px; background: white; border-radius: 16px; padding: 3rem; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    h1 { color: #1e293b; font-size: 1.5rem; margin-bottom: 1rem; }
    p { color: #64748b; line-height: 1.6; margin-bottom: 2rem; }
    a { display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 500; }
    a:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://lovelyanswers.com">← Back to LovelyAnswers</a>
  </div>
</body>
</html>`;
}

function generatePublicAnswerHTML(answer: any): string {
  const question = answer.question || "Question";
  const answerText = answer.answer || "";
  const brandName = answer.projects?.brand_name || "LovelyAnswers";
  const language = answer.projects?.language || "en";
  const createdAt = new Date(answer.created_at).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
    year: "numeric", month: "long", day: "numeric"
  });
  
  // Extract supporting content
  const bullets = (answer.supporting_content as any)?.bullets || [];
  const faq = (answer.supporting_content as any)?.faq || [];
  
  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    "mainEntity": {
      "@type": "Question",
      "name": question,
      "dateCreated": answer.created_at,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": answerText,
        "dateCreated": answer.created_at,
        "author": { "@type": "Organization", "name": brandName }
      }
    }
  };

  const faqJsonLd = faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faq.map((f: any) => ({
      "@type": "Question",
      "name": f.q || f.question,
      "acceptedAnswer": { "@type": "Answer", "text": f.a || f.answer }
    }))
  } : null;

  const keyPointsTitle = language === "fr" ? "Points Clés" : "Key Points";
  const faqTitle = language === "fr" ? "Questions Fréquentes" : "Frequently Asked Questions";
  const publishedLabel = language === "fr" ? "Publié le" : "Published on";
  const sourceLabel = language === "fr" ? "Source" : "Source";

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${question} | ${brandName}</title>
  <meta name="description" content="${answerText.slice(0, 160)}">
  <meta property="og:title" content="${question}">
  <meta property="og:description" content="${answerText.slice(0, 160)}">
  <meta property="og:type" content="article">
  <meta name="robots" content="index, follow">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  ${faqJsonLd ? `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>` : ""}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: linear-gradient(135deg, #fafafa 0%, #f0f0ff 100%); min-height: 100vh; color: #1a1a2e; }
    header { background: white; border-bottom: 1px solid #e5e5e5; padding: 1rem 2rem; }
    .header-content { max-width: 800px; margin: 0 auto; display: flex; align-items: center; gap: 0.5rem; }
    .logo { width: 32px; height: 32px; background: linear-gradient(135deg, #8b5cf6, #3b82f6); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; }
    .brand-name { font-weight: 600; color: #1a1a2e; }
    main { max-width: 800px; margin: 0 auto; padding: 3rem 1.5rem; }
    h1 { font-size: 2rem; line-height: 1.3; margin-bottom: 2rem; color: #1a1a2e; }
    .answer-box { background: white; border-left: 4px solid #8b5cf6; padding: 2rem; border-radius: 0 12px 12px 0; margin-bottom: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .answer-box p { font-size: 1.125rem; line-height: 1.8; color: #374151; white-space: pre-wrap; }
    .key-points { background: #fefce8; border: 1px solid #fef08a; padding: 1.5rem; border-radius: 12px; margin: 2rem 0; }
    .key-points h2 { font-size: 1.125rem; color: #854d0e; margin-bottom: 1rem; }
    .key-points ul { padding-left: 1.25rem; }
    .key-points li { color: #713f12; margin-bottom: 0.5rem; line-height: 1.6; }
    .faq-section { margin: 2rem 0; }
    .faq-section h2 { font-size: 1.25rem; margin-bottom: 1rem; color: #1a1a2e; }
    .faq-item { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 0.75rem; overflow: hidden; background: white; }
    .faq-item summary { padding: 1rem; cursor: pointer; font-weight: 500; list-style: none; }
    .faq-item summary::-webkit-details-marker { display: none; }
    .faq-item summary:hover { background: #f9fafb; }
    .faq-item[open] summary { border-bottom: 1px solid #e5e7eb; }
    .faq-item p { padding: 1rem; color: #6b7280; line-height: 1.6; }
    .meta { border-top: 1px solid #e5e7eb; padding-top: 2rem; margin-top: 2rem; color: #6b7280; font-size: 0.875rem; }
    .meta strong { color: #374151; }
    footer { border-top: 1px solid #e5e7eb; background: white; padding: 2rem; text-align: center; }
    footer p { color: #6b7280; margin-bottom: 1rem; }
    footer a { display: inline-block; background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 500; }
    footer a:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <header>
    <div class="header-content">
      <div class="logo">L</div>
      <span class="brand-name">LovelyAnswers</span>
    </div>
  </header>
  <main>
    <article>
      <h1>${question}</h1>
      <div class="answer-box">
        <p>${answerText}</p>
      </div>
      ${bullets.length > 0 ? `
      <section class="key-points">
        <h2>${keyPointsTitle}</h2>
        <ul>${bullets.map((b: string) => `<li>${b}</li>`).join("")}</ul>
      </section>` : ""}
      ${faq.length > 0 ? `
      <section class="faq-section">
        <h2>${faqTitle}</h2>
        ${faq.map((f: any) => `
        <details class="faq-item">
          <summary>${f.q || f.question}</summary>
          <p>${f.a || f.answer}</p>
        </details>`).join("")}
      </section>` : ""}
      <div class="meta">
        <p><strong>${sourceLabel}:</strong> ${brandName}</p>
        <p>${publishedLabel} ${createdAt}</p>
      </div>
    </article>
  </main>
  <footer>
    <p>Optimize your AI visibility with LovelyAnswers</p>
    <a href="https://lovelyanswers.com">Create Your AEO Answers</a>
  </footer>
</body>
</html>`;
}

function generatePublicArticleHTML(article: any): string {
  const title = article.title || "Article";
  const content = article.html_content || article.content || "";
  const brandName = article.projects?.brand_name || "LovelyAnswers";
  const language = article.projects?.language || "en";
  const metaDescription = article.meta_description || content.replace(/<[^>]*>/g, "").slice(0, 160);
  const createdAt = new Date(article.created_at).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
    year: "numeric", month: "long", day: "numeric"
  });

  const publishedLabel = language === "fr" ? "Publié le" : "Published on";
  const sourceLabel = language === "fr" ? "Source" : "Source";

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | ${brandName}</title>
  <meta name="description" content="${metaDescription}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${metaDescription}">
  <meta property="og:type" content="article">
  <meta name="robots" content="index, follow">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #fafafa; min-height: 100vh; color: #1a1a2e; }
    header { background: white; border-bottom: 1px solid #e5e5e5; padding: 1rem 2rem; }
    .header-content { max-width: 800px; margin: 0 auto; display: flex; align-items: center; gap: 0.5rem; }
    .logo { width: 32px; height: 32px; background: linear-gradient(135deg, #8b5cf6, #3b82f6); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; }
    .brand-name { font-weight: 600; color: #1a1a2e; }
    main { max-width: 800px; margin: 0 auto; padding: 3rem 1.5rem; }
    article { background: white; border-radius: 12px; padding: 2.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    h1 { font-size: 2rem; line-height: 1.3; margin-bottom: 2rem; color: #1a1a2e; }
    .content { line-height: 1.8; color: #374151; }
    .content h2 { font-size: 1.5rem; margin: 2rem 0 1rem; color: #1a1a2e; }
    .content h3 { font-size: 1.25rem; margin: 1.5rem 0 0.75rem; color: #1a1a2e; }
    .content p { margin-bottom: 1rem; }
    .content ul, .content ol { margin-bottom: 1rem; padding-left: 1.5rem; }
    .content li { margin-bottom: 0.5rem; }
    .content a { color: #8b5cf6; }
    .meta { border-top: 1px solid #e5e7eb; padding-top: 2rem; margin-top: 2rem; color: #6b7280; font-size: 0.875rem; }
    .meta strong { color: #374151; }
    footer { border-top: 1px solid #e5e7eb; background: white; padding: 2rem; text-align: center; margin-top: 2rem; }
    footer p { color: #6b7280; margin-bottom: 1rem; }
    footer a { display: inline-block; background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 500; }
    footer a:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <header>
    <div class="header-content">
      <div class="logo">L</div>
      <span class="brand-name">LovelyAnswers</span>
    </div>
  </header>
  <main>
    <article>
      <h1>${title}</h1>
      <div class="content">${content}</div>
      <div class="meta">
        <p><strong>${sourceLabel}:</strong> ${brandName}</p>
        <p>${publishedLabel} ${createdAt}</p>
      </div>
    </article>
  </main>
  <footer>
    <p>Optimize your AI visibility with LovelyAnswers</p>
    <a href="https://lovelyanswers.com">Create Your AEO Articles</a>
  </footer>
</body>
</html>`;
}
