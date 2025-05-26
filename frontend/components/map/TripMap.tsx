"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl, { Map, Marker, LngLatBounds } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface TripLocation {
  latitude: number;
  longitude: number;
}

interface TripResult {
  name: string;
  description: string;
  lat: number;
  long: number;
  landscape?:
    | "mountain"
    | "forest"
    | "lake"
    | "beach"
    | "river"
    | "park"
    | "wetland"
    | "desert"
    | string;
  activity?:
    | "hiking"
    | "biking"
    | "camping"
    | "photography"
    | "wildlife"
    | "walking"
    | "swimming"
    | string;
}

interface TripMapProps {
  tripResults: TripResult[] | null;
  userLocation?: TripLocation | null; // Optional user location to center map initially
  className?: string; // Allow passing custom classes
  activeMarkerIndex?: number; // Index of the active marker to highlight
}

const TripMap: React.FC<TripMapProps> = ({
  tripResults,
  userLocation,
  className = "",
  activeMarkerIndex = 0,
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef<Marker[]>([]);

  // A simple, publicly available style. Replace with your preferred style URL.
  // Consider using MapTiler (https://www.maptiler.com/cloud/) for more robust and customizable maps.
  const mapStyle =
    "https://api.maptiler.com/maps/topo-v2/style.json?key=Gxxj1jCvJhu2HSp6n0tp";

  useEffect(() => {
    if (map.current || !mapContainer.current) return; // Initialize map only once and if container is available

    // Use a nice scenic default location (Yosemite Valley)
    let initialCenter: [number, number] = [2.3522, 48.8566]; // Paris coordinates
    let initialZoom = 4;

    if (tripResults && tripResults.length > 0) {
      initialCenter = [tripResults[0].long, tripResults[0].lat];
      initialZoom = 9;
    } else if (userLocation) {
      initialCenter = [userLocation.longitude, userLocation.latitude];
      initialZoom = 10;
    }

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: initialCenter,
        zoom: initialZoom,
      });

      map.current.on("load", () => {
        setMapLoaded(true);
        // Add navigation controls (zoom, rotation)
        map.current?.addControl(
          new maplibregl.NavigationControl(),
          "bottom-right" // Move controls to bottom-right
        );
      });
    } catch (error) {
      console.error("Error initializing MapLibre:", error);
      // Optionally, display an error message to the user in the map container
      if (mapContainer.current) {
        mapContainer.current.innerHTML =
          '<p class="text-red-500 p-4">Could not load map. Please try again later.</p>';
      }
    }

    // Cleanup map instance on component unmount
    return () => {
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, [userLocation]); // Re-run if userLocation changes and map not yet initialized with it.

  // Get marker color based on landscape type
  const getMarkerColor = (trip: TripResult) => {
    if (!trip.landscape) return "#ef4444"; // Default red

    const landscape = trip.landscape.toLowerCase();

    if (landscape.includes("mountain")) return "#854d0e"; // Amber-like color
    if (landscape.includes("forest")) return "#166534"; // Forest green
    if (
      landscape.includes("lake") ||
      landscape.includes("river") ||
      landscape.includes("beach") ||
      landscape.includes("water")
    )
      return "#0e7490"; // Cyan-like color
    if (landscape.includes("park")) return "#4d7c0f"; // Lime-like color
    if (landscape.includes("wetland")) return "#0f766e"; // Teal-like color
    if (landscape.includes("desert")) return "#b45309"; // Amber-like color

    // Default fallback
    return "#ef4444"; // Default red
  };

  // Get icon HTML for the marker based on activity type
  const getMarkerIcon = (trip: TripResult) => {
    if (!trip.activity) return ""; // Default empty

    const activity = trip.activity.toLowerCase();

    let iconPath = "";

    if (activity.includes("hik")) {
      iconPath = "M7,14h2v3H7v-3m5-5v8h3v-3h2v3h3v-8h-2v3h-2v-3h-4Z";
    } else if (activity.includes("bik")) {
      iconPath =
        "M5,20.5A3.5,3.5 0 0,1 1.5,17A3.5,3.5 0 0,1 5,13.5A3.5,3.5 0 0,1 8.5,17A3.5,3.5 0 0,1 5,20.5M5,12A5,5 0 0,0 0,17A5,5 0 0,0 5,22A5,5 0 0,0 10,17A5,5 0 0,0 5,12M14.8,10H19V8.2H15.8L13.8,4.8C13.3,4.3 12.6,4 11.8,4C10.8,4 10,4.8 10,5.8C10,6.8 10.8,7.6 11.8,7.6H12.7L14.8,10M13,19.5A3.5,3.5 0 0,1 9.5,16A3.5,3.5 0 0,1 13,12.5A3.5,3.5 0 0,1 16.5,16A3.5,3.5 0 0,1 13,19.5M13,11A5,5 0 0,0 8,16A5,5 0 0,0 13,21A5,5 0 0,0 18,16A5,5 0 0,0 13,11Z";
    } else if (activity.includes("camp")) {
      iconPath = "M8,6V21H16V6C16,3.24 13.76,1 11,1C8.24,1 6,3.24 6,6H8Z";
    } else if (activity.includes("photo")) {
      iconPath =
        "M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z";
    } else if (activity.includes("wild")) {
      iconPath =
        "M12,3C13.74,3 15.36,3.5 16.74,4.35C17.38,3.53 18.26,3 19.5,3C20.88,3 22,4.12 22,5.5C22,6.31 21.69,7 21.17,7.54C21.69,8.53 22,9.72 22,11C22,12.28 21.69,13.47 21.17,14.46C21.69,15 22,15.69 22,16.5C22,17.88 20.88,19 19.5,19C18.26,19 17.38,18.47 16.74,17.65C15.36,18.5 13.74,19 12,19C8.13,19 5,15.87 5,12C5,8.13 8.13,5 12,5C15.87,5 19,8.13 19,12";
    } else if (activity.includes("walk")) {
      iconPath =
        "M14.12,10H19V8.2H15.38L13.38,4.87C13.08,4.37 12.54,4.03 11.92,4.03C11.74,4.03 11.58,4.06 11.42,4.11L6,5.8V11H7.8V7.33L9.91,6.67L6,22H7.8L10.67,13.89L13,17V22H14.8V15.59L12.31,11.05L13.04,8.18M14,3.8C15,3.8 15.8,3 15.8,2C15.8,1 15,0.2 14,0.2C13,0.2 12.2,1 12.2,2C12.2,3 13,3.8 14,3.8Z";
    } else if (activity.includes("swim")) {
      iconPath =
        "M2,18.8C2.5,18.9 3,19 3.5,19C4.5,19 5.5,18.8 6.4,18.4C7.4,18.8 8.3,19 9.3,19C10.3,19 11.3,18.8 12.2,18.4C13.1,18.8 14.1,19 15,19C16,19 16.9,18.8 17.9,18.4C18.8,18.8 19.8,19 20.8,19C21.3,19 21.8,19 22.3,18.9V17C21.8,17.2 21.3,17.3 20.8,17.3C19.8,17.3 18.8,17 18,16.6C17.1,17 16.1,17.3 15,17.3C14,17.3 13,17 12.2,16.6C11.3,17 10.3,17.3 9.3,17.3C8.2,17.3 7.2,17 6.4,16.6C5.5,17 4.6,17.3 3.5,17.3C3,17.3 2.5,17.2 2,17V18.8M2,16.1C2.5,16.3 3,16.5 3.5,16.5C4.5,16.5 5.5,16.2 6.4,15.8C7.4,16.2 8.3,16.5 9.3,16.5C10.3,16.5 11.3,16.2 12.2,15.8C13.1,16.2 14.1,16.5 15,16.5C16,16.5 16.9,16.2 17.9,15.8C18.8,16.2 19.8,16.5 20.8,16.5C21.3,16.5 21.8,16.3 22.3,16.1V13.7C21.2,13.7 19.9,13.4 18.9,12.9C18.3,12.6 17.9,12.2 17.9,12.2C17.9,12.2 17.5,12.6 16.9,12.9C15.9,13.4 14.7,13.7 13.5,13.7C12.3,13.7 11.1,13.4 10.1,12.9C9.5,12.6 9.1,12.2 9.1,12.2C9.1,12.2 8.7,12.6 8.1,12.9C7.1,13.4 5.9,13.7 4.7,13.7C3.5,13.7 2.3,13.4 1.3,12.9C1.1,12.8 1,12.7 0.9,12.6L2,13.5V16.1M4.3,10C3.6,10 3.1,10.2 2.5,10.2C2.8,10.7 3.5,11 4.3,11C5.7,11 7,10.1 7,9.2C7,9.9 5.7,10 4.3,10M8.3,10C7.6,10 7.1,10.2 6.5,10.2C6.8,10.7 7.5,11 8.3,11C9.7,11 11,10.1 11,9.2C11,9.9 9.7,10 8.3,10M15,9.2C15,10 13.7,11 12.3,11C11.5,11 10.8,10.7 10.5,10.2C11.1,10.2 11.6,10 12.3,10C13.7,10 15,9.9 15,9.2M20,9.2C20,10 18.7,11 17.3,11C16.5,11 15.8,10.7 15.5,10.2C16.1,10.2 16.6,10 17.3,10C18.7,10 20,9.9 20,9.2M11,6.4C8.2,6.4 6.1,7.8 6.1,9.2C7.3,8.5 9.1,8 11,8C12.9,8 14.7,8.5 15.9,9.2C15.9,7.8 13.8,6.4 11,6.4M17.3,6.4C14.5,6.4 12.4,7.8 12.4,9.2C13.6,8.5 15.4,8 17.3,8C19.2,8 21,8.5 22.2,9.2V6.5C22.2,6.5 20,6.4 17.3,6.4M3.8,4.6C4.3,4.3 4.8,4.2 5.5,4.2C7.6,4.2 9.1,5.7 9,7.8C9,6.8 8.5,5.7 7.7,5C7.2,4.5 6.7,4.3 6.4,4.1C5.5,3.9 4.5,4 3.8,4.6Z";
    } else {
      return ""; // No matching activity
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="white">
              <path d="${iconPath}" />
            </svg>`;
  };

  useEffect(() => {
    if (!map.current || !mapLoaded || !tripResults) return;

    // Remove existing markers before adding new ones
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add user location marker if available
    if (userLocation) {
      const userEl = document.createElement("div");
      userEl.className = "user-location-marker";
      userEl.style.width = "30px";
      userEl.style.height = "30px";
      userEl.style.borderRadius = "50%";
      userEl.style.background = "#3b82f6"; // Blue color for user location
      userEl.style.cursor = "pointer";
      userEl.style.border = "3px solid white";
      userEl.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
      userEl.style.zIndex = "3"; // Higher than other markers

      // Add a ripple effect
      userEl.innerHTML = `
        <div style="
          position: absolute;
          top: -5px;
          left: -5px;
          right: -5px;
          bottom: -5px;
          border-radius: 50%;
          border: 3px solid #3b82f680;
          animation: ripple 1.5s infinite;
        "></div>
        <style>
          @keyframes ripple {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
          }
        </style>
      `;

      const userMarker = new maplibregl.Marker({ element: userEl })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .setPopup(
          new maplibregl.Popup().setHTML(
            `<h6 class="font-bold">Your Location</h6>`
          )
        )
        .addTo(map.current!);

      markersRef.current.push(userMarker);
    }

    if (tripResults.length > 0) {
      const bounds = new LngLatBounds();

      // If user location exists, extend bounds to include it
      if (userLocation) {
        bounds.extend([userLocation.longitude, userLocation.latitude]);
      }

      tripResults.forEach((trip, index) => {
        // Create a custom HTML element for the marker
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.style.width = "30px";
        el.style.height = "30px";
        el.style.borderRadius = "50%";
        el.style.background =
          index === activeMarkerIndex
            ? "#1d4ed8" // Active blue color
            : getMarkerColor(trip); // Color based on landscape
        el.style.cursor = "pointer";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
        el.style.transform =
          index === activeMarkerIndex ? "scale(1.2)" : "scale(1)";
        el.style.zIndex = index === activeMarkerIndex ? "2" : "1";
        el.style.display = "flex";
        el.style.justifyContent = "center";
        el.style.alignItems = "center";
        el.style.color = "white";

        // Add icon or number
        const activityIcon = getMarkerIcon(trip);
        if (activityIcon) {
          el.innerHTML = activityIcon;
        } else {
          el.textContent = `${index + 1}`;
        }

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([trip.long, trip.lat])
          .setPopup(
            new maplibregl.Popup().setHTML(
              `<h6 class="font-bold">${trip.name}</h6>
               <p>${trip.description.substring(0, 50)}...</p>
               ${trip.landscape ? `<p class="text-xs mt-1 capitalize"><strong>Landscape:</strong> ${trip.landscape}</p>` : ""}
               ${trip.activity ? `<p class="text-xs capitalize"><strong>Activity:</strong> ${trip.activity}</p>` : ""}`
            )
          )
          .addTo(map.current!);

        if (index === activeMarkerIndex) {
          marker.togglePopup(); // Show popup for active marker
        }

        markersRef.current.push(marker);
        bounds.extend([trip.long, trip.lat]);
      });

      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
      }
    }
  }, [tripResults, mapLoaded, userLocation]);

  // Update active marker when activeMarkerIndex changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !tripResults || tripResults.length === 0)
      return;

    markersRef.current.forEach((marker, index) => {
      if (index === 0 && userLocation) return; // Skip user location marker

      const actualTripIndex = userLocation ? index - 1 : index;
      if (actualTripIndex < 0 || actualTripIndex >= tripResults.length) return;

      const trip = tripResults[actualTripIndex];
      const el = marker.getElement();

      // Update marker styles based on active state
      el.style.background =
        actualTripIndex === activeMarkerIndex
          ? "#1d4ed8"
          : getMarkerColor(trip);
      el.style.transform =
        actualTripIndex === activeMarkerIndex ? "scale(1.2)" : "scale(1)";
      el.style.zIndex = actualTripIndex === activeMarkerIndex ? "2" : "1";

      // Hide all popups
      marker.getPopup().remove();

      // Show popup only for active marker
      if (actualTripIndex === activeMarkerIndex) {
        marker.togglePopup();

        // Pan to the active marker
        map.current?.flyTo({
          center: [trip.long, trip.lat],
          zoom: 11,
          duration: 1000,
        });
      }
    });
  }, [activeMarkerIndex, tripResults, mapLoaded, userLocation]);

  return (
    <div
      ref={mapContainer}
      className={`w-full h-full rounded-lg shadow-md bg-muted overflow-hidden relative ${className}`}
      aria-label="Map of trip suggestions"
    >
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      )}
    </div>
  );
};

export default TripMap;
