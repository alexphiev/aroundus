'use client'

import { useMemo } from 'react'
import Image from 'next/image'

interface LoadingStateProps {
  message?: string
}

export default function LoadingState({ message }: LoadingStateProps) {
  // Randomly select a loading animation each time the component loads
  const loadingImage = useMemo(() => {
    const animations = [
      'duck.webp',
      'woodpecker.webp',
      'bee.webp',
      'bear.webp',
      'squirrel.webp',
      'horse.webp',
      'coral.webp',
    ]
    const randomIndex = Math.floor(Math.random() * animations.length)
    return `/animated/${animations[randomIndex]}`
  }, [])

  // Randomly select a loading message if none provided
  const loadingMessage = useMemo(() => {
    if (message) return message

    const messages = [
      'Searching for amazing nature...',
      'Discovering hidden gems in nature...',
      'Following the trails to adventure...',
      'Exploring wild and wonderful spots...',
      'Hunting for perfect nature escapes...',
      'Scouting breathtaking landscapes...',
      'Finding your next outdoor adventure...',
      'Uncovering secret natural wonders...',
      'Seeking out pristine wilderness...',
      'Tracking down magical places...',
      'Mapping routes to natural beauty...',
      'Spotting incredible outdoor destinations...',
      'Wandering through digital forests...',
      'Chasing sunsets and mountain views...',
      "Collecting nature's finest treasures...",
    ]
    const randomIndex = Math.floor(Math.random() * messages.length)
    return messages[randomIndex]
  }, [message])

  return (
    <div className="p-8 text-center">
      <div className="relative w-40 h-40 mx-auto mb-4 flex items-center justify-center">
        <Image
          src={loadingImage}
          alt="Loading animation"
          width={160}
          height={160}
          className="rounded-lg object-cover"
          unoptimized
        />
      </div>
      <p className="text-lg text-muted-foreground">{loadingMessage}</p>
    </div>
  )
}
