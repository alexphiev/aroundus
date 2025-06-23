"use server";

import type {
  CurrentWeatherApiResponse,
  CurrentWeatherResponse,
  ForecastApiResponse,
  ForecastResponse,
} from "@/types/weather.types";

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

if (!OPENWEATHER_API_KEY) {
  console.warn(
    "OPENWEATHER_API_KEY is not set. Weather functionality will not work.",
  );
}

/**
 * Fetch current weather data for given coordinates
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Current weather data or error
 */
export async function getCurrentWeather(
  lat: number,
  lon: number,
): Promise<CurrentWeatherApiResponse> {
  if (!OPENWEATHER_API_KEY) {
    return { error: "OpenWeather API key is not configured" };
  }

  try {
    const url =
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: `Weather API error: ${response.status} ${response.statusText}${
          errorData.message ? ` - ${errorData.message}` : ""
        }`,
      };
    }

    const data: CurrentWeatherResponse = await response.json();
    return { data };
  } catch (error) {
    console.error("Error fetching current weather:", error);
    return {
      error: error instanceof Error
        ? error.message
        : "Failed to fetch current weather data",
    };
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
  lon: number,
): Promise<ForecastApiResponse> {
  if (!OPENWEATHER_API_KEY) {
    return { error: "OpenWeather API key is not configured" };
  }

  try {
    const url =
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: `Weather API error: ${response.status} ${response.statusText}${
          errorData.message ? ` - ${errorData.message}` : ""
        }`,
      };
    }

    const data: ForecastResponse = await response.json();
    return { data };
  } catch (error) {
    console.error("Error fetching 5-day forecast:", error);
    return {
      error: error instanceof Error
        ? error.message
        : "Failed to fetch 5-day forecast data",
    };
  }
}
