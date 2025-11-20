import * as cheerio from 'cheerio'
import { summarizeWebsiteContent } from '@/services/ai.service'

export class WebsiteScraperService {
  private async fetchWebsiteContent(url: string): Promise<string | null> {
    try {
      console.log(`🌐 Fetching website content from: ${url}`)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EmpreinteBot/1.0; Nature Places Data Enhancement)',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (!response.ok) {
        console.warn(`❌ Failed to fetch ${url}: ${response.status} ${response.statusText}`)
        return null
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('text/html')) {
        console.warn(`❌ Non-HTML content type for ${url}: ${contentType}`)
        return null
      }

      return await response.text()
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        console.warn(`⏰ Timeout fetching ${url}`)
      } else {
        console.warn(`❌ Error fetching ${url}:`, error)
      }
      return null
    }
  }

  private extractTextContent(html: string): string {
    const $ = cheerio.load(html)

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, iframe, noscript').remove()
    $('.menu, .navigation, .sidebar, .ad, .advertisement, .cookie-banner').remove()

    // Try semantic HTML5 first, then fallback
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.main-content',
      '.content',
      '.article-content',
      '#content',
      '.post-content',
    ]

    let content = ''
    for (const selector of contentSelectors) {
      const element = $(selector)
      if (element.length > 0) {
        content = element.text()
        if (content.length > 200) break // Ensure meaningful content
      }
    }

    if (!content || content.length < 200) {
      content = $('body').text()
    }

    // Better text cleaning
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\[.*?\]/g, '') // Remove [citations]
      .replace(/\{.*?\}/g, '') // Remove {annotations}
      .trim()
      .slice(0, 5000)
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  public async scrapeAndSummarizeWebsite(placeName: string, websiteUrl: string): Promise<{ summary: string | null; rawContent: string | null }> {
    try {
      console.log(`🔍 Processing website for place: ${placeName}`)

      if (!this.isValidUrl(websiteUrl)) {
        console.warn(`❌ Invalid URL: ${websiteUrl}`)
        return { summary: null, rawContent: null }
      }

      const html = await this.fetchWebsiteContent(websiteUrl)
      if (!html) {
        console.warn(`❌ Failed to fetch website content for ${websiteUrl}`)
        return { summary: null, rawContent: null }
      }

      const textContent = this.extractTextContent(html)
      if (!textContent || textContent.length < 100) {
        console.warn(`❌ Insufficient content extracted from ${websiteUrl}`)
        return { summary: null, rawContent: null }
      }

      // Always store raw content, with more generous limit for AI processing
      const rawContent = textContent.length > 8000 ? textContent.substring(0, 8000) + '...' : textContent

      console.log(`📄 Extracted ${textContent.length} characters, sending to AI for summarization`)

      const summary = await summarizeWebsiteContent(placeName, textContent)

      if (summary) {
        console.log(`✅ Generated website summary for ${placeName}`)
      } else {
        console.log(`❌ No relevant summary generated for ${placeName}`)
      }

      return { summary, rawContent }
    } catch (error) {
      console.error(`❌ Error processing website for ${placeName}:`, error)
      return { summary: null, rawContent: null }
    }
  }
}

export const websiteScraperService = new WebsiteScraperService()
