'use client'

import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean | null {
  // Start with mobile-first assumption for SSR
  const [matches, setMatches] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    // Default to desktop for SSR to avoid mobile flash on desktop
    return query.includes('max-width') ? false : true
  })

  useEffect(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(query)

    // Update value if different from initial
    if (matches !== mediaQuery.matches) {
      setMatches(mediaQuery.matches)
    }

    // Listen for changes
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler)
      return () => mediaQuery.removeListener(handler)
    }
  }, [query, matches])

  return matches
}

export function useIsMobile(): boolean | null {
  return useMediaQuery('(max-width: 767px)')
}
