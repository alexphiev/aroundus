'use client'

import { Input } from '@/components/ui/input'
import {
  searchLocations,
  type LocationSuggestion,
} from '@/lib/location-autocomplete.service'
import { cn } from '@/lib/utils'
import { MapPin } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface LocationAutocompleteProps {
  value?: LocationSuggestion | null
  onChange: (location: LocationSuggestion | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Search for a location...',
  disabled = false,
  className,
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value?.name || '')
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced search function
  const debouncedSearch = useCallback(async (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (query.trim().length < 2) {
        setSuggestions([])
        setIsOpen(false)
        return
      }

      setIsLoading(true)
      try {
        const results = await searchLocations(query)
        setSuggestions(results)
        setIsOpen(results.length > 0)
        setHighlightedIndex(-1)
      } catch (error) {
        console.error('Search failed:', error)
        setSuggestions([])
        setIsOpen(false)
      } finally {
        setIsLoading(false)
      }
    }, 300) // 300ms debounce
  }, [])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Clear selection if input doesn't match current value
    if (value && newValue !== value.name) {
      onChange(null)
    }

    debouncedSearch(newValue)
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: LocationSuggestion) => {
    setInputValue(suggestion.name)
    onChange(suggestion)
    setIsOpen(false)
    setSuggestions([])
    setHighlightedIndex(-1)
    inputRef.current?.blur()
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Handle input blur
  const handleBlur = () => {
    // Delay closing to allow for suggestion clicks
    setTimeout(() => {
      setIsOpen(false)
      setHighlightedIndex(-1)
    }, 200)
  }

  // Handle input focus
  const handleFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true)
    }
  }

  // Update input value when external value changes
  useEffect(() => {
    if (value) {
      setInputValue(value.name)
    } else if (inputValue && !value) {
      // Only clear if we don't have a value but input has text
      // This prevents clearing during typing
    }
  }, [value])

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-8"
        />
        <MapPin className="text-muted-foreground absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2" />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="bg-background absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border shadow-lg"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-3">
              <div className="text-muted-foreground text-sm">Searching...</div>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => handleSuggestionSelect(suggestion)}
                className={cn(
                  'hover:bg-accent hover:text-accent-foreground w-full px-3 py-2 text-left text-sm',
                  index === highlightedIndex &&
                    'bg-accent text-accent-foreground'
                )}
              >
                <div className="font-medium">{suggestion.name}</div>
                {suggestion.region && suggestion.country && (
                  <div className="text-muted-foreground text-xs">
                    {suggestion.region}, {suggestion.country}
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="text-muted-foreground px-3 py-2 text-sm">
              No locations found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
