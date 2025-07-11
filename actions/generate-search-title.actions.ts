'use server'

import { MODEL } from '@/constants/ai.constants'
import { getAIError, getGenAI } from '@/lib/ai.service'
import { authenticateUser } from '@/lib/auth.service'
import { FormValues } from '@/types/search-history.types'

// Generate a short title summarizing the search
export async function generateSearchTitle(searchQuery: FormValues) {
  // Check authentication
  const authResult = await authenticateUser()
  if (authResult.error) {
    return { error: authResult.error }
  }

  // Check AI availability
  const genAI = getGenAI()
  if (!genAI) {
    return { error: getAIError() || 'AI service unavailable' }
  }

  try {
    // Get the final activity (handle "other" case)
    const finalActivity =
      searchQuery.activity === 'other'
        ? searchQuery.otherActivity || 'custom activity'
        : searchQuery.activity

    // Create a concise search description
    const searchDescription = `
      Activity: ${finalActivity}
      When: ${searchQuery.when}
      Distance: ${searchQuery.distance} ${searchQuery.transportType}
      Duration: ${searchQuery.activityDurationValue} ${searchQuery.activityDurationUnit}
      ${
        searchQuery.locationName
          ? `Location: ${searchQuery.locationName}`
          : ''
      }
      ${
        searchQuery.additionalInfo
          ? `Search query: ${searchQuery.additionalInfo}`
          : ''
      }
      ${
        searchQuery.specialCare
          ? `Special requirements: ${searchQuery.specialCare}`
          : ''
      }
    `.trim()

    const prompt = `
      Generate a short, poetic, and engaging title (maximum 40 characters) for this nature discovery search.
      Be creative and evocative of the search. Think of titles that would make someone excited to explore.
      
      Search details:
      ${searchDescription}
      
      Examples of good poetic titles:
      - "Whispers of Weekend Trails"
      - "Sunset Cycling Dreams"
      - "Hidden Forest Treasures"
      - "Morning Mountain Magic"
      - "Peaceful Lakeside Moments"
      - "Wild Photography Adventures"
      - "Secret Garden Wanderings"
      - "Ocean Breeze Escapes"
      - "Paris Trail Adventures"
      - "Tokyo Nature Escapes"
      - "Colorado Mountain Dreams"
      - "California Coast Wanderings"
      
      Focus on:
      - Evoking emotion and wonder
      - Using nature imagery
      - Creating anticipation
      - Being memorable and inspiring
      - Including location context when available to make titles more specific and personal
      
      Return ONLY the title, no quotes, no additional text.
      Keep it under 6 words and make it poetic yet accessible.
    `

    const result = await genAI.models.generateContent({
      model: MODEL.GEMMA,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })

    let responseText: string = ''

    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0]
      if (
        candidate.content &&
        candidate.content.parts &&
        candidate.content.parts.length > 0
      ) {
        responseText = candidate.content.parts[0].text || ''
      }
    }

    // Fallback methods for different response structures
    if (!responseText && result.text) {
      responseText = result.text
    }

    if (!responseText) {
      console.error('AI response missing text content for title generation')
      return { error: 'Failed to generate search title' }
    }

    // Clean up the response - remove quotes, extra whitespace, etc.
    const cleanTitle = responseText
      .trim()
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    // Validate title length (fallback if too long)
    const finalTitle =
      cleanTitle.length > 40 ? cleanTitle.substring(0, 37) + '...' : cleanTitle

    return {
      success: true,
      data: { title: finalTitle },
    }
  } catch (error) {
    console.error('Error generating search title:', error)
    return {
      error: `Failed to generate search title: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    }
  }
}
