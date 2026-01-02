import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const slug = url.searchParams.get('slug')
    const projectId = url.searchParams.get('projectId')

    console.log('Fetching public answer:', { slug, projectId })

    if (!slug || !projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing slug or projectId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch the published answer
    const { data: answer, error } = await supabase
      .from('answers')
      .select(`
        id,
        question,
        answer,
        slug,
        supporting_content,
        platforms,
        score,
        published_at,
        published_url
      `)
      .eq('project_id', projectId)
      .eq('slug', slug)
      .eq('is_public', true)
      .single()

    if (error || !answer) {
      console.error('Answer not found:', error)
      return new Response(
        JSON.stringify({ error: 'Answer not found or not published' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch project info for branding
    const { data: project } = await supabase
      .from('projects')
      .select('brand_name, website_url')
      .eq('id', projectId)
      .single()

    // Build response with JSON-LD
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [{
        "@type": "Question",
        "name": answer.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": answer.answer
        }
      }]
    }

    const response = {
      ...answer,
      brand_name: project?.brand_name || null,
      website_url: project?.website_url || null,
      jsonLd
    }

    console.log('Returning public answer:', answer.slug)

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching public answer:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
