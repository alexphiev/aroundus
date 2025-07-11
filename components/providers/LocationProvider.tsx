'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { reverseGeocode } from '@/lib/geocoding.service'

interface LocationInfo {
  locationName: string
  city?: string
  region?: string
  country?: string
}

interface UserLocation {
  latitude: number
  longitude: number
}

interface LocationContextType {
  userLocation: UserLocation | null
  locationInfo: LocationInfo | null
  isLoadingLocation: boolean
  locationError: string | null
  setUserLocation: (location: UserLocation) => void
  refetchLocationInfo: () => Promise<void>
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function useLocationContext() {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider')
  }
  return context
}

interface LocationProviderProps {
  children: ReactNode
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [userLocation, setUserLocationState] = useState<UserLocation | null>(null)
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Function to fetch location info from coordinates
  const fetchLocationInfo = async (location: UserLocation) => {
    if (!location) return

    setIsLoadingLocation(true)
    setLocationError(null)

    try {
      const info = await reverseGeocode(location.latitude, location.longitude)
      if (info) {
        setLocationInfo(info)
        // Store in sessionStorage for persistence across page reloads
        sessionStorage.setItem('locationInfo', JSON.stringify(info))
      } else {
        setLocationError('Unable to determine location name')
      }
    } catch (error) {
      console.error('Error fetching location info:', error)
      setLocationError('Failed to fetch location information')
    } finally {
      setIsLoadingLocation(false)
    }
  }

  // Set user location and trigger reverse geocoding
  const setUserLocation = (location: UserLocation) => {
    setUserLocationState(location)
    // Store coordinates in sessionStorage
    sessionStorage.setItem('userLocation', JSON.stringify(location))
    fetchLocationInfo(location)
  }

  // Refetch location info for current coordinates
  const refetchLocationInfo = async () => {
    if (userLocation) {
      await fetchLocationInfo(userLocation)
    }
  }

  // Load stored location on mount
  useEffect(() => {
    try {
      // Try to load from sessionStorage first
      const storedLocation = sessionStorage.getItem('userLocation')
      const storedLocationInfo = sessionStorage.getItem('locationInfo')

      if (storedLocation) {
        const location = JSON.parse(storedLocation) as UserLocation
        setUserLocationState(location)

        if (storedLocationInfo) {
          const info = JSON.parse(storedLocationInfo) as LocationInfo
          setLocationInfo(info)
        } else {
          // If we have coordinates but no location info, fetch it
          fetchLocationInfo(location)
        }
      }
    } catch (error) {
      console.error('Error loading stored location:', error)
      // Clear invalid stored data
      sessionStorage.removeItem('userLocation')
      sessionStorage.removeItem('locationInfo')
    }
  }, [])

  const value: LocationContextType = {
    userLocation,
    locationInfo,
    isLoadingLocation,
    locationError,
    setUserLocation,
    refetchLocationInfo,
  }

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  )
}