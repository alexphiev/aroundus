// OpenWeather API response types

// Weather condition details
export interface WeatherCondition {
  id: number
  main: string
  description: string
  icon: string
}

// Main weather data (temperature, pressure, humidity, etc.)
export interface MainWeatherData {
  temp: number
  feels_like: number
  temp_min: number
  temp_max: number
  pressure: number
  humidity: number
  sea_level?: number
  grnd_level?: number
  temp_kf?: number // Only in forecast data
}

// Wind information
export interface WindData {
  speed: number
  deg: number
  gust?: number
}

// Precipitation data
export interface PrecipitationData {
  '1h'?: number
  '3h'?: number
}

// Cloud coverage
export interface CloudData {
  all: number
}

// System information for current weather
export interface SystemData {
  type: number
  id: number
  country: string
  sunrise: number
  sunset: number
}

// System information for forecast items
export interface ForecastSystemData {
  pod: string // "d" for day, "n" for night
}

// Coordinates
export interface Coordinates {
  lat: number
  lon: number
}

// Current weather API response
export interface CurrentWeatherResponse {
  coord: Coordinates
  weather: WeatherCondition[]
  base: string
  main: MainWeatherData
  visibility: number
  wind: WindData
  rain?: PrecipitationData
  snow?: PrecipitationData
  clouds: CloudData
  dt: number
  sys: SystemData
  timezone: number
  id: number
  name: string
  cod: number
}

// Individual forecast item
export interface ForecastItem {
  dt: number
  main: MainWeatherData
  weather: WeatherCondition[]
  clouds: CloudData
  wind: WindData
  visibility: number
  pop: number // Probability of precipitation
  rain?: {
    '3h': number
  }
  snow?: {
    '3h': number
  }
  sys: ForecastSystemData
  dt_txt: string
}

// City information in forecast response
export interface CityInfo {
  id: number
  name: string
  coord: Coordinates
  country: string
  population: number
  timezone: number
  sunrise: number
  sunset: number
}

// 5-day forecast API response
export interface ForecastResponse {
  cod: string
  message: number
  cnt: number
  list: ForecastItem[]
  city: CityInfo
}

// Utility types for easier data manipulation

// Simplified weather data for UI display
export interface SimpleWeatherData {
  temperature: number
  feelsLike: number
  description: string
  icon: string
  humidity: number
  windSpeed: number
  windDirection: number
  pressure: number
  visibility: number
  cloudCover: number
}

// Daily weather summary (aggregated from forecast items)
export interface DailyWeatherSummary {
  date: string
  dateObj: Date
  tempMin: number
  tempMax: number
  avgTemp: number
  dominantWeather: WeatherCondition
  precipitationChance: number
  windSpeed: number
  humidity: number
  items: ForecastItem[] // All forecast items for this day
}

// Weather alert/warning (for future use)
export interface WeatherAlert {
  sender_name: string
  event: string
  start: number
  end: number
  description: string
  tags: string[]
}

// API response wrapper types
export interface WeatherApiResponse<T> {
  data?: T
  error?: string
}

export type CurrentWeatherApiResponse =
  WeatherApiResponse<CurrentWeatherResponse>
export type ForecastApiResponse = WeatherApiResponse<ForecastResponse>

// Weather units enum
export enum WeatherUnits {
  METRIC = 'metric',
  IMPERIAL = 'imperial',
  KELVIN = 'standard',
}

// Weather icon mapping for easier UI handling
export interface WeatherIconInfo {
  code: string
  description: string
  isDay: boolean
  category:
    | 'clear'
    | 'clouds'
    | 'rain'
    | 'snow'
    | 'thunderstorm'
    | 'drizzle'
    | 'mist'
    | 'other'
}

// Location with weather data
export interface WeatherLocation {
  name: string
  country: string
  coordinates: Coordinates
  timezone: number
  currentWeather?: SimpleWeatherData
  forecast?: DailyWeatherSummary[]
}

// Weather search/query parameters
export interface WeatherQuery {
  lat: number
  lon: number
  units?: WeatherUnits
  lang?: string
}

// Processed weather data for components
export interface ProcessedWeatherData {
  current: SimpleWeatherData
  location: {
    name: string
    country: string
    coordinates: Coordinates
  }
  forecast: DailyWeatherSummary[]
  lastUpdated: Date
}
