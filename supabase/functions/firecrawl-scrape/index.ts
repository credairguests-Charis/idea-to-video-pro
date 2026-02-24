const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL for brand info:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 3000,
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

    // Extract useful brand info from the scraped content
    const markdown = data?.data?.markdown || data?.markdown || '';
    const metadata = data?.data?.metadata || data?.metadata || {};
    const html = data?.data?.html || data?.html || '';

    // Extract product images from metadata and content
    const ogImage = metadata.ogImage || metadata['og:image'] || metadata.image || '';
    
    // Try to find product images from the markdown content
    const imageMatches = markdown.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g) || [];
    const imageUrls = imageMatches
      .map((m: string) => {
        const urlMatch = m.match(/\((https?:\/\/[^\s)]+)\)/);
        return urlMatch ? urlMatch[1] : null;
      })
      .filter(Boolean);
    
    // Also extract from HTML img tags if available
    const imgTagMatches = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gi) || [];
    const htmlImageUrls = imgTagMatches
      .map((m: string) => {
        const srcMatch = m.match(/src=["'](https?:\/\/[^"']+)["']/i);
        return srcMatch ? srcMatch[1] : null;
      })
      .filter(Boolean);

    // Combine and prioritize images
    const allImages = [...new Set([ogImage, ...imageUrls, ...htmlImageUrls].filter(Boolean))];
    
    // Prioritize product-looking images
    const productKeywords = ['product', 'hero', 'featured', 'main', 'shop', 'item', 'collection'];
    const prioritizedImages = allImages.sort((a: string, b: string) => {
      const aScore = productKeywords.some(k => a.toLowerCase().includes(k)) ? 1 : 0;
      const bScore = productKeywords.some(k => b.toLowerCase().includes(k)) ? 1 : 0;
      return bScore - aScore;
    });

    const brandInfo = {
      title: metadata.title || '',
      description: metadata.description || metadata['og:description'] || '',
      sourceUrl: formattedUrl,
      content: markdown.substring(0, 5000), // Increased for better AI context
      productImages: prioritizedImages.slice(0, 5), // Top 5 product images
      ogImage: ogImage || null,
    };

    console.log('Scrape successful, title:', brandInfo.title);

    return new Response(
      JSON.stringify({ success: true, data: brandInfo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to scrape' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
