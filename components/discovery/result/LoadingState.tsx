'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

interface LoadingStateProps {
  message?: string
}

export default function LoadingState({ message }: LoadingStateProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const animations = useMemo(
    () => [
      'duck.webp',
      'woodpecker.webp',
      'bee.webp',
      'bear.webp',
      'squirrel.webp',
      'horse.webp',
      'coral.webp',
    ],
    []
  )

  const messages = useMemo(
    () => [
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
    ],
    []
  )

  // Auto-switch every 10 seconds with smooth transition
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true)
      
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % animations.length)
        setIsTransitioning(false)
      }, 150) // Half transition duration for smoother swap
    }, 10000)

    return () => clearInterval(interval)
  }, [animations.length])

  const loadingImage = `/animated/${animations[currentIndex]}`
  const loadingMessage = message || messages[currentIndex % messages.length]

  return (
    <div className="mobile-overlay flex h-full items-center justify-center p-8">
      <div className="text-center">
        <div className="mobile-no-zoom relative mx-auto mb-4 h-40 w-40">
          <Image
            src={loadingImage}
            alt="Loading animation"
            width={160}
            height={160}
            className={`mobile-no-zoom absolute inset-0 rounded-lg object-cover transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
            unoptimized
          />
        </div>
        <p
          className={`mobile-no-zoom text-muted-foreground text-sm transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {loadingMessage}
        </p>
      </div>
    </div>
  )
}
