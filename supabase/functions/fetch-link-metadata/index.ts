import { serve } from "std/http/server.ts"
import { DOMParser } from "deno_dom"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration
const FETCH_TIMEOUT_MS = 5000;

// User agents that social media sites typically allow
const USER_AGENTS = [
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'Twitterbot/1.0',
  'WhatsApp/2.21.12.21 A',
  'Googlebot/2.1 (+http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Fetch with timeout using AbortController
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()

    if (!url) {
      return new Response(JSON.stringify({ 
        url: null,
        title: null,
        description: null,
        image: null,
        favicon: null,
        siteName: null,
        domain: null,
        status: 'failed',
        error: 'URL is required' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Validate URL
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({
        url,
        title: null,
        description: null,
        image: null,
        favicon: null,
        siteName: null,
        domain: null,
        status: 'failed',
        error: 'Invalid URL format'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const domain = validUrl.hostname;

    // Strategy 1: Special handling for Twitter/X using api.fxtwitter.com (JSON API)
    if (url.includes('x.com') || url.includes('twitter.com')) {
      try {
        const apiUrl = url.replace('x.com', 'api.fxtwitter.com').replace('twitter.com', 'api.fxtwitter.com')
        const response = await fetchWithTimeout(apiUrl, FETCH_TIMEOUT_MS);
        
        if (response.ok) {
          const data = await response.json()
          if (data && data.tweet) {
            return new Response(
              JSON.stringify({
                url,
                title: `${data.tweet.author.name} (@${data.tweet.author.screen_name})`,
                description: data.tweet.text,
                image: data.tweet.media?.photos?.[0]?.url || data.tweet.author.avatar_url,
                favicon: 'https://abs.twimg.com/favicons/twitter.2.ico',
                siteName: 'X (Twitter)',
                domain,
                status: 'success',
                error: null
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            )
          }
        }
      } catch (twitterError) {
        console.warn('Twitter API failed, falling back to standard scraping:', twitterError);
      }
      // Fall through to standard scraper if Twitter API fails
    }

    // Strategy 2: Standard scraping with timeout
    try {
      const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text()
      const doc = new DOMParser().parseFromString(html, 'text/html')

      if (!doc) {
        throw new Error('Failed to parse HTML')
      }

      // Extract metadata with fallback chain
      const title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || 
                    doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
                    doc.querySelector('title')?.textContent

      const description = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || 
                          doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
                          doc.querySelector('meta[name="description"]')?.getAttribute('content')

      const image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || 
                    doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content')

      const siteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || domain

      // Get favicon
      let favicon = doc.querySelector('link[rel="icon"]')?.getAttribute('href') ||
                    doc.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') ||
                    `${validUrl.origin}/favicon.ico`;
      
      // Resolve relative favicon URL
      if (favicon && !favicon.startsWith('http')) {
        try {
          favicon = new URL(favicon, validUrl.origin).href;
        } catch {
          favicon = `${validUrl.origin}/favicon.ico`;
        }
      }

      // Resolve relative image URL
      let resolvedImage = image;
      if (image && !image.startsWith('http')) {
        try {
          resolvedImage = new URL(image, validUrl.origin).href;
        } catch {
          resolvedImage = null;
        }
      }

      const hasData = title || description || resolvedImage;

      return new Response(
        JSON.stringify({
          url,
          title: title?.trim() || null,
          description: description?.trim() || null,
          image: resolvedImage || null,
          favicon,
          siteName,
          domain,
          status: hasData ? 'success' : 'partial',
          error: hasData ? null : 'Limited metadata available'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } catch (fetchError: any) {
      // Graceful degradation - return partial response instead of error
      const errorMessage = fetchError.name === 'AbortError' 
        ? 'Request timeout' 
        : (fetchError.message || 'Fetch failed');
      
      console.error('Fetch failed:', errorMessage);
      
      return new Response(
        JSON.stringify({
          url,
          title: null,
          description: null,
          image: null,
          favicon: `${validUrl.origin}/favicon.ico`,
          siteName: domain,
          domain,
          status: 'failed',
          error: errorMessage
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Return 200 even for partial failure - let client decide
        }
      )
    }
  } catch (error) {
    // Top-level error handler
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Edge function error:', errorMessage);
    
    return new Response(JSON.stringify({ 
      url: null,
      title: null,
      description: null,
      image: null,
      favicon: null,
      siteName: null,
      domain: null,
      status: 'failed',
      error: errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

