'use server'

import type {
  CurrentWeatherApiResponse,
  CurrentWeatherResponse,
  ForecastApiResponse,
  ForecastResponse,
} from '@/types/weather.types'

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY

if (!OPENWEATHER_API_KEY) {
  console.warn(
    'OPENWEATHER_API_KEY is not set. Weather functionality will not work.'
  )
}

/**
 * Fetch current weather data for given coordinates
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Current weather data or error
 */
export async function getCurrentWeather(
  lat: number,
  lon: number
): Promise<CurrentWeatherApiResponse> {
  if (!OPENWEATHER_API_KEY) {
    return { error: 'OpenWeather API key is not configured' }
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        error: `Weather API error: ${response.status} ${response.statusText}${
          errorData.message ? ` - ${errorData.message}` : ''
        }`,
      }
    }

    const data: CurrentWeatherResponse = await response.json()
    return { data }
  } catch (error) {
    console.error('Error fetching current weather:', error)
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch current weather data',
    }
  }
}

/**
 * Fetch 5-day weather forecast for given coordinates
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns 5-day forecast data or error
 */
export async function getFiveDayForecast(
  lat: number,
  lon: number
): Promise<ForecastApiResponse> {
  if (!OPENWEATHER_API_KEY) {
    return { error: 'OpenWeather API key is not configured' }
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        error: `Weather API error: ${response.status} ${response.statusText}${
          errorData.message ? ` - ${errorData.message}` : ''
        }`,
      }
    }

    const data: ForecastResponse = await response.json()
    return { data }
  } catch (error) {
    console.error('Error fetching 5-day forecast:', error)
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch 5-day forecast data',
    }
  }
}

// Helper function to get weather data for AI prompts
export async function getWeatherDataForAI(
  lat: number,
  lon: number,
  targetDate: Date
) {
  try {
    const weatherResult = await getFiveDayForecast(lat, lon)

    if (weatherResult.error || !weatherResult.data) {
      return 'Weather data unavailable'
    }

    const forecast = weatherResult.data
    const targetDateStr = targetDate.toISOString().split('T')[0] // YYYY-MM-DD

    // Find forecast items for the target date (within 5 days)
    const targetDateItems = forecast.list.filter((item) => {
      const itemDate = new Date(item.dt * 1000)
      const itemDateStr = itemDate.toISOString().split('T')[0]
      return itemDateStr === targetDateStr
    })

    if (targetDateItems.length === 0) {
      // If no exact match, get the closest available forecast
      const closestItem = forecast.list.find((item) => {
        const itemDate = new Date(item.dt * 1000)
        return itemDate >= targetDate
      })

      if (closestItem) {
        return `Weather forecast for ${new Date(
          closestItem.dt * 1000
        ).toDateString()}: ${closestItem.weather[0].description}, temperature ${Math.round(
          closestItem.main.temp
        )}°C (feels like ${Math.round(
          closestItem.main.feels_like
        )}°C), humidity ${closestItem.main.humidity}%, wind ${Math.round(
          closestItem.wind.speed
        )} m/s, precipitation chance ${Math.round(closestItem.pop * 100)}%`
      }

      return 'Weather forecast not available for target date'
    }

    // Get morning, afternoon, and evening forecasts for the target date
    const timeSlots = targetDateItems.map((item) => {
      const time = new Date(item.dt * 1000)
      const hour = time.getHours()
      let timeOfDay = ''
      if (hour >= 6 && hour < 12) timeOfDay = 'morning'
      else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon'
      else if (hour >= 18 && hour < 22) timeOfDay = 'evening'
      else timeOfDay = 'night'

      return {
        timeOfDay,
        time: time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        description: item.weather[0].description,
        temp: Math.round(item.main.temp),
        feelsLike: Math.round(item.main.feels_like),
        humidity: item.main.humidity,
        windSpeed: Math.round(item.wind.speed),
        precipChance: Math.round(item.pop * 100),
      }
    })

    const weatherSummary =
      `Weather forecast for ${targetDate.toDateString()}:\n` +
      timeSlots
        .map(
          (slot) =>
            `- ${slot.timeOfDay} (${slot.time}): ${slot.description}, ${slot.temp}°C (feels like ${slot.feelsLike}°C), ${slot.precipChance}% chance of precipitation, wind ${slot.windSpeed} m/s, humidity ${slot.humidity}%`
        )
        .join('\n')

    return weatherSummary
  } catch (error) {
    console.error('Error fetching weather data:', error)
    return 'Weather data unavailable due to error'
  }
}
