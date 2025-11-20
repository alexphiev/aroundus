import { GoogleGenAI, type GenerateContentResponse } from '@google/genai'

// Rate limits for Gemma model: 30 RPM and 15,000 TPM
// We add a 2 second delay after each request to stay well under these limits
const AI_REQUEST_DELAY_MS = 2000 // 2 seconds delay between requests
const MAX_RETRY_ATTEMPTS = 5 // Maximum number of retry attempts for rate limit errors
const BASE_RETRY_DELAY_MS = 1000 // Base delay for exponential backoff (1 second)

// Module-level initialization - most performant for server actions
let genAI: GoogleGenAI | null = null
let initialized = false
let initError: string | null = null

// Use working model names that exist in the API
enum MODEL {
  GEMMA = 'gemma-3-27b-it',
}

// Helper function to extract text from AI response with simplified fallbacks
function extractResponseText(result: GenerateContentResponse): string {
  // Type guard for expected response structure
  const isValidCandidate = (candidate: unknown): candidate is { content: { parts: { text: string }[] } } => {
    return (
      typeof candidate === 'object' &&
      candidate !== null &&
      'content' in candidate &&
      typeof candidate.content === 'object' &&
      candidate.content !== null &&
      'parts' in candidate.content &&
      Array.isArray(candidate.content.parts) &&
      candidate.content.parts.length > 0 &&
      typeof candidate.content.parts[0] === 'object' &&
      candidate.content.parts[0] !== null &&
      'text' in candidate.content.parts[0] &&
      typeof candidate.content.parts[0].text === 'string'
    )
  }

  // Check standard response structure
  if (
    typeof result === 'object' &&
    result !== null &&
    'candidates' in result &&
    Array.isArray(result.candidates) &&
    result.candidates.length > 0
  ) {
    const candidate = result.candidates[0]
    if (isValidCandidate(candidate)) {
      return candidate.content.parts[0].text
    }
  }

  // Check for alternative text property
  if (typeof result === 'object' && result !== null && 'text' in result && typeof result.text === 'string') {
    return result.text
  }

  throw new Error('No valid text content found in AI response')
}

function initializeGenAI(): void {
  if (initialized) return

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY

  if (!GEMINI_API_KEY) {
    initError = 'AI service is not configured. Missing GEMINI_API_KEY environment variable.'
    initialized = true
    return
  }

  try {
    genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
    initialized = true
  } catch (error) {
    console.error('Failed to initialize Google GenAI:', error)
    initError = 'Failed to initialize AI service.'
    initialized = true
  }
}

// Initialize on module load
initializeGenAI()

export function getGenAI(): GoogleGenAI | null {
  if (!initialized) initializeGenAI()
  return genAI
}

export function isAIAvailable(): boolean {
  if (!initialized) initializeGenAI()
  return genAI !== null
}

export function getAIError(): string | null {
  if (!initialized) initializeGenAI()
  return initError
}

/**
 * Extracts retry delay from a rate limit error
 * @param error The error object from the API
 * @returns Retry delay in milliseconds, or null if not found
 */
function extractRetryDelay(error: unknown): number | null {
  try {
    // Check if error has the expected structure
    if (typeof error !== 'object' || error === null) {
      return null
    }

    const err = error as any

    // Check for RetryInfo in error.details or error.error.details
    const details = err.details || err.error?.details || []
    for (const detail of details) {
      if (detail?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' && detail.retryDelay) {
        // retryDelay can be a string like "15s" or an object with seconds/nanos
        if (typeof detail.retryDelay === 'string') {
          // Parse string format like "15s" or "15.5s"
          const match = detail.retryDelay.match(/(\d+(?:\.\d+)?)s?/)
          if (match) {
            const seconds = parseFloat(match[1])
            return Math.ceil(seconds * 1000) // Convert to milliseconds, round up
          }
        } else if (typeof detail.retryDelay === 'object' && detail.retryDelay.seconds) {
          // Object format with seconds and nanos
          const seconds = parseInt(detail.retryDelay.seconds, 10) || 0
          const nanos = parseInt(detail.retryDelay.nanos, 10) || 0
          return Math.ceil(seconds * 1000 + nanos / 1000000) // Convert to milliseconds
        }
      }
    }

    // Try to extract from error message (fallback)
    const errorMessage = err.message || err.error?.message || ''
    const messageMatch = errorMessage.match(/Please retry in ([\d.]+)s/i)
    if (messageMatch) {
      const seconds = parseFloat(messageMatch[1])
      return Math.ceil(seconds * 1000) // Convert to milliseconds, round up
    }

    return null
  } catch {
    return null
  }
}

/**
 * Checks if an error is a rate limit error (429)
 * @param error The error object from the API
 * @returns True if it's a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  try {
    if (typeof error !== 'object' || error === null) {
      return false
    }

    const err = error as any
    const code = err.code || err.error?.code || err.status || err.error?.status
    const status = err.status || err.error?.status

    // Check for 429 status code or RESOURCE_EXHAUSTED status
    return (
      code === 429 ||
      code === 'RESOURCE_EXHAUSTED' ||
      status === 429 ||
      status === 'RESOURCE_EXHAUSTED' ||
      (typeof err.message === 'string' && err.message.includes('quota') && err.message.includes('exceeded'))
    )
  } catch {
    return false
  }
}

/**
 * Helper function to call AI with retry logic and delay after the request
 * Adds a 2 second delay after each request to respect rate limits (30 RPM, 15,000 TPM)
 * Implements retry mechanism with exponential backoff for rate limit errors
 */
async function generateContentWithDelay(options: { model: MODEL; contents: any[] }): Promise<GenerateContentResponse> {
  const genAI = getGenAI()
  if (!genAI) {
    throw new Error('AI service is not available')
  }

  let lastError: unknown = null

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // Make the API call
      const result = await genAI.models.generateContent({
        model: options.model,
        contents: options.contents,
      })

      // Add delay after request to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, AI_REQUEST_DELAY_MS))

      return result
    } catch (error) {
      lastError = error

      // Check if it's a rate limit error
      if (isRateLimitError(error)) {
        const retryDelay = extractRetryDelay(error)
        let delayMs: number

        if (retryDelay !== null) {
          // Use the retry delay from the error
          delayMs = retryDelay
          console.warn(
            `⚠️  Rate limit exceeded (429). API suggests retry in ${retryDelay}ms. Attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`,
          )
        } else {
          // Fallback to exponential backoff
          delayMs = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1), 60000) // Max 60 seconds
          console.warn(
            `⚠️  Rate limit exceeded (429). Using exponential backoff: ${delayMs}ms. Attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`,
          )
        }

        // Log error details for debugging
        if (attempt === 1) {
          const errorDetails = (error as any)?.error || error
          console.error('Rate limit error details:', {
            code: errorDetails?.code,
            status: errorDetails?.status,
            message: errorDetails?.message?.substring(0, 200), // Truncate long messages
          })
        }

        // If this is the last attempt, throw the error
        if (attempt === MAX_RETRY_ATTEMPTS) {
          console.error(`❌ All ${MAX_RETRY_ATTEMPTS} retry attempts exhausted for rate limit error`)
          throw error
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }

      // For non-rate-limit errors, throw immediately
      throw error
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Unexpected error in generateContentWithDelay')
}

function createEnhancementPrompt(
  placeName: string,
  contentType: string,
  content: string,
  focusAreas: string[],
): string {
  const focusAreasText = focusAreas.map((area) => `- ${area}`).join('\n')

  return `Tu aides à enrichir les informations sur un lieu pour une application de découverte de la nature et du plein air.

Nom du lieu : ${placeName}
${contentType} : ${content}

Analyse ce ${contentType.toLowerCase()} et fournis un résumé qui inclut UNIQUEMENT les informations pertinentes pour quelqu'un qui visite ce lieu de nature/plein air. Concentre-toi sur :
${focusAreasText}

IMPORTANT : 
- N'inclus que les informations clairement pertinentes et utiles pour les visiteurs.
- Si le contenu n'est pas pertinent pour le voyage, les activités de plein air/nature ou la planification de visite, réponds avec "NO_RELEVANT_INFO".
- Nous préférons aucune information plutôt que des informations non pertinentes ou de mauvaise qualité.
- Toutes tes réponses doivent être en français.
- **RÈGLE ABSOLUE DE LONGUEUR** : Ton résumé NE DOIT JAMAIS être plus long que le contenu source fourni. Si le contenu source fait 300 caractères, ton résumé doit faire maximum 300 caractères. Si le contenu source fait 5000 caractères, tu peux créer un résumé de 1500-2000 caractères. ADAPTE toujours la longueur de ton résumé à la longueur du contenu source.`
}

export async function summarizeWebsiteContent(placeName: string, websiteContent: string): Promise<string | null> {
  const genAI = getGenAI()
  if (!genAI) {
    throw new Error('AI service is not available')
  }

  const prompt = createEnhancementPrompt(placeName, 'Contenu du site web', websiteContent, [
    'Activités clés disponibles',
    'Informations importantes pour les visiteurs (horaires, tarifs, accessibilité)',
    'Caractéristiques ou attractions notables',
    'Informations saisonnières si pertinentes',
  ])

  const contents = [{ role: 'user', parts: [{ text: prompt }] }]

  try {
    // First attempt with grounding tools
    const result = await generateContentWithDelay({
      model: MODEL.GEMMA,
      contents: contents,
    })

    let responseText: string
    try {
      responseText = extractResponseText(result).trim()
    } catch (extractError) {
      // Retry without grounding tools if text extraction fails
      console.warn('First attempt failed, retrying without grounding tools...', extractError)

      const fallbackResult = await generateContentWithDelay({
        model: MODEL.GEMMA,
        contents: contents,
      })

      console.log('🤖 Fallback Gemma response:', JSON.stringify(fallbackResult, null, 2))
      responseText = extractResponseText(fallbackResult).trim()
      console.log('📝 Fallback extracted response text:', responseText)
    }

    if (!responseText || responseText === 'NO_RELEVANT_INFO') {
      console.log('❌ AI returned no relevant info or empty response')
      return null
    }

    console.log('✅ AI processing successful')
    return responseText
  } catch (error) {
    console.error('Error summarizing website content:', error)
    return null
  }
}

export async function checkRedditRelevance(
  placeName: string,
  threads: Array<{ title: string; comments: string[] }>,
): Promise<Array<{ title: string; comments: string[]; isRelevant: boolean }>> {
  const genAI = getGenAI()
  if (!genAI) {
    throw new Error('AI service is not available')
  }

  const results: Array<{ title: string; comments: string[]; isRelevant: boolean }> = []

  for (const thread of threads) {
    const previewComments = thread.comments.slice(0, 3)
    const previewText = `Titre : ${thread.title}\nCommentaires échantillons : ${previewComments.join(' | ')}`

    const prompt = `Tu aides à filtrer les discussions Reddit pour une application de découverte de la nature et du plein air.

Nom du lieu : ${placeName}

Aperçu du fil de discussion Reddit :
${previewText}

Ce fil de discussion Reddit concerne-t-il SPÉCIFIQUEMENT la visite, la découverte ou l'expérience de "${placeName}" en tant que lieu de nature/plein air ?
Réponds UNIQUEMENT par "YES" ou "NO".

Réponds "YES" uniquement si :
- Le fil concerne clairement ce lieu spécifique
- Il contient des expériences de visiteurs, des conseils ou des recommandations
- Il discute d'activités de nature/plein air à ce lieu

Réponds "NO" si :
- Il s'agit d'un autre lieu avec un nom similaire
- Il n'est que tangentiellement lié
- Il ne concerne pas les activités de nature/plein air
- Le lieu n'est mentionné qu'en passant

IMPORTANT : Réponds uniquement "YES" ou "NO", rien d'autre.`

    const contents = [{ role: 'user', parts: [{ text: prompt }] }]

    try {
      const result = await generateContentWithDelay({
        model: MODEL.GEMMA,
        contents: contents,
      })

      const responseText = extractResponseText(result).trim().toUpperCase()
      const isRelevant = responseText.includes('YES')

      results.push({
        title: thread.title,
        comments: thread.comments,
        isRelevant,
      })

      console.log(`  ${isRelevant ? '✅' : '❌'} Thread relevance check: "${thread.title.slice(0, 60)}..."`)
    } catch (error) {
      console.error('Error checking Reddit relevance:', error)
      results.push({
        title: thread.title,
        comments: thread.comments,
        isRelevant: false,
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  return results
}

export async function summarizeRedditContent(
  placeName: string,
  redditData: { threads: Array<{ title: string; comments: string[] }> },
): Promise<string | null> {
  const genAI = getGenAI()
  if (!genAI) {
    throw new Error('AI service is not available')
  }

  console.log(`🔍 Stage 1: Checking relevance of ${redditData.threads.length} threads...`)
  const checkedThreads = await checkRedditRelevance(placeName, redditData.threads)

  const relevantThreads = checkedThreads.filter((t) => t.isRelevant)

  if (relevantThreads.length === 0) {
    console.log('❌ No relevant threads found after filtering')
    return null
  }

  console.log(`✅ Found ${relevantThreads.length} relevant threads, proceeding to summarization...`)

  const threadsText = relevantThreads
    .map((thread, i) => `Fil ${i + 1} : ${thread.title}\nCommentaires : ${thread.comments.join(' | ')}`)
    .join('\n\n')

  const prompt = createEnhancementPrompt(placeName, 'Discussions Reddit', threadsText, [
    'Conseils et expériences de visiteurs',
    'Meilleurs moments pour visiter',
    'Points à surveiller',
    "Recommandations d'activités",
  ])

  const contents = [{ role: 'user', parts: [{ text: prompt }] }]

  try {
    const result = await generateContentWithDelay({
      model: MODEL.GEMMA,
      contents: contents,
    })

    const responseText = extractResponseText(result).trim()

    if (!responseText || responseText === 'NO_RELEVANT_INFO') {
      return null
    }

    return responseText
  } catch (error) {
    console.error('Error summarizing Reddit content:', error)
    return null
  }
}

export async function summarizeWikipediaContent(placeName: string, wikipediaContent: string): Promise<string | null> {
  const genAI = getGenAI()
  if (!genAI) {
    throw new Error('AI service is not available')
  }

  const prompt = createEnhancementPrompt(placeName, 'Contenu Wikipedia', wikipediaContent, [
    'Caractéristiques géographiques et naturelles',
    'Signification historique ou culturelle',
    'Activités disponibles',
    "Informations d'accès",
  ])

  const contents = [{ role: 'user', parts: [{ text: prompt }] }]

  try {
    // First attempt with grounding tools
    const result = await generateContentWithDelay({
      model: MODEL.GEMMA,
      contents: contents,
    })

    let responseText: string
    try {
      responseText = extractResponseText(result).trim()
    } catch (extractError) {
      // Retry without grounding tools if text extraction fails
      console.warn('Wikipedia AI processing failed, retrying without grounding tools...')

      const fallbackResult = await generateContentWithDelay({
        model: MODEL.GEMMA,
        contents: contents,
      })

      responseText = extractResponseText(fallbackResult).trim()
    }

    if (!responseText || responseText === 'NO_RELEVANT_INFO') {
      return null
    }

    // Warn if summary is longer than expected, but don't truncate
    if (responseText.length > 2000) {
      console.warn(
        `⚠️  Generated Wikipedia summary exceeds 2000 chars (${responseText.length}). Consider reviewing the prompt.`,
      )
    }

    return responseText
  } catch (error) {
    console.error('Error summarizing Wikipedia content:', error)
    return null
  }
}

export interface PlaceAnalysisResult {
  description: string
  mentionedPlaces: string[]
}

/**
 * Uses LLM to filter which sitemap URLs are most relevant for scraping
 * @param placeName The name of the place being analyzed
 * @param sitemapUrls Array of URLs from the sitemap
 * @param maxUrls Maximum number of URLs to return (default: 10)
 * @param country Optional country code (e.g., "France") to prioritize language-specific pages
 * @returns Array of filtered URLs that are most relevant
 */
export async function filterRelevantSitemapUrls(
  placeName: string,
  sitemapUrls: string[],
  maxUrls: number = 10,
  country?: string | null,
): Promise<string[]> {
  const genAI = getGenAI()
  if (!genAI) {
    throw new Error('AI service is not available')
  }

  // If we have fewer URLs than max, return all
  if (sitemapUrls.length <= maxUrls) {
    return sitemapUrls
  }

  console.log(`🤖 Using LLM to filter ${sitemapUrls.length} sitemap URLs down to ${maxUrls} most relevant...`)

  const urlsList = sitemapUrls.map((url, index) => `${index + 1}. ${url}`).join('\n')

  // Language preference based on country
  const languageNote =
    country === 'France'
      ? "\n\nIMPORTANT : Ce lieu est situé en France. PRIORISE FORTEMENT les pages en français (URLs contenant /fr/, /french/, ou des indicateurs de langue française). Exclus les pages en anglais ou autres langues sauf s'il n'existe pas d'alternatives françaises."
      : ''

  const prompt = `Tu aides à analyser le site web d'un lieu de nature et de plein air pour une application de découverte.

Nom du lieu : ${placeName}${country ? `\nPays : ${country}` : ''}
URLs du sitemap trouvées : ${sitemapUrls.length} URLs${languageNote}

Voici les URLs du sitemap :
${urlsList}

Analyse ces URLs et sélectionne les ${maxUrls} pages les plus pertinentes qui contiendraient des informations utiles sur ce lieu de nature/plein air. Priorise les pages dans cet ordre :

1. **Pages liées à la nature** - Pages spécifiquement sur les caractéristiques naturelles, paysages, faune, écosystèmes
2. **Pages d'information décrivant le lieu** - Pages de présentation, pages "à propos", descriptions du lieu, que voir/faire
3. **Guides et conseils pour visiteurs** - Pages avec des conseils sur comment visiter, profiter et découvrir le lieu (guides de sentiers, conseils de visite, bonnes pratiques, quoi apporter, quand visiter)

Concentre-toi sur les pages qui contiennent probablement :
- Des descriptions détaillées du lieu et de ses caractéristiques naturelles
- Des informations sur les activités disponibles (randonnée, observation de la faune, photographie, etc.)
- Des informations pour les visiteurs (horaires, tarifs, accès, parking, équipements)
- Des conseils et guides pour la visite (quoi apporter, meilleurs moments pour visiter, recommandations de sentiers)
- Des attractions naturelles et points d'intérêt
- Des informations de sécurité et réglementations

Évite les pages comme :
- Pages légales/conditions
- Politique de confidentialité
- Articles de blog génériques non spécifiquement sur le lieu
- Formulaires de contact
- Pages d'achat/panier
- Archives d'actualités ou communiqués de presse
- Pages d'information génériques
- Pages sur d'autres lieux ou sujets non liés

Retourne UNIQUEMENT un tableau JSON des URLs sélectionnées (exactement ${maxUrls} URLs), dans l'ordre de pertinence. Format :
["url1", "url2", "url3", ...]

IMPORTANT : Toutes tes réponses doivent être en français. Réponse :`

  const contents = [{ role: 'user', parts: [{ text: prompt }] }]

  try {
    const result = await generateContentWithDelay({
      model: MODEL.GEMMA,
      contents: contents,
    })

    let responseText: string
    try {
      responseText = extractResponseText(result).trim()
    } catch (extractError) {
      console.warn('First attempt failed, retrying without grounding tools...', extractError)
      const fallbackResult = await generateContentWithDelay({
        model: MODEL.GEMMA,
        contents: contents,
      })
      responseText = extractResponseText(fallbackResult).trim()
    }

    if (!responseText) {
      console.warn('❌ LLM returned empty response, using first N URLs')
      return sitemapUrls.slice(0, maxUrls)
    }

    // Try to extract JSON array from response
    let jsonText = responseText
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    const parsed = JSON.parse(jsonText) as string[]

    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn('❌ LLM returned invalid format, using first N URLs')
      return sitemapUrls.slice(0, maxUrls)
    }

    // Validate URLs exist in original list
    const validUrls = parsed.filter((url) => sitemapUrls.includes(url))
    if (validUrls.length === 0) {
      console.warn('❌ LLM returned URLs not in original list, using first N URLs')
      return sitemapUrls.slice(0, maxUrls)
    }

    console.log(`✅ LLM filtered to ${validUrls.length} relevant URLs`)
    return validUrls.slice(0, maxUrls)
  } catch (error) {
    console.error('Error filtering sitemap URLs with LLM:', error)
    console.warn('⚠️ Falling back to first N URLs')
    return sitemapUrls.slice(0, maxUrls)
  }
}

/**
 * Summarizes scraped website content, keeping only relevant information about the place
 * @param placeName The name of the place being analyzed
 * @param scrapedContent The combined text content from scraped website pages
 * @returns Summary string focused on nature features and relevant information, or null if analysis fails
 */
export async function summarizeScrapedContent(placeName: string, scrapedContent: string): Promise<string | null> {
  const genAI = getGenAI()
  if (!genAI) {
    throw new Error('AI service is not available')
  }

  const prompt = `Tu aides à analyser des lieux de nature et de plein air pour une application de découverte.

Nom du lieu : ${placeName}
Contenu du site web scrapé : ${scrapedContent.substring(0, 30000)}

Analyse ce contenu et fournis un résumé COMPLET et DÉTAILLÉ qui inclut TOUTES les informations pertinentes pour les amateurs de nature/plein air visitant ce lieu. 

**LONGUEUR CIBLE : Viser environ 2000 caractères** - ce n'est PAS un résumé bref. Tu dois extraire et synthétiser TOUTES les informations pertinentes du contenu. Le résumé doit être approfondi, informatif et complet, couvrant :

1. **Caractéristiques naturelles et paysages** : Décris l'environnement naturel, la géographie, les écosystèmes, la flore, la faune, les caractéristiques géologiques, la biodiversité, les caractéristiques naturelles uniques
2. **Histoire et signification** : Contexte historique, importance culturelle, statut de désignation (parc national, réserve naturelle, etc.), événements ou figures historiques notables associés au lieu
3. **Activités et expériences** : TOUTES les activités disponibles (randonnée, observation de la faune, photographie, camping, observation d'oiseaux, etc.), sentiers spécifiques, itinéraires, points de vue, visites guidées, programmes éducatifs
4. **Accès et aspects pratiques** : 
   - Comment s'y rendre (directions détaillées, options de transport, coordonnées GPS si mentionnées)
   - Horaires d'ouverture et saisons (quand accessible, meilleures saisons)
   - Tarifs et permis (frais d'entrée, frais de parking, permis requis)
   - Parking et équipements (emplacements de parking, toilettes, centres d'accueil, aires de pique-nique)
   - Informations d'accessibilité (accès fauteuil roulant, niveaux de difficulté)
5. **Informations pour visiteurs** : 
   - Meilleurs moments pour visiter (saisons, moments de la journée, considérations météorologiques)
   - Quoi apporter (équipement recommandé, vêtements, fournitures)
   - Considérations de sécurité (dangers, avertissements météo, précautions faune)
   - Règlementations et règles (ce qui est autorisé/interdit, zones protégées)
   - Informations de contact si pertinentes (centre d'accueil, bureau du parc, contacts d'urgence)
6. **Attractions notables** : Points d'intérêt spécifiques, repères, points de vue, sentiers, zones à explorer, caractéristiques incontournables
7. **Ce qui le rend spécial** : Caractéristiques uniques, pourquoi les visiteurs devraient venir ici, ce qui distingue ce lieu

**INSTRUCTIONS CRITIQUES :**
- **EXIGENCE DE LONGUEUR ABSOLUE** : Ton résumé NE DOIT JAMAIS être plus long que le contenu source fourni. Si le contenu source fait 500 caractères, ton résumé doit faire maximum 500 caractères. Si le contenu source fait 3000 caractères, tu peux viser 1500-2000 caractères. ADAPTE la longueur de ton résumé à la longueur du contenu source.
- **RÈGLE FONDAMENTALE** : Un résumé est TOUJOURS plus court ou égal au texte source. Si le contenu source est court (moins de 1000 caractères), génère un résumé proportionnellement court. Ne génère JAMAIS un résumé plus long que le contenu source.
- **EXIGENCE DE LONGUEUR** : Génère un résumé complet visant 1500-2000 caractères SEULEMENT si le contenu source est suffisamment long (plus de 2000 caractères). Si le contenu source est plus court, réduis proportionnellement la longueur de ton résumé.
- **COMPLÉTUDE** : Inclus les détails pertinents les plus importants. Si tu as beaucoup de contenu, extrais et synthétise les informations les plus importantes pour créer un résumé riche mais concis. Ne répète pas les informations, synthétise-les.
- **PERTINENCE** : Exclus uniquement les informations vraiment non pertinentes (disclaimers légaux, contenu générique de site web, menus de navigation, avis de cookies). Inclus les informations sur le lieu lui-même, ses caractéristiques, activités, accès, histoire et informations pour visiteurs.
- **QUALITÉ** : Écris dans un style engageant et informatif adapté aux amateurs de nature. Utilise des phrases complètes et une structure appropriée. Sois concis et précis.
- **PORTÉE** : Concentre-toi UNIQUEMENT sur les informations concernant "${placeName}" - N'inclus PAS d'informations sur d'autres lieux mentionnés dans le contenu.
- **PAS DE RÉSUMÉS COURTS** : Ne retourne PAS un résumé bref disant "pas d'informations pertinentes" s'il y a DU contenu sur le lieu. Extrais et synthétise les informations qui existent.

Si le contenu contient des informations pertinentes sur le lieu (ce qui devrait être le cas, puisqu'il a été scrapé depuis le site web du lieu), fournis un résumé complet mais concis. Ne retourne "NO_RELEVANT_INFO" que si le contenu est complètement non lié au lieu (par exemple, site web complètement différent, pages d'erreur, etc.).

IMPORTANT : 
- Toutes tes réponses doivent être en français.
- RÈGLE ABSOLUE : Ton résumé ne doit JAMAIS dépasser la longueur du contenu source fourni. Si le contenu source fait 500 caractères, ton résumé doit faire maximum 500 caractères. Si le contenu source fait 5000 caractères, tu peux viser 1500-2000 caractères.

Réponse (résumé complet uniquement, pas de JSON, adapter la longueur au contenu source) :`

  const contents = [{ role: 'user', parts: [{ text: prompt }] }]

  try {
    const result = await generateContentWithDelay({
      model: MODEL.GEMMA,
      contents: contents,
    })

    let responseText: string
    try {
      responseText = extractResponseText(result).trim()
    } catch (extractError) {
      console.warn('First attempt failed, retrying without grounding tools...', extractError)
      const fallbackResult = await generateContentWithDelay({
        model: MODEL.GEMMA,
        contents: contents,
      })
      responseText = extractResponseText(fallbackResult).trim()
    }

    if (!responseText || responseText === 'NO_RELEVANT_INFO') {
      console.log('❌ AI returned no relevant info or empty response')
      return null
    }

    // Warn if summary is longer than expected, but don't truncate
    if (responseText.length > 2500) {
      console.warn(`⚠️  Generated summary exceeds 2500 chars (${responseText.length}). Consider reviewing the prompt.`)
    }

    console.log(`✅ Summarization successful: ${responseText.length} characters`)
    return responseText
  } catch (error) {
    console.error('Error summarizing scraped content:', error)
    return null
  }
}

/**
 * Extracts nature places with descriptions from URL content (for source analysis)
 * @param urlContent The scraped content from a URL
 * @returns Array of objects with name and description for each place found
 */
export interface ExtractedPlace {
  name: string
  description: string | null
}

export async function extractPlacesFromUrlContent(urlContent: string): Promise<ExtractedPlace[]> {
  const genAI = getGenAI()
  if (!genAI) {
    throw new Error('AI service is not available')
  }

  const prompt = `Tu aides à analyser des lieux de nature et de plein air à partir d'une URL (comme un guide de voyage, article de blog, ou article).

Contenu de l'URL : ${urlContent.substring(0, 30000)}

Analyse ce contenu et extrais les lieux de nature SPÉCIFIQUES et NOMMÉS, parcs, sentiers, repères naturels ou destinations de plein air qui sont mentionnés. Pour chaque lieu, extrais :
- Le nom exact du lieu
- Une description (si disponible) - cela pourrait être des informations sur le lieu, ce qui le rend spécial, les activités disponibles, détails de localisation, etc.

**RÈGLES DE FILTRAGE CRITIQUES - EXTRAIRE UNIQUEMENT DES LIEUX SPÉCIFIQUES :**
- ✅ EXTRAIS : Des lieux nommés spécifiques comme "Parc National des Cévennes", "Mont Blanc", "Sentier des Gorges du Verdon", "Lac d'Annecy", "Forêt de Fontainebleau"
- ❌ N'EXTRAIS PAS : Des termes génériques comme "forêt", "montagne", "lac", "sentier", "parc" (sans nom spécifique)
- ❌ N'EXTRAIS PAS : Des régions administratives comme "Auvergne", "Provence", "Bourgogne", "Normandie" (sauf si elles se réfèrent à une zone naturelle spécifique comme "Parc Naturel Régional d'Auvergne")
- ❌ N'EXTRAIS PAS : Des descripteurs génériques comme "les montagnes", "la côte", "la campagne", "sentiers à proximité"
- ❌ N'EXTRAIS PAS : Des types de lieux sans noms comme "une belle forêt", "plusieurs lacs", "de nombreux sentiers"
- ✅ EXTRAIS : Des lieux qui ont un nom propre qui pourrait être trouvé sur une carte ou dans OSM (OpenStreetMap)
- ✅ EXTRAIS : Des sentiers nommés, sommets, vallées, lacs, forêts, parcs, réserves, monuments naturels
- ❌ N'EXTRAIS PAS : Des références vagues comme "la région", "la zone", "les environs"

**Exemples de ce qu'il faut EXTRAIRE :**
- "Parc National de la Vanoise" ✅
- "Mont Ventoux" ✅
- "Gorges du Tarn" ✅
- "Lac de Serre-Ponçon" ✅
- "Sentier du GR20" ✅
- "Forêt de Rambouillet" ✅

**Exemples de ce qu'il ne faut PAS EXTRAIRE :**
- "forêt" ❌
- "Auvergne" (en tant que région) ❌
- "les montagnes" ❌
- "plusieurs lacs" ❌
- "sentiers à proximité" ❌
- "belle nature" ❌

Retourne UNIQUEMENT un tableau JSON d'objets. Format :
[
  {
    "name": "Nom du lieu 1",
    "description": "Description du lieu 1 avec détails sur les caractéristiques, activités, localisation, etc."
  },
  {
    "name": "Nom du lieu 2",
    "description": "Description du lieu 2..."
  }
]

Si un lieu n'a pas de description disponible, utilise null :
{
  "name": "Nom du lieu",
  "description": null
}

IMPORTANT :
- Inclus uniquement des lieux de nature/plein air SPÉCIFIQUES et NOMMÉS qui pourraient être trouvés sur une carte
- Utilise les noms exacts tels que mentionnés dans le contenu
- Supprime les doublons (si le même lieu est mentionné plusieurs fois, combine les informations)
- Extrais autant d'informations que possible pour les descriptions (viser 200-500 caractères par description quand disponible)
- Sois strict : si un nom de lieu est trop générique ou vague, exclut-le
- Retourne UNIQUEMENT un tableau JSON valide, pas de texte supplémentaire
- Si aucun lieu spécifique n'est trouvé, retourne un tableau vide : []
- Toutes tes réponses doivent être en français

Réponse :`

  const contents = [{ role: 'user', parts: [{ text: prompt }] }]

  try {
    const result = await generateContentWithDelay({
      model: MODEL.GEMMA,
      contents: contents,
    })

    let responseText: string
    try {
      responseText = extractResponseText(result).trim()
    } catch (extractError) {
      console.warn('First attempt failed, retrying without grounding tools...', extractError)
      const fallbackResult = await generateContentWithDelay({
        model: MODEL.GEMMA,
        contents: contents,
      })
      responseText = extractResponseText(fallbackResult).trim()
    }

    if (!responseText) {
      console.log('❌ AI returned empty response')
      return []
    }

    // Try to extract JSON array from response
    let jsonText = responseText
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    const parsed = JSON.parse(jsonText) as ExtractedPlace[]

    if (!Array.isArray(parsed)) {
      console.warn('❌ AI returned invalid format, returning empty array')
      return []
    }

    // Filter and normalize
    const places = parsed
      .filter((place) => place && typeof place.name === 'string' && place.name.trim().length > 0)
      .map((place) => ({
        name: place.name.trim(),
        description: place.description && typeof place.description === 'string' ? place.description.trim() : null,
      }))

    console.log(`✅ Extracted ${places.length} places from URL content`)
    return places
  } catch (error) {
    console.error('Error extracting places from URL content:', error)
    return []
  }
}

/**
 * Extracts mentioned nature places from scraped website content
 * @param placeName The name of the place being analyzed
 * @param scrapedContent The combined text content from scraped website pages
 * @returns Array of nature place names mentioned in the content, or empty array if none found
 */
export async function extractMentionedPlaces(placeName: string, scrapedContent: string): Promise<string[]> {
  const genAI = getGenAI()
  if (!genAI) {
    throw new Error('AI service is not available')
  }

  const prompt = `Tu aides à analyser des lieux de nature et de plein air pour une application de découverte.

Nom du lieu : ${placeName}
Contenu du site web scrapé : ${scrapedContent.substring(0, 15000)}

Analyse ce contenu et extrais UNIQUEMENT les noms d'autres lieux de nature, parcs, sentiers ou repères naturels qui sont mentionnés. Ceux-ci doivent être :
- Des lieux nommés spécifiquement (pas des références génériques comme "parcs à proximité")
- Liés à la nature, au plein air, à la randonnée, à la faune, ou à des activités similaires
- Des lieux distincts qui pourraient avoir leur propre entrée dans la base de données
- PAS le lieu lui-même (${placeName})

Retourne UNIQUEMENT un tableau JSON de noms de lieux. Format :
["Nom du lieu 1", "Nom du lieu 2", "Nom du lieu 3"]

Si aucun lieu pertinent n'est trouvé, retourne un tableau vide : []

IMPORTANT :
- Inclus uniquement des lieux de nature/plein air
- Utilise les noms exacts tels que mentionnés dans le contenu
- Supprime les doublons
- Retourne UNIQUEMENT un tableau JSON valide, pas de texte supplémentaire
- Toutes tes réponses doivent être en français

Réponse :`

  const contents = [{ role: 'user', parts: [{ text: prompt }] }]

  try {
    const result = await generateContentWithDelay({
      model: MODEL.GEMMA,
      contents: contents,
    })

    let responseText: string
    try {
      responseText = extractResponseText(result).trim()
    } catch (extractError) {
      console.warn('First attempt failed, retrying without grounding tools...', extractError)
      const fallbackResult = await generateContentWithDelay({
        model: MODEL.GEMMA,
        contents: contents,
      })
      responseText = extractResponseText(fallbackResult).trim()
    }

    if (!responseText) {
      console.log('❌ AI returned empty response')
      return []
    }

    // Try to extract JSON array from response
    let jsonText = responseText
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    const parsed = JSON.parse(jsonText) as string[]

    if (!Array.isArray(parsed)) {
      console.warn('❌ AI returned invalid format, returning empty array')
      return []
    }

    // Filter out empty strings and normalize
    const places = parsed
      .filter((place) => typeof place === 'string' && place.trim().length > 0)
      .map((place) => place.trim())
      .filter((place) => place.toLowerCase() !== placeName.toLowerCase()) // Remove the place itself

    console.log(`✅ Extracted ${places.length} mentioned places`)
    return places
  } catch (error) {
    console.error('Error extracting mentioned places:', error)
    return []
  }
}

/**
 * Analyzes scraped website content to extract a detailed description and mentioned nature places
 * @deprecated Use summarizeScrapedContent and extractMentionedPlaces separately instead
 * @param placeName The name of the place being analyzed
 * @param scrapedContent The combined text content from scraped website pages
 * @returns An object with description (max 2000 chars) and array of mentioned places, or null if analysis fails
 */
export async function analyzeScrapedContent(
  placeName: string,
  scrapedContent: string,
): Promise<PlaceAnalysisResult | null> {
  const genAI = getGenAI()
  if (!genAI) {
    throw new Error('AI service is not available')
  }

  const prompt = `Tu aides à analyser des lieux de nature et de plein air pour une application de découverte.

Nom du lieu : ${placeName}
Contenu du site web scrapé : ${scrapedContent.substring(0, 15000)}

Analyse ce contenu et fournis une réponse JSON avec la structure suivante :
{
  "description": "Une description détaillée et engageante de ce lieu (maximum 2000 caractères). Concentre-toi sur ce qui rend ce lieu spécial, les activités clés, les informations pour visiteurs, les caractéristiques naturelles, et pourquoi quelqu'un voudrait le visiter. Inclus uniquement des informations pertinentes pour les amateurs de nature/plein air.",
  "mentionedPlaces": ["Tableau d'autres lieux de nature, parcs, sentiers ou repères naturels mentionnés dans le contenu qui vaudraient la peine d'être dans notre base de données. Inclus uniquement des lieux qui sont nommés spécifiquement et pertinents pour les activités de nature/plein air. Retourne un tableau vide si aucun n'est trouvé."]
}

RÈGLES IMPORTANTES :
1. La description doit être engageante, informative et axée sur les activités de nature/plein air
2. Maximum 2000 caractères pour la description
3. Inclus uniquement les lieux mentionnés qui sont :
   - Nommés spécifiquement (pas des références génériques comme "parcs à proximité")
   - Liés à la nature, au plein air, à la randonnée, à la faune, ou à des activités similaires
   - Des lieux distincts qui pourraient avoir leur propre entrée dans la base de données
4. Si le contenu n'est pas pertinent ou insuffisant, retourne : {"description": "NO_RELEVANT_INFO", "mentionedPlaces": []}
5. Retourne UNIQUEMENT du JSON valide, pas de texte supplémentaire
6. Toutes tes réponses doivent être en français

Réponse :`

  const contents = [{ role: 'user', parts: [{ text: prompt }] }]

  try {
    const result = await generateContentWithDelay({
      model: MODEL.GEMMA,
      contents: contents,
    })

    let responseText: string
    try {
      responseText = extractResponseText(result).trim()
    } catch (extractError) {
      console.warn('First attempt failed, retrying without grounding tools...')

      const fallbackResult = await generateContentWithDelay({
        model: MODEL.GEMMA,
        contents: contents,
      })

      responseText = extractResponseText(fallbackResult).trim()
    }

    if (!responseText) {
      console.log('❌ AI returned empty response')
      return null
    }

    // Try to extract JSON from response (handle cases where AI adds extra text)
    let jsonText = responseText
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    // Parse JSON response
    const parsed = JSON.parse(jsonText) as PlaceAnalysisResult

    // Validate response
    if (!parsed.description || parsed.description === 'NO_RELEVANT_INFO') {
      console.log('❌ AI returned no relevant info')
      return null
    }

    // Ensure description is within limit
    if (parsed.description.length > 2000) {
      parsed.description = parsed.description.substring(0, 1997) + '...'
    }

    // Ensure mentionedPlaces is an array
    if (!Array.isArray(parsed.mentionedPlaces)) {
      parsed.mentionedPlaces = []
    }

    console.log(
      `✅ AI analysis successful: ${parsed.description.length} chars, ${parsed.mentionedPlaces.length} mentioned places`,
    )

    return parsed
  } catch (error) {
    console.error('Error analyzing scraped content:', error)
    return null
  }
}
