import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestRequest {
  platform: string;
  config: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platform, config }: TestRequest = await req.json();

    console.log(`[test-integration] Testing ${platform} connection`);

    let result: { success: boolean; message: string };

    switch (platform) {
      case "shopify":
        result = await testShopify(config);
        break;
      case "wordpress":
        result = await testWordPress(config);
        break;
      case "wix":
        result = await testWix(config);
        break;
      case "webflow":
        result = await testWebflow(config);
        break;
      case "duda":
        result = await testDuda(config);
        break;
      case "bigcommerce":
        result = await testBigCommerce(config);
        break;
      case "webhook":
      case "framer":
      case "snapps":
        result = await testWebhook(config);
        break;
      case "api":
        result = await testCustomApi(config);
        break;
      default:
        result = { success: false, message: `Unsupported platform: ${platform}` };
    }

    console.log(`[test-integration] Result: ${JSON.stringify(result)}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[test-integration] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Test failed",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function testShopify(config: Record<string, string>): Promise<{ success: boolean; message: string }> {
  if (!config.endpoint || !config.token) {
    return { success: false, message: "Store URL and Admin API token required" };
  }

  try {
    // Clean up the endpoint URL
    let storeUrl = config.endpoint.trim();
    if (!storeUrl.startsWith("http")) {
      storeUrl = `https://${storeUrl}`;
    }
    storeUrl = storeUrl.replace(/\/$/, "");

    const response = await fetch(`${storeUrl}/admin/api/2024-01/blogs.json`, {
      headers: { "X-Shopify-Access-Token": config.token },
    });

    if (response.ok) {
      const data = await response.json();
      const blogCount = data.blogs?.length || 0;
      return {
        success: true,
        message: blogCount > 0 
          ? `Connected! Found ${blogCount} blog(s) in your store.`
          : "Connected! No blogs found - create one in Online Store → Blog Posts.",
      };
    }

    if (response.status === 401) {
      return { success: false, message: "Invalid Admin API Access Token. Check your Custom App credentials." };
    }
    if (response.status === 404) {
      return { success: false, message: "Store not found. Use your .myshopify.com URL." };
    }

    return { success: false, message: `Shopify error (${response.status}): ${response.statusText}` };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : "Network error"}` };
  }
}

async function testWordPress(config: Record<string, string>): Promise<{ success: boolean; message: string }> {
  if (!config.endpoint) {
    return { success: false, message: "Site URL is required" };
  }

  try {
    let siteUrl = config.endpoint.trim().replace(/\/+$/, "");
    if (!siteUrl.startsWith("http")) {
      siteUrl = `https://${siteUrl}`;
    }

    // Get username and password
    let username = config.username?.trim() || "";
    let password = config.token?.trim() || "";
    
    // Application passwords can have spaces - remove them
    password = password.replace(/\s+/g, "");
    
    if (!username || !password) {
      return { success: false, message: "Username and Application Password are required" };
    }

    const basicAuth = btoa(`${username}:${password}`);

    // Test with /wp-json/wp/v2/users/me - requires authentication
    const response = await fetch(`${siteUrl}/wp-json/wp/v2/users/me`, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const user = await response.json();
      return { 
        success: true, 
        message: `Connected as "${user.name || user.slug}"! Ready to publish.` 
      };
    }

    if (response.status === 401) {
      return { 
        success: false, 
        message: "Invalid credentials. Check your username and Application Password in Users → Profile → Application Passwords." 
      };
    }

    if (response.status === 404) {
      // Try to check if REST API is available
      const apiCheck = await fetch(`${siteUrl}/wp-json/`);
      if (!apiCheck.ok) {
        return { success: false, message: "WordPress REST API not found. Ensure permalinks are enabled." };
      }
      return { success: false, message: "Authentication endpoint not found. Check your WordPress version." };
    }

    const errorText = await response.text().catch(() => response.statusText);
    return { success: false, message: `WordPress error (${response.status}): ${errorText.slice(0, 100)}` };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : "Network error"}` };
  }
}

async function testWix(config: Record<string, string>): Promise<{ success: boolean; message: string }> {
  const apiKey = config.token?.trim();
  const siteId = config.siteId?.trim();

  if (!apiKey) {
    return { success: false, message: "API Key required. Get it from dev.wix.com → API Keys" };
  }

  try {
    const headers: Record<string, string> = {
      Authorization: apiKey,
      "Content-Type": "application/json",
    };

    // Add site ID if provided
    if (siteId) {
      headers["wix-site-id"] = siteId;
    }

    // Test the blog API
    const response = await fetch(`https://www.wixapis.com/blog/v3/posts?paging.limit=1`, {
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      const postCount = data.posts?.length || 0;
      return { 
        success: true, 
        message: postCount > 0 
          ? `Connected! Found blog posts on your Wix site.` 
          : "Connected! Blog is empty - ready to publish." 
      };
    }

    if (response.status === 401 || response.status === 403) {
      return { 
        success: false, 
        message: "Invalid API Key. Generate one at dev.wix.com → API Keys with Blog permissions." 
      };
    }

    if (response.status === 404) {
      return { success: false, message: "Blog not found. Ensure Wix Blog app is installed on your site." };
    }

    const errorData = await response.json().catch(() => ({}));
    return { 
      success: false, 
      message: `Wix error (${response.status}): ${errorData.message || response.statusText}` 
    };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : "Network error"}` };
  }
}

async function testWebflow(config: Record<string, string>): Promise<{ success: boolean; message: string }> {
  if (!config.token) {
    return { success: false, message: "API Token required" };
  }

  try {
    const token = config.token.replace(/^Bearer\s+/i, "");
    
    // First get authorized sites
    const sitesResponse = await fetch(`https://api.webflow.com/v2/sites`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "accept-version": "1.0.0",
      },
    });

    if (sitesResponse.ok) {
      const data = await sitesResponse.json();
      const siteCount = data.sites?.length || 0;
      
      if (siteCount === 0) {
        return { success: true, message: "Connected! No sites found - authorize a site in Webflow." };
      }

      // Try to get collections for the first site
      const siteId = config.siteId || data.sites[0].id;
      const collectionsResponse = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "accept-version": "1.0.0",
        },
      });

      if (collectionsResponse.ok) {
        const collectionsData = await collectionsResponse.json();
        const collectionCount = collectionsData.collections?.length || 0;
        return { 
          success: true, 
          message: `Connected! Found ${siteCount} site(s) with ${collectionCount} collection(s).` 
        };
      }

      return { success: true, message: `Connected! Found ${siteCount} site(s).` };
    }

    if (sitesResponse.status === 401) {
      return { success: false, message: "Invalid API Token. Generate a new one in Webflow → Site Settings → Integrations." };
    }

    if (sitesResponse.status === 403) {
      return { success: false, message: "Token lacks permissions. Ensure CMS access is enabled." };
    }

    return { success: false, message: `Webflow error (${sitesResponse.status}): ${sitesResponse.statusText}` };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : "Network error"}` };
  }
}

async function testDuda(config: Record<string, string>): Promise<{ success: boolean; message: string }> {
  if (!config.endpoint) {
    return { success: false, message: "Site Name required" };
  }

  if (!config.token || !config.apiUser) {
    return { success: false, message: "API User and API Password required" };
  }

  try {
    const siteName = config.endpoint.trim();
    // Duda uses HTTP Basic Auth with api_user:api_pass
    const basicAuth = btoa(`${config.apiUser}:${config.token}`);

    const response = await fetch(`https://api.duda.co/api/sites/multiscreen/${siteName}`, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { 
        success: true, 
        message: `Connected to "${data.site_name || siteName}"!` 
      };
    }

    if (response.status === 401) {
      return { success: false, message: "Invalid API credentials. Check your Duda Partner Portal → API Access." };
    }

    if (response.status === 404) {
      return { success: false, message: "Site not found. Check the site name in your Duda dashboard." };
    }

    return { success: false, message: `Duda error (${response.status}): ${response.statusText}` };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : "Network error"}` };
  }
}

async function testBigCommerce(config: Record<string, string>): Promise<{ success: boolean; message: string }> {
  if (!config.endpoint) {
    return { success: false, message: "Store Hash required (found in your store URL)" };
  }

  if (!config.token) {
    return { success: false, message: "API Access Token required" };
  }

  try {
    // Clean store hash (remove any URL parts)
    let storeHash = config.endpoint.trim();
    const hashMatch = storeHash.match(/stores\/([a-z0-9]+)/i);
    if (hashMatch) {
      storeHash = hashMatch[1];
    }
    storeHash = storeHash.replace(/[^a-z0-9]/gi, "");

    const response = await fetch(`https://api.bigcommerce.com/stores/${storeHash}/v2/blog/posts?limit=1`, {
      headers: {
        "X-Auth-Token": config.token,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const posts = await response.json();
      const hasBlogs = Array.isArray(posts) && posts.length > 0;
      return { 
        success: true, 
        message: hasBlogs 
          ? "Connected! Found existing blog posts." 
          : "Connected! Blog is ready for new posts." 
      };
    }

    if (response.status === 401) {
      return { success: false, message: "Invalid API Token. Create one in Settings → API Accounts." };
    }

    if (response.status === 404) {
      // Check if store exists
      const storeCheck = await fetch(`https://api.bigcommerce.com/stores/${storeHash}/v2/store`, {
        headers: {
          "X-Auth-Token": config.token,
          "Accept": "application/json",
        },
      });

      if (storeCheck.ok) {
        return { success: true, message: "Connected! Blog API may not be enabled on this plan." };
      }

      return { success: false, message: "Store not found. Check your Store Hash." };
    }

    return { success: false, message: `BigCommerce error (${response.status}): ${response.statusText}` };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : "Network error"}` };
  }
}

async function testWebhook(config: Record<string, string>): Promise<{ success: boolean; message: string }> {
  if (!config.endpoint) {
    return { success: false, message: "Webhook URL required" };
  }

  try {
    // Validate URL format
    const url = new URL(config.endpoint);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { success: false, message: "Invalid URL. Must start with http:// or https://" };
    }

    const headers: Record<string, string> = { 
      "Content-Type": "application/json",
      "User-Agent": "AEO-Reply-Webhook/1.0",
    };
    
    if (config.token) {
      headers["Authorization"] = config.token.startsWith("Bearer ") 
        ? config.token 
        : `Bearer ${config.token}`;
    }

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        event: "connection_test",
        test: true,
        timestamp: new Date().toISOString(),
        source: "AEO Reply",
      }),
    });

    // For webhooks, any response means the endpoint is reachable
    if (response.ok) {
      return { success: true, message: "Webhook endpoint verified! Test payload sent successfully." };
    }

    // Even non-2xx responses mean the endpoint exists
    if (response.status < 500) {
      return { 
        success: true, 
        message: `Endpoint reachable (returned ${response.status}). Check your webhook logs.` 
      };
    }

    return { success: false, message: `Webhook error (${response.status}): Server error` };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("URL")) {
      return { success: false, message: "Invalid webhook URL format" };
    }
    return { success: false, message: `Webhook unreachable: ${error instanceof Error ? error.message : "Network error"}` };
  }
}

async function testCustomApi(config: Record<string, string>): Promise<{ success: boolean; message: string }> {
  if (!config.endpoint) {
    return { success: false, message: "API Endpoint URL required" };
  }

  try {
    // Validate URL
    const url = new URL(config.endpoint);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { success: false, message: "Invalid URL. Must start with http:// or https://" };
    }

    const headers: Record<string, string> = { 
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    
    if (config.token) {
      // Support various auth formats
      if (config.token.toLowerCase().startsWith("bearer ") || 
          config.token.toLowerCase().startsWith("basic ") ||
          config.token.toLowerCase().startsWith("apikey ")) {
        headers["Authorization"] = config.token;
      } else {
        headers["Authorization"] = `Bearer ${config.token}`;
      }
    }

    // Add custom header if provided
    if (config.headerName && config.headerValue) {
      headers[config.headerName] = config.headerValue;
    }

    const method = (config.method?.toUpperCase() || "GET") as string;
    
    const fetchOptions: RequestInit = {
      method: method === "GET" || method === "HEAD" ? method : "POST",
      headers,
    };

    if (method !== "GET" && method !== "HEAD") {
      fetchOptions.body = JSON.stringify({ 
        test: true,
        source: "AEO Reply",
        timestamp: new Date().toISOString(),
      });
    }

    const response = await fetch(config.endpoint, fetchOptions);

    if (response.ok) {
      return { success: true, message: "API endpoint connected successfully!" };
    }

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: "Authentication failed. Check your API credentials." };
    }

    if (response.status === 404) {
      return { success: false, message: "Endpoint not found (404). Verify the URL." };
    }

    return { success: false, message: `API error (${response.status}): ${response.statusText}` };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("URL")) {
      return { success: false, message: "Invalid API endpoint URL format" };
    }
    return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : "Network error"}` };
  }
}
