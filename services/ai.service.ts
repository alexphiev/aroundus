import { GoogleGenAI } from '@google/genai'

// Module-level initialization - most performant for Next.js server actions
let genAI: GoogleGenAI | null = null
let initialized = false
let initError: string | null = null

function initializeGenAI(): void {
  if (initialized) return

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY

  if (!GEMINI_API_KEY) {
    initError =
      'AI service is not configured. Missing GEMINI_API_KEY environment variable.'
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
