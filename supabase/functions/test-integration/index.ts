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
  if (!config.endpoint || !config.token) {
    return { success: false, message: "Site URL and Application Password required" };
  }

  try {
    let siteUrl = config.endpoint.trim().replace(/\/$/, "");
    if (!siteUrl.startsWith("http")) {
      siteUrl = `https://${siteUrl}`;
    }

    // WordPress Application Password format: username:password
    // Token can be "username:password" or just password (we'll try to extract)
    let username = config.username || "admin";
    let password = config.token;

    // If token contains ':', split it
    if (config.token.includes(":")) {
      const parts = config.token.split(":");
      username = parts[0];
      password = parts.slice(1).join(":");
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
        message: "Invalid credentials. Use format 'username:application_password' or check Users → Your Profile → Application Passwords." 
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
  if (!config.token || !config.siteId) {
    return { success: false, message: "API Key and Site ID required" };
  }

  try {
    const response = await fetch(`https://www.wixapis.com/blog/v3/posts?limit=1`, {
      headers: {
        Authorization: config.token,
        "wix-site-id": config.siteId,
      },
    });

    if (response.ok) {
      return { success: true, message: "Wix Blog API connected successfully!" };
    }

    if (response.status === 401) {
      return { success: false, message: "Invalid API Key. Check your Wix developer credentials." };
    }

    return { success: false, message: `Wix error (${response.status}): ${response.statusText}` };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : "Network error"}` };
  }
}

async function testWebflow(config: Record<string, string>): Promise<{ success: boolean; message: string }> {
  if (!config.token) {
    return { success: false, message: "API Token required" };
  }

  try {
    const response = await fetch(`https://api.webflow.com/v2/sites`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, message: `Connected! Found ${data.sites?.length || 0} site(s).` };
    }

    if (response.status === 401) {
      return { success: false, message: "Invalid API Token. Check your Webflow site settings." };
    }

    return { success: false, message: `Webflow error (${response.status}): ${response.statusText}` };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : "Network error"}` };
  }
}

async function testDuda(config: Record<string, string>): Promise<{ success: boolean; message: string }> {
  if (!config.endpoint || !config.token) {
    return { success: false, message: "Site Name and API Key required" };
  }

  try {
    const response = await fetch(`https://api.duda.co/api/sites/multiscreen/${config.endpoint}`, {
      headers: {
        Authorization: `Basic ${btoa(`${config.token}:`)}`,
      },
    });

    if (response.ok) {
      return { success: true, message: "Duda site connected successfully!" };
    }

    if (response.status === 401) {
      return { success: false, message: "Invalid API credentials." };
    }

    return { success: false, message: `Duda error (${response.status}): ${response.statusText}` };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : "Network error"}` };
  }
}

async function testBigCommerce(config: Record<string, string>): Promise<{ success: boolean; message: string }> {
  if (!config.endpoint || !config.token) {
    return { success: false, message: "Store Hash and API Token required" };
  }

  try {
    const response = await fetch(`https://api.bigcommerce.com/stores/${config.endpoint}/v2/blog/posts?limit=1`, {
      headers: {
        "X-Auth-Token": config.token,
        Accept: "application/json",
      },
    });

    if (response.ok) {
      return { success: true, message: "BigCommerce store connected successfully!" };
    }

    if (response.status === 401) {
      return { success: false, message: "Invalid API Token." };
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
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.token) {
      headers["Authorization"] = `Bearer ${config.token}`;
    }

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
        source: "AEO Reply - Connection Test",
      }),
    });

    // Consider any response (even errors) as "received" for webhooks
    return { success: true, message: "Test payload sent! Check your webhook logs." };
  } catch (error) {
    return { success: false, message: `Webhook failed: ${error instanceof Error ? error.message : "Network error"}` };
  }
}

async function testCustomApi(config: Record<string, string>): Promise<{ success: boolean; message: string }> {
  if (!config.endpoint) {
    return { success: false, message: "API Endpoint required" };
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.token) {
      headers["Authorization"] = config.token;
    }

    const method = config.method?.toUpperCase() || "GET";
    
    const response = await fetch(config.endpoint, {
      method: method === "GET" ? "GET" : "POST",
      headers,
      ...(method !== "GET" && { body: JSON.stringify({ test: true }) }),
    });

    if (response.ok) {
      return { success: true, message: "API endpoint connected successfully!" };
    }

    return { success: false, message: `API error (${response.status}): ${response.statusText}` };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : "Network error"}` };
  }
}
