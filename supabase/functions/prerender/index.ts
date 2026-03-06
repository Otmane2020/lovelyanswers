import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BRAND = 'LovelyAnswers'
const BRAND_URL = 'https://lovelyanswers.com'

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function buildFullHtml(options: {
  title: string
  description: string
  canonical: string
  body: string
  structuredData?: object
  publishedAt?: string
}): string {
  const { title, description, canonical, body, structuredData, publishedAt } = options
  
  const jsonLd = structuredData ? `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>` : ''
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${BRAND}">
  <meta property="og:image" content="${BRAND_URL}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  ${publishedAt ? `<meta property="article:published_time" content="${publishedAt}">` : ''}
  ${jsonLd}
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #1a1a2e; }
    h1 { font-size: 2em; line-height: 1.2; margin-bottom: 0.5em; }
    h2 { font-size: 1.5em; margin-top: 1.5em; }
    p { line-height: 1.7; margin-bottom: 1em; }
    a { color: #7c3aed; }
    nav a { margin-right: 1em; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 2em; }
    footer { border-top: 1px solid #eee; margin-top: 3em; padding-top: 1em; font-size: 0.85em; color: #666; }
  </style>
</head>
<body>
  <header>
    <nav>
      <a href="${BRAND_URL}"><strong>${BRAND}</strong></a>
      <a href="${BRAND_URL}/blog">Blog</a>
      <a href="${BRAND_URL}/pricing">Pricing</a>
      <a href="${BRAND_URL}/about">About</a>
    </nav>
  </header>
  <main>
    ${body}
  </main>
  <footer>
    <p>&copy; ${new Date().getFullYear()} ${BRAND}. AI Visibility Platform — Rank in ChatGPT, Gemini & Google.</p>
    <nav>
      <a href="${BRAND_URL}/blog">Blog</a> |
      <a href="${BRAND_URL}/pricing">Pricing</a> |
      <a href="${BRAND_URL}/about">About</a> |
      <a href="${BRAND_URL}/terms">Terms</a> |
      <a href="${BRAND_URL}/privacy">Privacy</a>
    </nav>
  </footer>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.searchParams.get('path') || '/'

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // ─── Blog article: /blog/:slug ───
    const blogMatch = path.match(/^\/blog\/([^/]+)$/)
    if (blogMatch) {
      const slug = blogMatch[1]

      // Try published_articles first
      const { data: article } = await supabase
        .from('published_articles')
        .select('title, body, slug, published_at, meta_description')
        .eq('slug', slug)
        .maybeSingle()

      if (article) {
        const desc = article.meta_description || stripHtml(article.body || '').substring(0, 160)
        const structuredData = {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": article.title,
          "description": desc,
          "datePublished": article.published_at,
          "url": `${BRAND_URL}/blog/${article.slug}`,
          "publisher": { "@type": "Organization", "name": BRAND, "url": BRAND_URL },
          "author": { "@type": "Organization", "name": BRAND }
        }

        const html = buildFullHtml({
          title: `${article.title} | ${BRAND}`,
          description: desc,
          canonical: `${BRAND_URL}/blog/${article.slug}`,
          body: `<article><h1>${escapeHtml(article.title)}</h1>
            <div class="meta">${article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</div>
            ${article.body || ''}</article>`,
          structuredData,
          publishedAt: article.published_at
        })

        return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
      }

      // Try answers table
      const { data: answer } = await supabase
        .from('answers')
        .select('question, answer, slug, published_at, supporting_content, projects!inner(website_url, domain)')
        .eq('slug', slug)
        .eq('is_public', true)
        .maybeSingle()

      if (answer) {
        const desc = stripHtml(answer.answer).substring(0, 160)
        const faq = (answer.supporting_content as any)?.faq || []
        
        const structuredData: any = {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": answer.question,
          "description": desc,
          "datePublished": answer.published_at,
          "url": `${BRAND_URL}/blog/${answer.slug}`,
          "publisher": { "@type": "Organization", "name": BRAND, "url": BRAND_URL },
          "author": { "@type": "Organization", "name": BRAND }
        }

        let faqHtml = ''
        if (faq.length > 0) {
          faqHtml = '<section><h2>Frequently Asked Questions</h2>'
          for (const item of faq) {
            faqHtml += `<h3>${escapeHtml(item.question || item.q || '')}</h3><p>${escapeHtml(item.answer || item.a || '')}</p>`
          }
          faqHtml += '</section>'
        }

        const html = buildFullHtml({
          title: `${answer.question} | ${BRAND}`,
          description: desc,
          canonical: `${BRAND_URL}/blog/${answer.slug}`,
          body: `<article><h1>${escapeHtml(answer.question)}</h1>
            <div class="meta">${answer.published_at ? new Date(answer.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</div>
            <div>${answer.answer}</div>${faqHtml}</article>`,
          structuredData,
          publishedAt: answer.published_at
        })

        return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
      }

      // Try local_answers
      const { data: localAnswer } = await supabase
        .from('local_answers')
        .select('question, answer, slug, published_at, business_name')
        .eq('slug', slug)
        .eq('is_public', true)
        .maybeSingle()

      if (localAnswer) {
        const desc = stripHtml(localAnswer.answer).substring(0, 160)
        const html = buildFullHtml({
          title: `${localAnswer.question} | ${BRAND}`,
          description: desc,
          canonical: `${BRAND_URL}/blog/${localAnswer.slug}`,
          body: `<article><h1>${escapeHtml(localAnswer.question)}</h1>
            <div class="meta">${localAnswer.published_at ? new Date(localAnswer.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''} · ${escapeHtml(localAnswer.business_name)}</div>
            <div>${localAnswer.answer}</div></article>`,
          publishedAt: localAnswer.published_at
        })
        return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
      }

      return new Response('Not found', { status: 404, headers: corsHeaders })
    }

    // ─── Blog index: /blog ───
    if (path === '/blog') {
      // Fetch recent articles for the index
      const { data: articles } = await supabase
        .from('published_articles')
        .select('title, slug, published_at, meta_description')
        .order('published_at', { ascending: false })
        .limit(50)

      const { data: answers } = await supabase
        .from('answers')
        .select('question, slug, published_at, answer, projects!inner(website_url, domain)')
        .eq('is_public', true)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(50)

      const lovelyanswersAnswers = (answers || []).filter((a: any) => {
        const domain = (a.projects?.domain || '').toLowerCase()
        const url = (a.projects?.website_url || '').toLowerCase()
        return domain.includes('lovelyanswers') || url.includes('lovelyanswers')
      })

      const allItems = [
        ...(articles || []).map((a: any) => ({ title: a.title, slug: a.slug, date: a.published_at, desc: a.meta_description || '' })),
        ...lovelyanswersAnswers.map((a: any) => ({ title: a.question, slug: a.slug, date: a.published_at, desc: stripHtml(a.answer).substring(0, 150) }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      let listHtml = '<h1>Blog — AI-Optimized Answers & Insights</h1>'
      listHtml += `<p>${BRAND} helps brands rank first in ChatGPT, Gemini, and AI search engines with expert-level, SEO-optimized content.</p>`
      listHtml += '<ul>'
      for (const item of allItems) {
        listHtml += `<li><a href="${BRAND_URL}/blog/${item.slug}"><strong>${escapeHtml(item.title)}</strong></a><br><span class="meta">${item.date ? new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</span><br>${escapeHtml(item.desc)}</li>`
      }
      listHtml += '</ul>'

      const html = buildFullHtml({
        title: `Blog - AI-Optimized Answers | ${BRAND}`,
        description: 'Discover AI-optimized answers and insights. Expert content designed for maximum visibility across AI platforms like ChatGPT, Gemini, and Google.',
        canonical: `${BRAND_URL}/blog`,
        body: listHtml
      })

      return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=1800' } })
    }

    // ─── Homepage: / ───
    if (path === '/') {
      const html = buildFullHtml({
        title: `${BRAND} — AI Visibility Platform | Rank in ChatGPT, Gemini & Google`,
        description: 'Track how your brand ranks in ChatGPT, Gemini and AI answers and get cited by AI. Generate AI-optimized content that ranks first.',
        canonical: BRAND_URL,
        body: `
          <h1>LovelyAnswers — AI Visibility Platform</h1>
          <p>Track how your brand ranks in ChatGPT, Gemini and AI answers. Get cited by AI search engines with automatically generated, expert-level content.</p>
          
          <h2>What is Answer Engine Optimization (AEO)?</h2>
          <p>AEO is the practice of optimizing your content to appear as the top answer in AI-powered search engines like ChatGPT, Google Gemini, Perplexity, and Copilot. Unlike traditional SEO, AEO focuses on being the source that AI models cite when answering user questions.</p>
          
          <h2>Features</h2>
          <ul>
            <li><strong>AI Visibility Tracking</strong> — Monitor how your brand appears across ChatGPT, Gemini, Perplexity, and other AI platforms</li>
            <li><strong>AEO Answers</strong> — Generate AI-optimized answers designed to be cited by AI search engines</li>
            <li><strong>Auto SEO Articles</strong> — 30 expert-level, 1,500+ word articles auto-generated and published monthly</li>
            <li><strong>GEO Engine</strong> — Generative Engine Optimization content for maximum AI visibility</li>
            <li><strong>Local AEO</strong> — Optimize local businesses for AI search results</li>
            <li><strong>CMS Auto-Publishing</strong> — Publish directly to WordPress, Shopify, Wix, and more</li>
          </ul>
          
          <h2>Proven in 50+ Industries</h2>
          <p>Healthcare, legal, e-commerce, SaaS, local services, and more. Our AI-assisted content follows Google's E-E-A-T guidelines for quality and authority.</p>
          
          <h2>Pricing</h2>
          <p>Starting at $29/month. 30 SEO articles, 30 AEO answers, GEO content, and auto-publishing included. <a href="${BRAND_URL}/pricing">View pricing</a></p>
          
          <p><a href="${BRAND_URL}/auth">Get Started Free</a> | <a href="${BRAND_URL}/blog">Read our Blog</a> | <a href="${BRAND_URL}/pricing">View Pricing</a></p>
        `,
        structuredData: {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": BRAND,
          "url": BRAND_URL,
          "description": "Generate AI-optimized answers for ChatGPT, Gemini, Copilot and Google. Improve AEO & SEO visibility and get cited by AI search engines.",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "offers": { "@type": "Offer", "price": "29", "priceCurrency": "USD" }
        }
      })

      return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
    }

    // ─── Pricing: /pricing ───
    if (path === '/pricing') {
      const html = buildFullHtml({
        title: `Pricing — ${BRAND} | AI SEO & AEO Plans`,
        description: 'Simple, transparent pricing for AI visibility. Start with a free trial, upgrade to get 30 SEO articles, AEO answers, and auto-publishing.',
        canonical: `${BRAND_URL}/pricing`,
        body: `
          <h1>Pricing — AI Visibility Plans</h1>
          <p>Simple pricing to rank your brand in ChatGPT, Gemini, and Google.</p>
          
          <h2>Starter — $29/month</h2>
          <ul>
            <li>30 AI-optimized SEO articles per month</li>
            <li>30 AEO answers for AI search engines</li>
            <li>GEO content generation</li>
            <li>Auto-publish to WordPress, Shopify, Wix</li>
            <li>AI visibility tracking</li>
            <li>Google Search Console integration</li>
          </ul>
          
          <h2>Frequently Asked Questions</h2>
          <h3>Can I really cancel anytime?</h3>
          <p>Yes, 1-click cancellation. No questions asked, no hidden fees.</p>
          <h3>Do I need technical skills?</h3>
          <p>No, we handle everything. Just enter your website URL and we do the rest.</p>
          <h3>Will this work for my industry?</h3>
          <p>Yes, proven in 50+ industries including healthcare, legal, e-commerce, SaaS, and local services.</p>
          
          <p><a href="${BRAND_URL}/auth">Start Free Trial</a></p>
        `
      })

      return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
    }

    // ─── About: /about ───
    if (path === '/about') {
      const html = buildFullHtml({
        title: `About ${BRAND} — AI Visibility Platform`,
        description: `${BRAND} is the AI visibility platform that helps brands rank first in ChatGPT, Gemini, and AI-powered search engines.`,
        canonical: `${BRAND_URL}/about`,
        body: `
          <h1>About LovelyAnswers</h1>
          <p>LovelyAnswers is the AI visibility platform that helps brands get cited by AI search engines. We combine Answer Engine Optimization (AEO), Generative Engine Optimization (GEO), and traditional SEO to ensure your brand appears first when AI answers questions about your industry.</p>
          <p>Founded to solve the emerging challenge of AI search visibility, LovelyAnswers automates the entire process — from content generation to publishing — so businesses can focus on what they do best.</p>
          <p><a href="${BRAND_URL}/auth">Get started</a> | <a href="${BRAND_URL}/pricing">View pricing</a></p>
        `
      })

      return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } })
    }

    return new Response('Not found', { status: 404, headers: corsHeaders })

  } catch (error) {
    console.error('Prerender error:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})
