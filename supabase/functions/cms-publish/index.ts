import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PublishRequest {
  projectId: string;
  articleId: string;
  platform: "wordpress" | "webflow" | "shopify" | "wix" | "api";
  credentials: {
    apiUrl?: string;
    apiKey?: string;
    siteId?: string;
    collectionId?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectId, articleId, platform, credentials }: PublishRequest = await req.json();

    console.log(`[cms-publish] Publishing article ${articleId} to ${platform}`);

    // Get article details
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("*")
      .eq("id", articleId)
      .eq("project_id", projectId)
      .single();

    if (articleError || !article) {
      throw new Error("Article not found");
    }

    let publishResult: {
      success: boolean;
      publishedUrl?: string;
      publishedId?: string;
      message?: string;
    };

    switch (platform) {
      case "wordpress":
        publishResult = await publishToWordPress(article, credentials);
        break;
      case "webflow":
        publishResult = await publishToWebflow(article, credentials);
        break;
      case "shopify":
        publishResult = await publishToShopify(article, credentials);
        break;
      case "wix":
        publishResult = await publishToWix(article, credentials);
        break;
      case "api":
        publishResult = await publishToCustomApi(article, credentials);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    if (publishResult.success) {
      // Update article status
      await supabase
        .from("articles")
        .update({ status: "published" })
        .eq("id", articleId);

      console.log(`[cms-publish] Successfully published to ${platform}: ${publishResult.publishedUrl}`);
    }

    return new Response(
      JSON.stringify({
        success: publishResult.success,
        platform,
        articleId,
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
  article: { title: string; content: string },
  credentials: { apiUrl?: string; apiKey?: string }
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  if (!credentials.apiUrl || !credentials.apiKey) {
    throw new Error("WordPress API URL and API Key required");
  }

  try {
    const response = await fetch(`${credentials.apiUrl}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: article.title,
        content: article.content,
        status: "publish",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WordPress API error: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      publishedUrl: data.link,
      publishedId: String(data.id),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "WordPress publish failed",
    };
  }
}

async function publishToWebflow(
  article: { title: string; content: string },
  credentials: { apiKey?: string; siteId?: string; collectionId?: string }
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  if (!credentials.apiKey || !credentials.collectionId) {
    throw new Error("Webflow API Key and Collection ID required");
  }

  try {
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${credentials.collectionId}/items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isArchived: false,
          isDraft: false,
          fieldData: {
            name: article.title,
            slug: article.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            "post-body": article.content,
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
      publishedUrl: data.slug ? `https://${credentials.siteId}.webflow.io/blog/${data.slug}` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Webflow publish failed",
    };
  }
}

async function publishToShopify(
  article: { title: string; content: string },
  credentials: { apiUrl?: string; apiKey?: string }
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  if (!credentials.apiUrl || !credentials.apiKey) {
    throw new Error("Shopify store URL and API Key required");
  }

  try {
    const response = await fetch(`${credentials.apiUrl}/admin/api/2024-01/blogs/default/articles.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": credentials.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        article: {
          title: article.title,
          body_html: article.content,
          published: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      publishedId: String(data.article.id),
      publishedUrl: `${credentials.apiUrl}/blogs/news/${data.article.handle}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Shopify publish failed",
    };
  }
}

async function publishToWix(
  article: { title: string; content: string },
  credentials: { apiKey?: string; siteId?: string }
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  if (!credentials.apiKey || !credentials.siteId) {
    throw new Error("Wix API Key and Site ID required");
  }

  try {
    const response = await fetch(`https://www.wixapis.com/blog/v3/posts`, {
      method: "POST",
      headers: {
        Authorization: credentials.apiKey,
        "wix-site-id": credentials.siteId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post: {
          title: article.title,
          richContent: {
            nodes: [
              {
                type: "PARAGRAPH",
                nodes: [{ type: "TEXT", textData: { text: article.content } }],
              },
            ],
          },
        },
        publish: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Wix API error: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      publishedId: data.post.id,
      publishedUrl: data.post.url,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Wix publish failed",
    };
  }
}

async function publishToCustomApi(
  article: { title: string; content: string },
  credentials: { apiUrl?: string; apiKey?: string }
): Promise<{ success: boolean; publishedUrl?: string; publishedId?: string; message?: string }> {
  if (!credentials.apiUrl) {
    throw new Error("Custom API URL required");
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (credentials.apiKey) {
      headers["Authorization"] = `Bearer ${credentials.apiKey}`;
    }

    const response = await fetch(credentials.apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: article.title,
        content: article.content,
        publishedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Custom API error: ${errorText}`);
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
      message: error instanceof Error ? error.message : "Custom API publish failed",
    };
  }
}
