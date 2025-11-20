import { formatDateForWikipedia } from '@/services/utils/wikipedia.utils'
import { calculateStringSimilarity } from '@/services/utils/string.utils'
import { SCORE_CONFIG } from '@/services/score-config.service'

interface WikipediaSearchResult {
  query: {
    search: Array<{
      title: string
      pageid: number
    }>
  }
}

interface WikipediaPageResult {
  query: {
    pages: {
      [key: string]: {
        pageid: number
        title: string
        extract?: string
        categories?: Array<{ title: string }>
        length?: number
      }
    }
  }
}

interface WikipediaPageViewsResult {
  items: Array<{
    article: string
    views: number
    timestamp: string
  }>
}

interface WikipediaLangLinksResult {
  query: {
    pages: {
      [key: string]: {
        pageid: number
        title: string
        langlinks?: Array<{
          lang: string
          title: string
        }>
      }
    }
  }
}

interface WikipediaInfoboxResult {
  query: {
    pages: {
      [key: string]: {
        pageid: number
        title: string
        extract?: string
        categories?: Array<{ title: string }>
        length?: number
        revisions?: Array<{
          slots: {
            main: {
              contentformat: string
              contentmodel: string
              '*': string // The actual wikitext content is in the "*" property
            }
          }
        }>
      }
    }
  }
}

export interface WikipediaData {
  page_title: string
  categories: string[]
  first_paragraph: string | null
  infobox_data: Record<string, any> | null
  page_views: number | null
  language_versions: string[]
  score: number
}

export class WikipediaService {
  private parseWikipediaReference(wikipedia: string): { language: string; title: string } | null {
    // Parse format like "fr:Parc regional du Gatinais" or just "Article Name"
    const match = wikipedia.match(/^([a-z]{2}):(.+)$/)
    if (match) {
      return {
        language: match[1],
        title: match[2].trim(),
      }
    }

    // Default to French if no language prefix
    return {
      language: 'fr',
      title: wikipedia.trim(),
    }
  }

  private async searchWikipediaArticle(
    title: string,
    language: string = 'fr',
  ): Promise<{ pageId: number; articleTitle: string } | null> {
    try {
      const baseUrl = `https://${language}.wikipedia.org/w/api.php`

      console.log(`🔍 Searching Wikipedia (${language}) for: ${title}`)

      // First, search for the article
      const searchUrl = `${baseUrl}?action=query&format=json&list=search&srsearch=${encodeURIComponent(title)}&srlimit=1`

      const searchResponse = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'EmpreinteBot/1.0 (Nature Places Data Enhancement)',
        },
      })

      if (!searchResponse.ok) {
        console.warn(`❌ Wikipedia search failed: ${searchResponse.statusText}`)
        return null
      }

      const searchData = (await searchResponse.json()) as WikipediaSearchResult

      if (!searchData.query.search || searchData.query.search.length === 0) {
        console.log(`❌ No Wikipedia article found for: ${title}`)
        return null
      }

      const pageTitle = searchData.query.search[0].title
      const pageId = searchData.query.search[0].pageid
      console.log(`📄 Found Wikipedia article: ${pageTitle} (ID: ${pageId})`)

      return {
        pageId,
        articleTitle: pageTitle,
      }
    } catch (error) {
      console.error(`❌ Error searching Wikipedia for ${title}:`, error)
      return null
    }
  }

  private async fetchPageViews(pageTitle: string, language: string = 'fr'): Promise<number | null> {
    try {
      // Use Wikimedia REST API for page views (yearly average from a year ago to today)
      const today = new Date()
      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      const startDate = formatDateForWikipedia(oneYearAgo)
      const endDate = formatDateForWikipedia(today)

      // Wikipedia pageviews API expects underscores instead of spaces, and proper URL encoding
      const normalizedTitle = pageTitle.replace(/ /g, '_')
      const encodedTitle = encodeURIComponent(normalizedTitle)

      const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${language}.wikipedia/all-access/all-agents/${encodedTitle}/daily/${startDate}/${endDate}`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'EmpreinteBot/1.0 (Nature Places Data Enhancement)',
        },
      })

      if (!response.ok) {
        // Don't log warnings for 404s (page might not have views data yet)
        if (response.status !== 404) {
          const errorText = await response.text().catch(() => 'Unknown error')
          console.warn(
            `⚠️ Could not fetch page views for ${pageTitle} (${response.status}): ${errorText.substring(0, 100)}`,
          )
        }
        return null
      }

      const data = (await response.json()) as WikipediaPageViewsResult
      if (data.items && data.items.length > 0) {
        // Calculate yearly average (total views over the year divided by number of days)
        const totalViews = data.items.reduce((sum: number, item) => sum + (item.views || 0), 0)
        const avgViews = Math.round(totalViews / data.items.length)
        return avgViews > 0 ? avgViews : null
      }

      return null
    } catch (error) {
      // Silently fail - page views are optional
      return null
    }
  }

  private async fetchLanguageVersions(pageId: number, language: string = 'fr'): Promise<string[]> {
    try {
      const baseUrl = `https://${language}.wikipedia.org/w/api.php`
      // Use origin=* for CORS and ensure we get langlinks
      const url = `${baseUrl}?action=query&format=json&pageids=${pageId}&prop=langlinks&lllimit=500&origin=*`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'EmpreinteBot/1.0 (Nature Places Data Enhancement)',
        },
      })

      if (!response.ok) {
        // Silently fail - language versions are optional
        return []
      }

      const data = (await response.json()) as WikipediaLangLinksResult
      if (data.query?.pages && Object.keys(data.query.pages).length > 0) {
        const page = Object.values(data.query.pages)[0]
        if (page?.langlinks && Array.isArray(page.langlinks) && page.langlinks.length > 0) {
          const languages = page.langlinks.map((ll) => ll.lang)
          return languages
        }
      }

      return []
    } catch (error) {
      // Silently fail - language versions are optional
      return []
    }
  }

  private extractInfoboxFromWikitext(wikitext: string): Record<string, any> | null {
    try {
      // Find the start of an infobox
      let startMatch = wikitext.match(/\{\{Infobox\s+[A-Za-zÀ-ÿ\s]+/i) // {{Infobox Aire protégée
      if (!startMatch) {
        startMatch = wikitext.match(/\{\{Infobox[A-Za-zÀ-ÿ]+/i) // {{InfoboxParc (no space)
      }
      if (!startMatch) {
        startMatch = wikitext.match(/\{\{Infobox\s*\|/i) // {{Infobox|... (direct pipe)
      }
      if (!startMatch) {
        startMatch = wikitext.match(/\{\{Infobox\s*\n/i) // {{Infobox\n (newline)
      }

      if (!startMatch) {
        return null
      }

      const startIndex = startMatch.index!
      // Find the matching closing braces by counting nested braces
      let braceCount = 2 // Start with 2 for the opening {{
      let infoboxEndIndex = startIndex

      for (let i = startIndex + 2; i < wikitext.length; i++) {
        if (wikitext[i] === '{' && wikitext[i + 1] === '{') {
          braceCount += 2
          i++ // Skip next character
        } else if (wikitext[i] === '}' && wikitext[i + 1] === '}') {
          braceCount -= 2
          if (braceCount === 0) {
            infoboxEndIndex = i + 2
            break
          }
          i++ // Skip next character
        }
      }

      if (infoboxEndIndex === startIndex) {
        return null
      }

      const infoboxContent = wikitext.substring(startIndex + 2, infoboxEndIndex - 2) // Remove outer {{ and }}

      // Parse fields - handle multiline values and nested templates
      const infoboxData: Record<string, any> = {}
      let currentKey: string | null = null
      let currentValue: string = ''

      // Process line by line
      const lines = infoboxContent.split('\n')
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx]
        const trimmedLine = line.trim()

        // Check if this line starts a new field (|key = value)
        // Must have | at start, then key, then =, then value
        const fieldMatch = trimmedLine.match(/^\|\s*([^=|]+?)\s*=\s*(.*)$/)

        if (fieldMatch) {
          // Save previous field if exists
          if (currentKey && currentValue.trim()) {
            infoboxData[currentKey] = this.cleanInfoboxValue(currentValue.trim())
          }

          // Start new field
          currentKey = fieldMatch[1].trim().toLowerCase().replace(/\s+/g, '_')
          currentValue = fieldMatch[2] || ''
        } else if (currentKey) {
          // Continuation of current value (multiline)
          // Only continue if this line doesn't look like a new field
          // A new field must start with | and contain =
          if (trimmedLine.startsWith('|') && trimmedLine.includes('=')) {
            // This looks like a new field but didn't match - might be malformed
            // Try to save current field and start new one
            if (currentValue.trim()) {
              infoboxData[currentKey] = this.cleanInfoboxValue(currentValue.trim())
            }
            // Try to parse as new field
            const newFieldMatch = trimmedLine.match(/^\|\s*([^=|]+?)\s*=\s*(.*)$/)
            if (newFieldMatch) {
              currentKey = newFieldMatch[1].trim().toLowerCase().replace(/\s+/g, '_')
              currentValue = newFieldMatch[2] || ''
            } else {
              // Malformed, append to current value
              currentValue += ' ' + line
            }
          } else {
            // Continue current value
            if (currentValue) {
              currentValue += ' ' + line.trim()
            } else {
              currentValue = line.trim()
            }
          }
        }
      }

      // Save last field
      if (currentKey && currentValue.trim()) {
        infoboxData[currentKey] = this.cleanInfoboxValue(currentValue.trim())
      }

      return Object.keys(infoboxData).length > 0 ? infoboxData : null
    } catch (error) {
      console.warn(`⚠️ Error extracting infobox:`, error instanceof Error ? error.message : error)
      return null
    }
  }

  /**
   * Clean up infobox value by removing wiki markup while preserving meaningful content
   */
  private cleanInfoboxValue(value: string): string {
    // Remove nested templates recursively by finding matching braces
    let cleaned = value
    let changed = true

    // Iteratively remove templates until no more are found
    while (changed) {
      changed = false
      const beforeLength = cleaned.length

      // Find all {{...}} templates by matching braces
      let result = ''
      let i = 0
      while (i < cleaned.length) {
        if (i < cleaned.length - 1 && cleaned[i] === '{' && cleaned[i + 1] === '{') {
          // Found start of template, find matching end
          let braceDepth = 2
          let j = i + 2
          let templateStart = i

          while (j < cleaned.length - 1 && braceDepth > 0) {
            if (cleaned[j] === '{' && cleaned[j + 1] === '{') {
              braceDepth += 2
              j += 2
            } else if (cleaned[j] === '}' && cleaned[j + 1] === '}') {
              braceDepth -= 2
              if (braceDepth === 0) {
                // Found matching closing braces
                const templateContent = cleaned.substring(templateStart + 2, j)
                const extracted = this.extractTemplateContent(templateContent)
                result += extracted
                changed = true
                i = j + 2
                break
              }
              j += 2
            } else {
              j++
            }
          }

          if (braceDepth > 0) {
            // Unmatched braces, skip
            result += cleaned[i]
            i++
          }
        } else {
          result += cleaned[i]
          i++
        }
      }

      cleaned = result
      if (cleaned.length === beforeLength) {
        break // No more templates found
      }
    }

    // Remove [[links]] but keep display text
    cleaned = cleaned.replace(/\[\[([^\]]+)\]\]/g, (_, link) => {
      const parts = link.split('|')
      return parts[parts.length - 1].trim() // Use display text if available, otherwise link text
    })

    // Remove HTML tags but preserve content
    cleaned = cleaned.replace(/<br\s*\/?>/gi, ' ') // Replace <br> with space
    cleaned = cleaned.replace(/<ref[^>]*>.*?<\/ref>/gi, '') // Remove ref tags
    cleaned = cleaned.replace(/<[^>]+>/g, '') // Remove other HTML tags

    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim()

    return cleaned
  }

  /**
   * Extract meaningful content from a template
   */
  private extractTemplateContent(templateContent: string): string {
    // Split by | to get template name and parameters
    const parts = templateContent.split('|').map((p) => p.trim())
    const templateName = parts[0] || ''

    // Handle common templates
    if (templateName === 'unité' && parts.length >= 3) {
      // {{unité|188|km|2}} -> 188 km²
      return `${parts[1]} ${parts[2]}${parts[3] || ''}`
    }
    if (templateName === 'France' || templateName === 'fr') {
      return 'France'
    }
    if (templateName === 'nobr' && parts.length >= 2) {
      return parts[1]
    }

    // For other templates, return first parameter if available, otherwise template name
    if (parts.length > 1) {
      return parts[1]
    }
    return templateName
  }

  private calculateWikipediaScore(pageViews: number | null, languageVersions: string[]): number {
    // Base score for having a Wikipedia page
    let score = SCORE_CONFIG.wikipedia.hasPage

    // Page views score (logarithmic scale)
    if (pageViews) {
      if (pageViews >= 10000) {
        score += SCORE_CONFIG.wikipedia.pageViews.high
      } else if (pageViews >= 1000) {
        score += SCORE_CONFIG.wikipedia.pageViews.medium
      } else if (pageViews >= 100) {
        score += SCORE_CONFIG.wikipedia.pageViews.low
      }
    }

    // Language versions score
    const numLanguages = languageVersions.length
    if (numLanguages >= 10) {
      score += SCORE_CONFIG.wikipedia.languageVersions.high
    } else if (numLanguages >= 5) {
      score += SCORE_CONFIG.wikipedia.languageVersions.medium
    } else if (numLanguages >= 2) {
      score += SCORE_CONFIG.wikipedia.languageVersions.low
    }

    return score
  }

  private async fetchWikipediaData(
    pageId: number,
    pageTitle: string,
    language: string = 'fr',
  ): Promise<WikipediaData | null> {
    try {
      const baseUrl = `https://${language}.wikipedia.org/w/api.php`

      // Fetch page content, categories, and wikitext in parallel
      const [contentResponse, categoriesResponse, wikitextResponse] = await Promise.all([
        // Get first paragraph (intro)
        fetch(
          `${baseUrl}?action=query&format=json&pageids=${pageId}&prop=extracts&exintro=1&explaintext=1&exsectionformat=plain`,
          {
            headers: {
              'User-Agent': 'EmpreinteBot/1.0 (Nature Places Data Enhancement)',
            },
          },
        ),
        // Get categories
        fetch(`${baseUrl}?action=query&format=json&pageids=${pageId}&prop=categories&cllimit=50`, {
          headers: {
            'User-Agent': 'EmpreinteBot/1.0 (Nature Places Data Enhancement)',
          },
        }),
        // Get wikitext for infobox extraction
        // Use rvslots=* to get all slots, and ensure we get the latest revision
        fetch(
          `${baseUrl}?action=query&format=json&pageids=${pageId}&prop=revisions&rvprop=content&rvslots=main&rvlimit=1`,
          {
            headers: {
              'User-Agent': 'EmpreinteBot/1.0 (Nature Places Data Enhancement)',
            },
          },
        ),
      ])

      if (!contentResponse.ok) {
        console.warn(`❌ Wikipedia content fetch failed`)
        return null
      }

      const contentData = (await contentResponse.json()) as WikipediaPageResult
      const pages = contentData.query.pages
      // Page ID might be string or number key
      const page = pages[pageId.toString()] || pages[pageId] || Object.values(pages)[0]

      if (!page || !page.extract) {
        console.log(`❌ No extract available for Wikipedia article: ${pageTitle}`)
        return null
      }

      // Extract first paragraph (usually the intro)
      const firstParagraph = page.extract.split('\n\n')[0] || page.extract.substring(0, 500) || null

      // Get total length
      const totalLength = page.length || page.extract.length

      // Extract categories
      let categories: string[] = []
      if (categoriesResponse.ok) {
        try {
          const categoriesData = (await categoriesResponse.json()) as WikipediaPageResult
          const categoryPage =
            categoriesData.query.pages[pageId.toString()] ||
            categoriesData.query.pages[pageId] ||
            Object.values(categoriesData.query.pages)[0]
          if (categoryPage?.categories) {
            categories = categoryPage.categories
              .map((cat) => cat.title.replace(/^Category:/, ''))
              .filter((cat) => !cat.includes('articles') && !cat.includes('stubs'))
          }
        } catch (error) {
          console.warn(`⚠️ Error parsing categories:`, error)
        }
      }

      // Extract infobox from wikitext
      let infoboxData: Record<string, any> | null = null
      if (wikitextResponse.ok) {
        try {
          const wikitextData = (await wikitextResponse.json()) as WikipediaInfoboxResult
          const wikitextPage =
            wikitextData.query.pages[pageId.toString()] ||
            wikitextData.query.pages[pageId] ||
            Object.values(wikitextData.query.pages)[0]
          const wikitextContent = wikitextPage?.revisions?.[0]?.slots?.main?.['*']
          if (wikitextContent) {
            const wikitext = wikitextContent
            // Check if infobox exists in wikitext before trying to extract
            const hasInfobox = /\{\{Infobox/i.test(wikitext)
            if (hasInfobox) {
              infoboxData = this.extractInfoboxFromWikitext(wikitext)
              if (!infoboxData) {
                // Debug: find where infobox starts
                const infoboxMatch = wikitext.match(/\{\{Infobox[^\n]*/i)
                if (infoboxMatch) {
                  const startIdx = infoboxMatch.index || 0
                  const sample = wikitext.substring(startIdx, Math.min(startIdx + 1000, wikitext.length))
                  console.warn(`⚠️ Infobox found but extraction failed. Sample: ${sample.substring(0, 500)}...`)
                }
              } else {
                console.log(`✅ Extracted infobox with ${Object.keys(infoboxData).length} fields`)
              }
            }
            // Note: Not all Wikipedia articles have infoboxes, so we silently continue if none is found
          } else {
            console.warn(`⚠️ No wikitext content available for infobox extraction`)
          }
        } catch (error) {
          console.warn(`⚠️ Error extracting infobox:`, error instanceof Error ? error.message : error)
        }
      } else {
        console.warn(`⚠️ Could not fetch wikitext for infobox extraction (status: ${wikitextResponse.status})`)
      }

      // Fetch page views and language versions in parallel
      const [pageViews, languageVersions] = await Promise.all([
        this.fetchPageViews(pageTitle, language),
        this.fetchLanguageVersions(pageId, language),
      ])

      // Calculate score
      const score = this.calculateWikipediaScore(pageViews, languageVersions)

      return {
        page_title: pageTitle,
        categories,
        first_paragraph: firstParagraph,
        infobox_data: infoboxData,
        page_views: pageViews,
        language_versions: languageVersions,
        score,
      }
    } catch (error) {
      console.error(`❌ Error fetching Wikipedia data for ${pageTitle}:`, error)
      return null
    }
  }

  public async fetchWikipediaDataByReference(wikipediaReference: string): Promise<WikipediaData | null> {
    try {
      console.log(`🔍 Processing Wikipedia info for reference: ${wikipediaReference}`)

      const parsed = this.parseWikipediaReference(wikipediaReference)
      if (!parsed) {
        console.warn(`❌ Invalid Wikipedia reference format: ${wikipediaReference}`)
        return null
      }

      const searchResult = await this.searchWikipediaArticle(parsed.title, parsed.language)

      if (!searchResult) {
        return null
      }

      const wikipediaData = await this.fetchWikipediaData(
        searchResult.pageId,
        searchResult.articleTitle,
        parsed.language,
      )

      return wikipediaData
    } catch (error) {
      console.error(`❌ Error processing Wikipedia for ${wikipediaReference}:`, error)
      return null
    }
  }

  public async searchWikipediaByPlaceName(placeName: string): Promise<WikipediaData | null> {
    try {
      console.log(`🔍 Searching Wikipedia by place name: ${placeName}`)

      const languages = ['fr', 'en']
      const minSimilarityThreshold = 0.7

      for (const language of languages) {
        const searchResult = await this.searchWikipediaArticle(placeName, language)
        if (searchResult) {
          const similarity = calculateStringSimilarity(placeName, searchResult.articleTitle)
          console.log(`📄 Found Wikipedia article in ${language}: "${searchResult.articleTitle}" (similarity: ${similarity.toFixed(2)})`)

          if (similarity < minSimilarityThreshold) {
            console.log(`⚠️ Skipping - similarity too low (${similarity.toFixed(2)} < ${minSimilarityThreshold})`)
            continue
          }

          const wikipediaData = await this.fetchWikipediaData(searchResult.pageId, searchResult.articleTitle, language)

          if (wikipediaData) {
            return wikipediaData
          }
        }
      }

      console.log(`❌ No relevant Wikipedia content found for ${placeName}`)
      return null
    } catch (error) {
      console.error(`❌ Error searching Wikipedia for ${placeName}:`, error)
      return null
    }
  }
}

export const wikipediaService = new WikipediaService()
