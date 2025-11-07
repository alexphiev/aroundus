export interface SearchFormValues {
  locationType: 'current' | 'custom'
  customLocation?: {
    name: string
    lat: number
    lng: number
  }
  distance: string
  transportType: 'public_transport' | 'car' | 'foot' | 'bike'
  locationName?: string
  activity?: string
}

export interface SearchQuery {
  location: {
    latitude: number
    longitude: number
  }
  distance: string
  transportType: 'public_transport' | 'car' | 'foot' | 'bike'
  locationName?: string
}

export interface SearchFilters {
  distance: string
  transportType: 'public_transport' | 'car' | 'foot' | 'bike'
  activity?: string
  locationName?: string
}
