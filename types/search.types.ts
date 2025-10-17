export interface SearchFormValues {
  locationType: 'current' | 'custom'
  customLocation?: {
    name: string
    lat: number
    lng: number
  }
  distance: string
  transportType: 'public_transport' | 'car'
  locationName?: string
}

export interface SearchQuery {
  location: {
    latitude: number
    longitude: number
  }
  distance: string
  transportType: 'public_transport' | 'car'
  locationName?: string
}
