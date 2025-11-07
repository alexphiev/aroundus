'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

interface LoadingStateProps {
  message?: string
}

const ANIMATIONS = [
  'duck.webp',
  'woodpecker.webp',
  'bee.webp',
  'bear.webp',
  'squirrel.webp',
  'horse.webp',
  'coral.webp',
]

const MESSAGES = [
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

export default function LoadingState({ message }: LoadingStateProps) {
  // Start with 0 to avoid hydration mismatch, then randomize on mount
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Set random initial index after mount to avoid hydration mismatch
  useEffect(() => {
    setCurrentIndex(Math.floor(Math.random() * ANIMATIONS.length))
    setIsMounted(true)
  }, [])

  // Auto-switch every 10 seconds with smooth transition
  useEffect(() => {
    if (!isMounted) return

    const interval = setInterval(() => {
      setIsTransitioning(true)

      setTimeout(() => {
        setCurrentIndex((prevIndex) => {
          let newIndex
          do {
            newIndex = Math.floor(Math.random() * ANIMATIONS.length)
          } while (newIndex === prevIndex && ANIMATIONS.length > 1)
          return newIndex
        })
        setIsTransitioning(false)
      }, 150) // Half transition duration for smoother swap
    }, 10000)

    return () => clearInterval(interval)
  }, [isMounted])

  const loadingImage = `/animated/${ANIMATIONS[currentIndex]}`
  const loadingMessage = message || MESSAGES[currentIndex % MESSAGES.length]

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
