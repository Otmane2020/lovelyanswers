const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: false, // Get full page for richer content
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract metadata
    const metadata = data.data?.metadata || {};
    const markdown = data.data?.markdown || '';
    
    // Extract brand name from title or domain
    const title = metadata.title || '';
    let description = metadata.description || '';
    const language = metadata.language || 'en';
    const ogDescription = metadata.ogDescription || '';
    
    // Use longer description if available
    if (ogDescription && ogDescription.length > description.length) {
      description = ogDescription;
    }
    
    // Try to extract brand name from title (usually before | or -)
    let brandName = title.split('|')[0].split('-')[0].split('—')[0].split(':')[0].trim();
    if (!brandName || brandName.length < 2) {
      // Extract from URL
      const urlObj = new URL(formattedUrl);
      brandName = urlObj.hostname.replace('www.', '').split('.')[0];
      brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
    }

    // Extract richer content from markdown for better description
    const contentPreview = markdown.substring(0, 5000);
    
    // Extract key phrases and sections
    const headings: string[] = contentPreview.match(/^#{1,3}\s+(.+)$/gm) || [];
    const cleanHeadings = headings.map((h: string) => h.replace(/^#+\s+/, '').trim()).slice(0, 10);
    
    // Extract bullet points and key features
    const bullets: string[] = contentPreview.match(/^[-*]\s+(.+)$/gm) || [];
    const cleanBullets = bullets.map((b: string) => b.replace(/^[-*]\s+/, '').trim()).slice(0, 15);
    
    // Build enriched description if the original is too short
    let enrichedDescription = description;
    
    if (description.length < 200) {
      // Create a richer description from the content
      const contentParts = [];
      
      if (description) {
        contentParts.push(description);
      }
      
      // Add context from headings
      if (cleanHeadings.length > 0) {
        const relevantHeadings = cleanHeadings.filter((h: string) => 
          h.length > 5 && 
          !h.toLowerCase().includes('menu') && 
          !h.toLowerCase().includes('navigation') &&
          !h.toLowerCase().includes('footer')
        ).slice(0, 5);
        
        if (relevantHeadings.length > 0) {
          contentParts.push(`Key offerings include: ${relevantHeadings.join(', ')}.`);
        }
      }
      
      // Add features from bullet points
      if (cleanBullets.length > 0) {
        const relevantBullets = cleanBullets.filter((b: string) => 
          b.length > 10 && 
          b.length < 100
        ).slice(0, 5);
        
        if (relevantBullets.length > 0) {
          contentParts.push(`Features: ${relevantBullets.join('; ')}.`);
        }
      }
      
      enrichedDescription = contentParts.join(' ');
    }
    
    // Extract potential target audiences from content
    const audiences: string[] = [];
    const lowerContent = contentPreview.toLowerCase();
    
    // B2B indicators
    if (lowerContent.includes('entreprise') || lowerContent.includes('business') || lowerContent.includes('b2b')) {
      audiences.push('businesses', 'enterprises');
    }
    if (lowerContent.includes('professional') || lowerContent.includes('professionnel')) {
      audiences.push('professionals');
    }
    if (lowerContent.includes('retailer') || lowerContent.includes('revendeur') || lowerContent.includes('wholesale')) {
      audiences.push('retailers', 'resellers');
    }
    if (lowerContent.includes('interior design') || lowerContent.includes('décorateur') || lowerContent.includes('architect')) {
      audiences.push('interior designers', 'architects');
    }
    if (lowerContent.includes('hotel') || lowerContent.includes('restaurant') || lowerContent.includes('hospitality')) {
      audiences.push('hospitality industry', 'hotels & restaurants');
    }
    if (lowerContent.includes('startup') || lowerContent.includes('entrepreneur')) {
      audiences.push('startups', 'entrepreneurs');
    }
    if (lowerContent.includes('developer') || lowerContent.includes('développeur')) {
      audiences.push('developers', 'tech teams');
    }
    if (lowerContent.includes('marketing') || lowerContent.includes('agency') || lowerContent.includes('agence')) {
      audiences.push('marketing teams', 'agencies');
    }
    if (lowerContent.includes('ecommerce') || lowerContent.includes('e-commerce') || lowerContent.includes('online store')) {
      audiences.push('e-commerce businesses', 'online retailers');
    }
    if (lowerContent.includes('homeowner') || lowerContent.includes('particulier') || lowerContent.includes('home')) {
      audiences.push('homeowners', 'home decor enthusiasts');
    }
    
    // If no specific audiences found, use generic ones based on domain
    if (audiences.length < 2) {
      audiences.push('business owners', 'decision makers', 'industry professionals');
    }
    
    // Extract potential competitors (domains mentioned in content)
    const domainMatches: string[] = contentPreview.match(/(?:www\.)?([a-z0-9-]+\.(com|fr|de|es|io|co|net|org))/gi) || [];
    const competitors = [...new Set(domainMatches)]
      .filter((d: string) => !d.includes(new URL(formattedUrl).hostname.replace('www.', '')))
      .slice(0, 5);
    
    console.log('Scrape successful:', { 
      brandName, 
      language, 
      descriptionLength: enrichedDescription.length,
      audiencesFound: audiences.length,
      competitorsFound: competitors.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          brandName,
          description: enrichedDescription,
          language,
          title,
          keywords: metadata.keywords || '',
          markdown: markdown.substring(0, 3000),
          url: formattedUrl,
          audiences: [...new Set(audiences)].slice(0, 6),
          competitors,
          headings: cleanHeadings,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
