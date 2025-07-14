'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Compass, Dumbbell, Leaf, Search, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Navigate to discover page with search query
      router.push(`/discover?q=${encodeURIComponent(searchQuery)}`)
    } else {
      // Navigate to discover page
      router.push('/discover')
    }
  }

  const handleShortcut = (type: string) => {
    // Navigate to discover page with shortcut type
    const shortcuts = {
      'feeling-lucky': '/discover?shortcut=feeling-lucky',
      exercise: '/discover?shortcut=exercise',
      relax: '/discover?shortcut=relax',
      'something-new': '/discover?shortcut=something-new',
    }

    router.push(shortcuts[type as keyof typeof shortcuts] || '/discover')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-6">
      <div className="mx-auto w-full max-w-2xl space-y-8 text-center">
        {/* Title */}
        <div className="mb-16 space-y-4">
          <h1 className="text-primary font-regular text-3xl tracking-wide md:text-4xl">
            Reconnect with nature around you
          </h1>
        </div>

        {/* Search Input */}
        <div className="relative mx-auto max-w-4xl">
          <Input
            type="text"
            placeholder="I feel like..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            className="h-16 w-full rounded-lg border-1 border-gray-200 bg-white/60 px-6 pr-14 text-base shadow-xs backdrop-blur-xs focus:border-gray-400 focus:ring-0"
          />
          <Button
            onClick={handleSearch}
            size="icon"
            className="absolute top-2 right-2 h-12 w-12 rounded-full"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {/* Shortcut Buttons */}
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-2 lg:grid-cols-4">
          <Button
            variant="outline"
            onClick={() => handleShortcut('feeling-lucky')}
            className="group h-16 rounded-lg border-1 bg-white/60 backdrop-blur-xs transition-all hover:shadow-md"
          >
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-600 transition-transform group-hover:scale-110" />
              <span className="font-medium">Feeling Lucky</span>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => handleShortcut('exercise')}
            className="group h-16 rounded-lg border-1 bg-white/60 backdrop-blur-xs transition-all hover:shadow-md"
          >
            <div className="flex flex-col items-center gap-2">
              <Dumbbell className="h-6 w-6 text-orange-600 transition-transform group-hover:scale-110" />
              <span className="font-medium">I need to exercise</span>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => handleShortcut('relax')}
            className="group h-16 rounded-lg border-1 bg-white/60 backdrop-blur-xs transition-all hover:shadow-md"
          >
            <div className="flex flex-col items-center gap-2">
              <Leaf className="h-6 w-6 text-green-600 transition-transform group-hover:scale-110" />
              <span className="font-medium">Let&apos;s Relax</span>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => handleShortcut('something-new')}
            className="group h-16 rounded-lg border-1 bg-white/60 backdrop-blur-xs transition-all hover:shadow-md"
          >
            <div className="flex flex-col items-center gap-2">
              <Compass className="h-6 w-6 text-blue-600 transition-transform group-hover:scale-110" />
              <span className="font-medium">Something new</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  )
}
