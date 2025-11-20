import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const abbreviateDuration = (duration: string) => {
  return duration
    .replace(/hours?/gi, 'h')
    .replace(/minutes?/gi, 'm')
    .replace(/days?/gi, 'd')
    .replace(/weeks?/gi, 'w')
    .replace(/\s+/g, ' ')
    .trim()
}
