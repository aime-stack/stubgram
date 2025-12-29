import { serve } from "std/http/server.ts"
import { DOMParser } from "deno_dom"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const response = await fetch(url)
    const html = await response.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')

    if (!doc) {
      throw new Error('Failed to parse HTML')
    }

    const title = doc.querySelector('title')?.textContent || 
                  doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || 
                  doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content')

    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || 
                        doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || 
                        doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content')

    const image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || 
                  doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content')

    const domain = new URL(url).hostname

    return new Response(
      JSON.stringify({
        title: title?.trim(),
        description: description?.trim(),
        image,
        domain,
        url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
