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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body with error handling for empty/invalid JSON
    let requestData: PublishRequest;
    try {
      const bodyText = await req.text();
      if (!bodyText || bodyText.trim() === "") {
        return new Response(
          JSON.stringify({ error: "Request body is required" }),
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
  sourceId?: string
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  // For Lovable-hosted sites, we don't need to push to an external API
  // The content is already in the database and will be served by the app
  // We just return the public URL based on the slug
  
  try {
    const siteUrl = config.endpoint?.replace(/\/+$/, '') || 'https://lovelyanswers.com';
    const slug = sourceId || content.title.toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    const publishedUrl = `${siteUrl}/answer/${slug}`;
    
    console.log(`[Lovable] Content available at: ${publishedUrl}`);
    
    return {
      success: true,
      publishedUrl,
      publishedId: sourceId || slug,
      message: "Content published to Lovable-hosted site",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Lovable publish failed",
    };
  }
}
