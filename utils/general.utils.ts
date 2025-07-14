/**
 * Capitalizes the first character of a string
 * @param str - The string to capitalize
 * @returns The string with the first character capitalized
 */
export function capitalize(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}