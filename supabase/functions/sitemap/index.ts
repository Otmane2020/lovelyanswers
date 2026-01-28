import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch all public answers for lovelyanswers.com
    const { data: answers, error } = await supabase
      .from('answers')
      .select(`
        slug, published_at, updated_at,
        projects!inner(domain, website_url)
      `)
      .eq('is_public', true)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching answers:', error)
      throw error
    }

    // Filter only lovelyanswers.com articles
    const lovelyanswersArticles = (answers || []).filter((answer: any) => {
      const projectUrl = (answer.projects?.website_url || '').toLowerCase()
      const projectDomain = (answer.projects?.domain || '').toLowerCase()
      return projectUrl.includes('lovelyanswers.com') || projectDomain === 'lovelyanswers.com'
    })

    const today = new Date().toISOString().split('T')[0]

    // Build sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>https://lovelyanswers.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Blog Index -->
  <url>
    <loc>https://lovelyanswers.com/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Pricing -->
  <url>
    <loc>https://lovelyanswers.com/pricing</loc>
    <lastmod>2026-01-25</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Authentication -->
  <url>
    <loc>https://lovelyanswers.com/auth</loc>
    <lastmod>2026-01-25</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- About -->
  <url>
    <loc>https://lovelyanswers.com/about</loc>
    <lastmod>2026-01-25</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  
  <!-- Terms -->
  <url>
    <loc>https://lovelyanswers.com/terms</loc>
    <lastmod>2026-01-25</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.4</priority>
  </url>
  
  <!-- Privacy -->
  <url>
    <loc>https://lovelyanswers.com/privacy</loc>
    <lastmod>2026-01-25</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.4</priority>
  </url>
`

    // Add blog articles dynamically
    for (const article of lovelyanswersArticles) {
      const lastmod = article.updated_at 
        ? new Date(article.updated_at).toISOString().split('T')[0]
        : new Date(article.published_at).toISOString().split('T')[0]
      
      sitemap += `
  <!-- Blog Article -->
  <url>
    <loc>https://lovelyanswers.com/blog/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    }

    sitemap += `
</urlset>`

    console.log(`Generated sitemap with ${lovelyanswersArticles.length} blog articles`)

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('Sitemap generation error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate sitemap' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
