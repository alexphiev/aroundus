import * as cheerio from 'cheerio'
import { batchGetOrCreateGeneratedPlaces } from '@/services/db/generated-places'
import { getOrCreateSource, updateSource } from '@/services/db/sources'
import { cleanText } from '@/services/utils/text-cleaner'
import { ExtractedPlace, extractPlacesFromUrlContent } from '@/services/ai.service'

export interface UrlAnalysisResult {
  sourceId: string
  url: string
  places: ExtractedPlace[]
}

export interface UrlAnalysisOptions {
  bypassCache?: boolean
}

/**
 * Scrapes a single URL and extracts text content
 */
async function scrapeSingleUrl(url: string): Promise<string | null> {
  try {
    console.log(`🌐 Scraping URL: ${url}`)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EmpreinteBot/1.0; Nature Places Data Enhancement)',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error(`❌ Failed to fetch URL ${url}: ${response.status} ${response.statusText}`)
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove script and style elements
    $('script, style, nav, header, footer, aside').remove()

    // Extract text content
    const text = $('body').text() || $('main').text() || $('article').text() || ''

    // Clean the text
    const cleanedText = cleanText(text)

    console.log(`✅ Scraped ${cleanedText.length} characters from ${url}`)
    return cleanedText
  } catch (error) {
    console.error(`❌ Error scraping URL ${url}:`, error)
    return null
  }
}

/**
 * Core URL analysis logic - shared between API and scripts
 * Analyzes a list of URLs and extracts nature places from them
 */
export async function analyzeUrlsCore(
  urls: string[],
  options: UrlAnalysisOptions = {},
): Promise<{ results: UrlAnalysisResult[]; error: string | null }> {
  if (!urls || urls.length === 0) {
    return {
      results: [],
      error: 'At least one URL is required',
    }
  }

  const results: UrlAnalysisResult[] = []

  for (const url of urls) {
    try {
      console.log(`\n--- Analyzing URL: ${url} ---`)

      // Step 1: Get or create source
      console.log('📝 Step 1: Getting or creating source...')
      const sourceResponse = await getOrCreateSource(url)

      if (sourceResponse.error || !sourceResponse.data) {
        console.error(`❌ Failed to get or create source for ${url}:`, sourceResponse.error)
        continue
      }

      const source = sourceResponse.data
      console.log(`✅ Source ID: ${source.id}`)

      const bypassCache = options.bypassCache || false

      // Step 2: Check cache or scrape URL content
      console.log(`\n--- Step 2: Fetching URL Content ---`)
      let urlContent: string | null = null

      // Check if we have cached raw content (and not bypassing cache)
      if (!bypassCache && source.raw_content && source.raw_content.trim().length > 0) {
        console.log(`✅ Using cached raw content (${source.raw_content.length} chars)`)
        urlContent = source.raw_content
      } else {
        if (bypassCache) {
          console.log(`🔄 Cache bypassed, scraping URL...`)
        } else {
          console.log(`🔍 No cache found, scraping URL...`)
        }

        // Scrape URL content
        urlContent = await scrapeSingleUrl(url)

        if (!urlContent || urlContent.trim().length === 0) {
          console.warn(`⚠️  No content extracted from ${url}, skipping...`)
          continue
        }

        // Clean and store raw content in cache
        const cleanedRawContent = cleanText(urlContent)
        urlContent = cleanedRawContent

        // Store cleaned raw content in cache
        const updateResult = await updateSource(source.id, { raw_content: cleanedRawContent })
        if (updateResult.error) {
          console.error(`❌ Failed to save raw content to database:`, updateResult.error)
          console.error(`   Error message:`, updateResult.error.message)
          console.error(`   Error details:`, JSON.stringify(updateResult.error, null, 2))
        } else {
          console.log(`💾 Cached cleaned raw content (${cleanedRawContent.length} chars)`)
        }
      }

      // Ensure we have content before proceeding
      if (!urlContent || urlContent.trim().length === 0) {
        console.warn(`⚠️  No content available for ${url}, skipping...`)
        continue
      }

      console.log(`✅ Content ready: ${urlContent.length} characters`)

      // Step 3: Extract places using AI
      console.log('🤖 Step 3: Extracting places with AI...')
      const extractedPlaces = await extractPlacesFromUrlContent(urlContent)

      if (extractedPlaces.length === 0) {
        console.warn(`⚠️  No places extracted from ${url}`)
        results.push({
          sourceId: source.id,
          url: url,
          places: [],
        })
        continue
      }

      console.log(`✅ Extracted ${extractedPlaces.length} places from ${url}`)

      // Step 4: Store generated places in database
      console.log('💾 Step 4: Storing generated places in database...')
      const placesToStore = extractedPlaces.map((place) => ({
        name: place.name,
        description: place.description,
        source_id: source.id,
      }))

      const storedPlaces = await batchGetOrCreateGeneratedPlaces(placesToStore)
      console.log(`✅ Stored ${storedPlaces.length} places in database`)

      results.push({
        sourceId: source.id,
        url: url,
        places: extractedPlaces,
      })
    } catch (error) {
      console.error(`❌ Error analyzing URL ${url}:`, error)
      // Continue with next URL instead of failing completely
    }
  }

  return {
    results,
    error: null,
  }
}
