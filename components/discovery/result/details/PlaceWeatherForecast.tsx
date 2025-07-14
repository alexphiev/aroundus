'use client'

import { getFiveDayForecast } from '@/actions/weather.actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  DailyWeatherSummary,
  ForecastItem,
  ForecastResponse,
} from '@/types/weather.types'
import {
  AlertTriangle,
  Cloud,
  CloudRain,
  CloudSnow,
  Droplets,
  Loader2,
  Sun,
  Thermometer,
  Wind,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface WeatherForecastProps {
  lat: number
  lon: number
}

export default function WeatherForecast({ lat, lon }: WeatherForecastProps) {
  const [weatherData, setWeatherData] = useState<DailyWeatherSummary[] | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWeather() {
      setIsLoading(true)
      setError(null)

      try {
        const result = await getFiveDayForecast(lat, lon)

        if (result.error) {
          setError(result.error)
          return
        }

        if (result.data) {
          // Process forecast data into daily summaries
          const dailySummaries = processForecastData(result.data)
          setWeatherData(dailySummaries)
        }
      } catch (err) {
        setError('Failed to fetch weather data')
        console.error('Weather fetch error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWeather()
  }, [lat, lon])

  // Process raw forecast data into daily summaries
  function processForecastData(
    forecast: ForecastResponse
  ): DailyWeatherSummary[] {
    const dailyData: { [key: string]: ForecastItem[] } = {}

    // Group forecast items by date
    forecast.list.forEach((item) => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0]
      if (!dailyData[date]) {
        dailyData[date] = []
      }
      dailyData[date].push(item)
    })

    // Convert to daily summaries
    return Object.entries(dailyData)
      .map(([date, items]) => {
        const temps = items.map((item) => item.main.temp)
        const minTemp = Math.min(...temps)
        const maxTemp = Math.max(...temps)
        const avgTemp =
          temps.reduce((sum, temp) => sum + temp, 0) / temps.length

        // Find the most common weather condition
        const weatherCounts: { [key: string]: number } = {}
        items.forEach((item) => {
          const condition = item.weather[0].main
          weatherCounts[condition] = (weatherCounts[condition] || 0) + 1
        })

        const dominantWeather =
          items.find(
            (item) =>
              item.weather[0].main ===
              Object.keys(weatherCounts).reduce((a, b) =>
                weatherCounts[a] > weatherCounts[b] ? a : b
              )
          )?.weather[0] || items[0].weather[0]

        // Calculate average precipitation chance
        const avgPrecipChance =
          items.reduce((sum, item) => sum + item.pop, 0) / items.length

        // Calculate average wind speed
        const avgWindSpeed =
          items.reduce((sum, item) => sum + item.wind.speed, 0) / items.length

        // Calculate average humidity
        const avgHumidity =
          items.reduce((sum, item) => sum + item.main.humidity, 0) /
          items.length

        return {
          date,
          dateObj: new Date(date),
          tempMin: Math.round(minTemp),
          tempMax: Math.round(maxTemp),
          avgTemp: Math.round(avgTemp),
          dominantWeather,
          precipitationChance: Math.round(avgPrecipChance * 100),
          windSpeed: Math.round(avgWindSpeed),
          humidity: Math.round(avgHumidity),
          items,
        }
      })
      .slice(0, 5)
  }

  // Get weather icon based on condition
  function getWeatherIcon(condition: string, size: string = 'h-4 w-4') {
    switch (condition.toLowerCase()) {
      case 'clear':
        return <Sun className={`${size} text-yellow-500`} />
      case 'clouds':
        return <Cloud className={`${size} text-gray-500`} />
      case 'rain':
        return <CloudRain className={`${size} text-blue-500`} />
      case 'snow':
        return <CloudSnow className={`${size} text-blue-200`} />
      case 'thunderstorm':
        return <Zap className={`${size} text-purple-500`} />
      case 'drizzle':
        return <Droplets className={`${size} text-blue-400`} />
      default:
        return <Cloud className={`${size} text-gray-500`} />
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Thermometer className="h-4 w-4" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">
              Loading weather...
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Thermometer className="h-4 w-4" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-4">
            <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
            <span className="text-sm text-muted-foreground">{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Thermometer className="h-4 w-4" />
          3-Day Weather
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {weatherData?.map((day, index) => (
            <div
              key={day.date}
              className="flex items-center justify-between py-2 px-3"
            >
              <div className="flex items-center gap-2">
                {getWeatherIcon(day.dominantWeather.main)}
                <div>
                  <p className="text-sm font-medium">
                    {index === 0
                      ? 'Today'
                      : index === 1
                        ? 'Tomorrow'
                        : day.dateObj.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {day.dominantWeather.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <Thermometer className="h-3 w-3 text-orange-500" />
                  <span>
                    {day.tempMin}°/{day.tempMax}°
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-blue-500" />
                  <span>{day.precipitationChance}%</span>
                </div>

                <div className="flex items-center gap-1">
                  <Wind className="h-3 w-3 text-gray-500" />
                  <span>{day.windSpeed} m/s</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-muted">
          <p className="text-xs text-muted-foreground">
            Weather data from OpenWeather
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
