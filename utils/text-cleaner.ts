/**
 * Utility functions for cleaning and normalizing text content
 */

/**
 * Cleans and normalizes text content by:
 * - Removing excessive whitespace
 * - Removing citation markers
 * - Removing annotation markers
 * - Normalizing line breaks
 * - Trimming edges
 */
export function cleanText(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n') // Normalize line endings
    .replace(/\[.*?\]/g, '') // Remove [citations]
    .replace(/\{.*?\}/g, '') // Remove {annotations}
    .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs (preserve newlines)
    .replace(/ \n/g, '\n') // Remove spaces before newlines
    .replace(/\n /g, '\n') // Remove spaces after newlines
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines (after whitespace normalization)
    .trim()
}

/**
 * Cleans Wikipedia text content (already mostly clean from API, but normalize)
 */
export function cleanWikipediaText(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/\s+$/gm, '') // Remove trailing whitespace from each line
    .trim()
}

