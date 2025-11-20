export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const s2 = str2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  if (s1 === s2) {
    return 1.0
  }

  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8
  }

  const words1 = s1.split(/\s+/)
  const words2 = s2.split(/\s+/)
  const commonWords = words1.filter(word => words2.includes(word) && word.length > 2)

  if (commonWords.length === 0) {
    return 0.0
  }

  return commonWords.length / Math.max(words1.length, words2.length)
}
