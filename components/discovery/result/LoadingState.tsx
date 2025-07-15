'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

interface LoadingStateProps {
  message?: string
}

export default function LoadingState({ message }: LoadingStateProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

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
      // Start fade out
      setIsVisible(false)

      // After fade out completes, change content and fade in
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % animations.length)
        setIsVisible(true)
      }, 300) // 300ms fade out duration
    }, 10000)

    return () => clearInterval(interval)
  }, [animations.length])

  const loadingImage = `/animated/${animations[currentIndex]}`
  const loadingMessage = message || messages[currentIndex % messages.length]

  return (
    <div className="mobile-overlay flex h-full items-center justify-center p-8">
      <div className="text-center">
        <div
          className={`mobile-no-zoom relative mx-auto mb-4 flex h-40 w-40 items-center justify-center transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={loadingImage}
            alt="Loading animation"
            width={160}
            height={160}
            className="mobile-no-zoom rounded-lg object-cover"
            unoptimized
          />
        </div>
        <p
          className={`mobile-no-zoom text-muted-foreground text-sm transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {loadingMessage}
        </p>
      </div>
    </div>
  )
}
