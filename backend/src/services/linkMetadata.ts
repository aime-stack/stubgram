/**
 * Link Metadata Extraction Service
 * 
 * Provides fault-tolerant extraction of Open Graph metadata, page titles,
 * descriptions, images, and content from external URLs.
 * 
 * Features:
 * - Request timeouts with AbortController
 * - User-Agent rotation to avoid bot detection
 * - In-memory caching with 24-hour TTL
 * - Graceful degradation (success/partial/failed status)
 * - Special handling for Twitter/X via fxtwitter API
 * - Short URL expansion
 */

import * as cheerio from 'cheerio';

// ============================================================================
// Types
// ============================================================================

export interface LinkMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  domain: string | null;  // Hostname for display
  content: string | null;
  canonicalUrl: string | null;
  status: 'success' | 'partial' | 'failed';
  error: string | null;
}

interface CacheEntry {
  data: LinkMetadata;
  timestamp: number;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  FETCH_TIMEOUT_MS: 10000,
  CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
  CACHE_MAX_SIZE: 1000,
  CONTENT_MAX_LENGTH: 500,
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000,
};

// User agents that sites typically allow (social media crawlers)
const USER_AGENTS = [
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'Twitterbot/1.0',
  'WhatsApp/2.21.12.21 A',
  'Googlebot/2.1 (+http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
  'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
];

// Short URL domains that need expansion
const SHORT_URL_DOMAINS = ['bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'short.link', 'ow.ly', 'is.gd'];

// ============================================================================
// Cache
// ============================================================================

const cache = new Map<string, CacheEntry>();

function getCached(url: string): LinkMetadata | null {
  const entry = cache.get(url);
  if (entry && Date.now() - entry.timestamp < CONFIG.CACHE_TTL_MS) {
    return entry.data;
  }
  return null;
}

function setCache(url: string, data: LinkMetadata): void {
  cache.set(url, { data, timestamp: Date.now() });
  
  // Evict old entries if cache is too large
  if (cache.size > CONFIG.CACHE_MAX_SIZE) {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CONFIG.CACHE_TTL_MS) {
        cache.delete(key);
      }
    }
    // If still too large, remove oldest entries
    if (cache.size > CONFIG.CACHE_MAX_SIZE) {
      const entries = Array.from(cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, cache.size - CONFIG.CACHE_MAX_SIZE + 100);
      toDelete.forEach(([key]) => cache.delete(key));
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function isTwitterUrl(url: URL): boolean {
  return url.hostname.includes('x.com') || url.hostname.includes('twitter.com');
}

function isShortUrl(url: URL): boolean {
  return SHORT_URL_DOMAINS.some(domain => url.hostname.includes(domain));
}

function createFailedResponse(url: string, error: string): LinkMetadata {
  let siteName: string | null = null;
  let domain: string | null = null;
  try {
    domain = new URL(url).hostname;
    siteName = domain;
  } catch {
    // Invalid URL, leave siteName as null
  }
  
  return {
    url,
    title: null,
    description: null,
    image: null,
    favicon: null,
    siteName,
    domain,
    content: null,
    canonicalUrl: null,
    status: 'failed',
    error,
  };
}

function resolveUrl(relative: string | undefined, baseUrl: URL): string | null {
  if (!relative) return null;
  try {
    if (relative.startsWith('http://') || relative.startsWith('https://')) {
      return relative;
    }
    return new URL(relative, baseUrl.origin).href;
  } catch {
    return null;
  }
}

// ============================================================================
// Fetch with Timeout and Retry
// ============================================================================

async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {},
  timeoutMs: number = CONFIG.FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: 'follow',
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = CONFIG.FETCH_TIMEOUT_MS,
  retries: number = CONFIG.MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      
      // If successful or client error (4xx), don't retry
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // Server error (5xx), retry
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on abort/timeout for the last attempt
      if (attempt === retries) {
        throw lastError;
      }
    }
    
    // Exponential backoff: wait before retrying
    if (attempt < retries) {
      const delay = CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);
      console.log(`[LinkMetadata] Retry ${attempt + 1}/${retries} after ${delay}ms for ${url}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Fetch failed after retries');
}

// ============================================================================
// Short URL Expansion
// ============================================================================

async function expandShortUrl(url: string): Promise<string> {
  try {
    const urlObj = new URL(url);
    if (!isShortUrl(urlObj)) {
      return url;
    }
    
    const response = await fetchWithRetry(url, {
      method: 'HEAD',
      headers: { 'User-Agent': getRandomUserAgent() },
    }, 3000, 1); // Use shorter timeout and fewer retries for HEAD requests
    
    return response.url || url;
  } catch {
    return url; // Return original if expansion fails
  }
}

// ============================================================================
// Twitter/X Extraction via fxtwitter API
// ============================================================================

// Type for fxtwitter API response
interface FxTwitterResponse {
  tweet?: {
    author?: {
      name?: string;
      screen_name?: string;
      avatar_url?: string;
    };
    text?: string;
    media?: {
      photos?: Array<{ url?: string }>;
    };
  };
}

async function extractTwitterMetadata(url: string): Promise<LinkMetadata | null> {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;

    // 1. Try fxtwitter JSON API first
    const apiUrl = `https://api.fxtwitter.com${path}`;
    
    console.log('[LinkMetadata] Trying fxtwitter API:', apiUrl);
    
    const apiResponse = await fetchWithRetry(apiUrl, {
      headers: { 'User-Agent': getRandomUserAgent() },
    });
    
    if (apiResponse.ok) {
      const data = await apiResponse.json() as FxTwitterResponse;
      if (data?.tweet) {
        const tweet = data.tweet;
        return {
          url,
          title: `${tweet.author?.name || 'Tweet'} (@${tweet.author?.screen_name || 'unknown'})`,
          description: tweet.text || null,
          image: tweet.media?.photos?.[0]?.url || tweet.author?.avatar_url || null,
          favicon: 'https://abs.twimg.com/favicons/twitter.2.ico',
          siteName: 'X (Twitter)',
          domain: 'x.com',
          content: tweet.text || null,
          canonicalUrl: url,
          status: 'success',
          error: null,
        };
      }
    }

    // 2. Fallback to fxtwitter HTML scraping (very reliable for OG tags)
    const fallbackUrl = `https://fxtwitter.com${path}`;
    
    console.log('[LinkMetadata] Falling back to fxtwitter HTML:', fallbackUrl);
    
    const htmlResponse = await fetchWithRetry(fallbackUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html',
      },
    });

    if (htmlResponse.ok) {
      const html = await htmlResponse.text();
      const extracted = parseHtml(html, new URL(fallbackUrl));
      
      return {
        url,
        title: extracted.title || null,
        description: extracted.description || null,
        image: extracted.image || null,
        favicon: extracted.favicon || 'https://abs.twimg.com/favicons/twitter.2.ico',
        siteName: 'X (Twitter)',
        domain: 'x.com',
        content: extracted.content || null,
        canonicalUrl: url,
        status: extracted.title ? 'success' : 'failed',
        error: extracted.title ? null : 'Failed to extract from fxtwitter HTML',
      };
    }
    
    return null;
  } catch (error: any) {
    console.warn('[LinkMetadata] Twitter extraction failed:', error.message);
    return null;
  }
}


// ============================================================================
// HTML Parsing
// ============================================================================

function parseHtml(html: string, baseUrl: URL): Partial<LinkMetadata> {
  const $ = cheerio.load(html);
  
  // Open Graph tags (preferred)
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogDescription = $('meta[property="og:description"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');
  const ogSiteName = $('meta[property="og:site_name"]').attr('content');
  const ogUrl = $('meta[property="og:url"]').attr('content');
  
  // Twitter Card fallbacks
  const twitterTitle = $('meta[name="twitter:title"]').attr('content');
  const twitterDescription = $('meta[name="twitter:description"]').attr('content');
  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  
  // Standard meta tags
  const metaDescription = $('meta[name="description"]').attr('content');
  const pageTitle = $('title').first().text();
  const canonicalLink = $('link[rel="canonical"]').attr('href');
  
  // Favicon extraction (try multiple formats)
  let favicon = 
    $('link[rel="icon"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
    $('link[rel="apple-touch-icon"]').attr('href') ||
    $('link[rel="apple-touch-icon-precomposed"]').attr('href');
  
  // Resolve relative URLs
  const image = resolveUrl(ogImage || twitterImage, baseUrl);
  favicon = resolveUrl(favicon, baseUrl) || `${baseUrl.origin}/favicon.ico`;
  const canonicalUrl = resolveUrl(canonicalLink || ogUrl, baseUrl);
  
  // Extract main content (simplified - first significant paragraph)
  let content: string | null = null;
  const paragraphs = $('article p, main p, .content p, .post-content p, p')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(text => text.length > 50);
  
  if (paragraphs.length > 0) {
    content = paragraphs.slice(0, 3).join(' ').slice(0, CONFIG.CONTENT_MAX_LENGTH);
    if (content.length === CONFIG.CONTENT_MAX_LENGTH) {
      content += '...';
    }
  }
  
  return {
    title: (ogTitle || twitterTitle || pageTitle || '').trim() || null,
    description: (ogDescription || twitterDescription || metaDescription || '').trim() || null,
    image,
    favicon,
    siteName: ogSiteName || baseUrl.hostname,
    content,
    canonicalUrl,
  };
}

// ============================================================================
// Main Extraction Function
// ============================================================================

export async function extractLinkMetadata(inputUrl: string): Promise<LinkMetadata> {
  // 1. Validate URL
  let validUrl: URL;
  try {
    validUrl = new URL(inputUrl);
  } catch {
    return createFailedResponse(inputUrl, 'Invalid URL format');
  }
  
  // Only allow http/https
  if (!['http:', 'https:'].includes(validUrl.protocol)) {
    return createFailedResponse(inputUrl, 'Only HTTP/HTTPS URLs are supported');
  }
  
  // 2. Check cache
  const cached = getCached(inputUrl);
  if (cached) {
    console.log('[LinkMetadata] Cache hit for:', inputUrl);
    return cached;
  }
  
  console.log('[LinkMetadata] Extracting metadata for:', inputUrl);
  
  // 3. Expand short URLs
  let url = inputUrl;
  try {
    url = await expandShortUrl(inputUrl);
    validUrl = new URL(url);
  } catch {
    // Keep original URL if expansion fails
  }
  
  // 4. Special handling for Twitter/X
  if (isTwitterUrl(validUrl)) {
    const twitterResult = await extractTwitterMetadata(url);
    if (twitterResult) {
      setCache(inputUrl, twitterResult);
      return twitterResult;
    }
    // Fall through to standard extraction if Twitter API & Fallback fail
  }
  
  // 5. Standard HTTP fetch + HTML parsing
  let html: string | null = null;
  let extractedData: Partial<LinkMetadata> = {};
  let fetchError: string | null = null;
  
  try {
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
    });
    
    // Check response status
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        fetchError = `Access denied (${response.status}): Site blocks automated requests`;
      } else if (response.status === 404) {
        fetchError = `Page not found (404)`;
      } else if (response.status >= 500) {
        fetchError = `Server error (${response.status}): ${response.statusText}`;
      } else {
        fetchError = `HTTP ${response.status}: ${response.statusText}`;
      }
      console.warn('[LinkMetadata] HTTP error for', url, fetchError);
    } else {
      // Check content type
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        fetchError = `Unexpected content type: ${contentType}`;
        console.warn('[LinkMetadata] Invalid content type for', url, contentType);
      } else {
        html = await response.text();
        extractedData = parseHtml(html, validUrl);
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      fetchError = 'Request timeout after 10 seconds';
    } else if (error.message?.includes('fetch failed')) {
      fetchError = 'Network error: Unable to reach server';
    } else {
      fetchError = error.message || 'Fetch failed';
    }
    console.warn('[LinkMetadata] Fetch failed for', url, fetchError);
  }
  
  // 6. Build response
  const hasMinimalData = !!(extractedData.title || extractedData.description || extractedData.image);
  
  const result: LinkMetadata = {
    url: inputUrl,
    title: extractedData.title || null,
    description: extractedData.description || null,
    image: extractedData.image || null,
    favicon: extractedData.favicon || `${validUrl.origin}/favicon.ico`,
    siteName: extractedData.siteName || validUrl.hostname,
    domain: validUrl.hostname,
    content: extractedData.content || null,
    canonicalUrl: extractedData.canonicalUrl || null,
    status: hasMinimalData ? 'success' : (extractedData.siteName ? 'partial' : 'failed'),
    error: hasMinimalData ? null : (fetchError || 'Could not extract metadata'),
  };
  
  // 7. Cache result
  setCache(inputUrl, result);
  
  return result;
}

// ============================================================================
// Cache Management
// ============================================================================

export function clearCache(): void {
  cache.clear();
}

export function getCacheSize(): number {
  return cache.size;
}

export function getCacheStats(): { size: number; oldestEntry: number | null } {
  let oldest: number | null = null;
  for (const entry of cache.values()) {
    if (oldest === null || entry.timestamp < oldest) {
      oldest = entry.timestamp;
    }
  }
  return { size: cache.size, oldestEntry: oldest };
}
