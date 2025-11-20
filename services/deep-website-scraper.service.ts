import * as cheerio from 'cheerio'
import { filterRelevantSitemapUrls } from '@/services/ai.service'

interface ScrapedPage {
  url: string
  text: string
}

export class DeepWebsiteScraperService {
  private readonly MAX_PAGES = 10 // Limit to avoid overwhelming the target site and keep content focused
  private readonly TIMEOUT_MS = 10000
  private readonly USER_AGENT = 'Mozilla/5.0 (compatible; EmpreinteBot/1.0; Nature Places Data Enhancement)'

  /**
   * Fetches and parses a sitemap from a website
   * @param placeName Optional place name for LLM filtering when >10 URLs found
   * @param country Optional country to prioritize language-specific pages
   */
  private async fetchSitemap(baseUrl: string, placeName?: string, country?: string | null): Promise<string[] | null> {
    try {
      console.log(`🗺️  Attempting to fetch sitemap from: ${baseUrl}`)

      // Common sitemap locations
      const sitemapUrls = [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap_index.xml`, `${baseUrl}/sitemap`]

      for (const sitemapUrl of sitemapUrls) {
        try {
          const response = await fetch(sitemapUrl, {
            headers: { 'User-Agent': this.USER_AGENT },
            signal: AbortSignal.timeout(this.TIMEOUT_MS),
          })

          if (!response.ok) continue

          const xml = await response.text()
          const urls = await this.parseSitemapXml(xml)

          if (urls.length > 0) {
            console.log(`✅ Found sitemap with ${urls.length} URLs at ${sitemapUrl}`)

            // Step 1: Pre-filter by language if country is France - STRICTLY French pages only
            // This ensures we filter by language FIRST, before LLM relevance filtering
            let filteredUrls = urls
            if (country === 'France') {
              const frenchUrls = urls.filter((url) => {
                const lowerUrl = url.toLowerCase()

                // Check for explicit French language indicators
                const isFrench =
                  lowerUrl.includes('/fr/') ||
                  lowerUrl.includes('/french/') ||
                  lowerUrl.includes('/francais/') ||
                  lowerUrl.includes('/fr-') ||
                  lowerUrl.includes('?lang=fr') ||
                  lowerUrl.includes('&lang=fr') ||
                  lowerUrl.includes('?locale=fr') ||
                  lowerUrl.includes('&locale=fr')

                // Check for explicit English language indicators
                const isEnglish =
                  lowerUrl.includes('/en/') ||
                  lowerUrl.includes('/english/') ||
                  lowerUrl.includes('/en-') ||
                  lowerUrl.includes('?lang=en') ||
                  lowerUrl.includes('&lang=en') ||
                  lowerUrl.includes('?locale=en') ||
                  lowerUrl.includes('&locale=en')

                // Check for other language codes (2-letter codes like /de/, /es/, /it/, etc.)
                // but exclude /fr/ and locale codes like /fr-fr/
                const languageCodeMatch = lowerUrl.match(/\/([a-z]{2})(\/|$)/)
                const isOtherLanguage =
                  languageCodeMatch && languageCodeMatch[1] !== 'fr' && !lowerUrl.match(/\/[a-z]{2}-[a-z]{2}\//) // Exclude locale codes

                // For France, exclude English and other languages
                if (isEnglish || (isOtherLanguage && !isFrench)) {
                  return false
                }

                // Include if explicitly French or if no language indicator (assume French for French sites)
                return isFrench || (!isEnglish && !isOtherLanguage)
              })

              if (frenchUrls.length > 0) {
                console.log(`🇫🇷 Language filter: ${frenchUrls.length} French pages (from ${urls.length} total)`)
                filteredUrls = frenchUrls
              } else {
                console.log(`⚠️  No French pages found in sitemap, will use LLM filtering with French preference`)
              }
            }

            // Step 2: If still more than MAX_PAGES URLs, use LLM to filter the most relevant ones
            // This runs on the already language-filtered list (if France) or original list (otherwise)
            if (filteredUrls.length > this.MAX_PAGES && placeName) {
              console.log(
                `🤖 ${filteredUrls.length} URLs remaining, using LLM to filter to ${this.MAX_PAGES} most relevant...`,
              )
              const llmFilteredUrls = await filterRelevantSitemapUrls(placeName, filteredUrls, this.MAX_PAGES, country)
              return llmFilteredUrls
            }

            // Step 3: If we have <= MAX_PAGES URLs, return them (already language-filtered if France)
            return filteredUrls.slice(0, this.MAX_PAGES)
          }
        } catch (error) {
          // Try next sitemap location
          continue
        }
      }

      console.log(`⚠️  No sitemap found, will only scrape the homepage`)
      return null
    } catch (error) {
      console.warn(`❌ Error fetching sitemap:`, error)
      return null
    }
  }

  /**
   * Parses sitemap XML and extracts URLs
   */
  private async parseSitemapXml(xml: string): Promise<string[]> {
    try {
      const urls: string[] = []

      // Use simple XML parsing to extract URLs
      const urlMatches = xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)

      for (const match of urlMatches) {
        const url = match[1].trim()
        if (url) {
          urls.push(url)
        }
      }

      return urls
    } catch (error) {
      console.warn(`❌ Error parsing sitemap XML:`, error)
      return []
    }
  }

  /**
   * Fetches HTML content from a URL
   */
  private async fetchPage(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.USER_AGENT },
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      })

      if (!response.ok) {
        console.warn(`❌ Failed to fetch ${url}: ${response.status}`)
        return null
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('text/html')) {
        console.warn(`⚠️  Skipping non-HTML content: ${url}`)
        return null
      }

      return await response.text()
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        console.warn(`⏰ Timeout fetching ${url}`)
      } else if (error instanceof Error && error.message.includes('fetch failed')) {
        console.warn(`🔒 Protection detected or network error on ${url}`)
      } else {
        console.warn(`❌ Error fetching ${url}:`, error)
      }
      return null
    }
  }

  /**
   * Extracts clean text content from HTML
   */
  private extractTextContent(html: string): string {
    const $ = cheerio.load(html)

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, iframe, noscript, form').remove()
    $('.menu, .navigation, .sidebar, .ad, .advertisement, .cookie-banner, .social-share, .comments').remove()

    // Try semantic HTML5 first
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.main-content',
      '.content',
      '.article-content',
      '#content',
      '.post-content',
      '.entry-content',
    ]

    let content = ''
    for (const selector of contentSelectors) {
      const element = $(selector)
      if (element.length > 0) {
        content = element.text()
        if (content.length > 200) break
      }
    }

    // Fallback to body if no specific content area found
    if (!content || content.length < 200) {
      content = $('body').text()
    }

    // Clean up text
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\[.*?\]/g, '') // Remove [citations]
      .replace(/\{.*?\}/g, '') // Remove {annotations}
      .trim()
  }

  /**
   * Validates URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  /**
   * Gets base URL from a full URL
   */
  private getBaseUrl(url: string): string {
    try {
      const parsed = new URL(url)
      return `${parsed.protocol}//${parsed.host}`
    } catch {
      return url
    }
  }

  /**
   * Main method: Scrapes multiple pages from a website using sitemap
   * Returns combined text content from all pages
   * @param websiteUrl The website URL to scrape
   * @param placeName Optional place name for LLM filtering when sitemap has >20 pages
   * @param country Optional country to filter language-specific pages (e.g., "France" for French-only)
   */
  public async scrapeWebsiteDeep(
    websiteUrl: string,
    placeName?: string,
    country?: string | null,
  ): Promise<string | null> {
    try {
      console.log(`🔍 Starting deep scrape for: ${websiteUrl}`)

      if (!this.isValidUrl(websiteUrl)) {
        console.warn(`❌ Invalid URL: ${websiteUrl}`)
        return null
      }

      const baseUrl = this.getBaseUrl(websiteUrl)
      const pages: ScrapedPage[] = []

      // Try to get sitemap URLs
      const sitemapUrls = await this.fetchSitemap(baseUrl, placeName, country)

      // Determine which URLs to scrape
      let urlsToScrape = sitemapUrls && sitemapUrls.length > 0 ? sitemapUrls : [websiteUrl]

      // Additional language filtering for France: filter out non-French pages from final list
      if (country === 'France' && urlsToScrape.length > 0) {
        const frenchUrls = urlsToScrape.filter((url) => {
          const lowerUrl = url.toLowerCase()
          // Exclude English pages
          const isEnglish =
            lowerUrl.includes('/en/') ||
            lowerUrl.includes('/english/') ||
            lowerUrl.includes('/en-') ||
            lowerUrl.includes('?lang=en') ||
            lowerUrl.includes('&lang=en')

          // Include French pages or pages without language indicators (likely French for French sites)
          const isFrench =
            lowerUrl.includes('/fr/') ||
            lowerUrl.includes('/french/') ||
            lowerUrl.includes('/francais/') ||
            lowerUrl.includes('/fr-') ||
            lowerUrl.includes('?lang=fr') ||
            lowerUrl.includes('&lang=fr')

          return !isEnglish && (isFrench || (!lowerUrl.match(/\/[a-z]{2}\//) && !lowerUrl.match(/[?&]lang=/)))
        })

        if (frenchUrls.length > 0) {
          urlsToScrape = frenchUrls
          console.log(`🇫🇷 Final language filter: ${urlsToScrape.length} French pages selected`)
        }
      }

      console.log(`📄 Will scrape ${urlsToScrape.length} pages`)

      // Scrape each page with a small delay to be respectful
      for (const url of urlsToScrape) {
        const html = await this.fetchPage(url)

        if (html) {
          const text = this.extractTextContent(html)
          if (text && text.length > 100) {
            pages.push({ url, text })
            console.log(`✅ Scraped: ${url} (${text.length} chars)`)
          }
        }

        // Small delay between requests to be respectful
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      if (pages.length === 0) {
        console.warn(`❌ No content extracted from ${websiteUrl}`)
        return null
      }

      // Combine all page texts
      const combinedText = pages
        .map((page, index) => {
          // Add page separator for context
          const pageHeader = `\n\n=== Page ${index + 1}: ${page.url} ===\n\n`
          return pageHeader + page.text
        })
        .join('\n')

      console.log(`✅ Deep scrape complete: ${pages.length} pages, ${combinedText.length} total characters`)

      return combinedText
    } catch (error) {
      console.error(`❌ Error during deep scrape:`, error)
      return null
    }
  }
}

export const deepWebsiteScraperService = new DeepWebsiteScraperService()
