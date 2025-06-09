"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl, { Map, Marker, LngLatBounds } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Mountain,
  Trees,
  Waves,
  TreePine,
  Droplets,
  Flower2,
  Sun,
} from "lucide-react";

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
  shouldUpdateBounds?: boolean; // Whether to update map bounds when results change
  isProgressiveSearch?: boolean; // Whether this is a progressive search
}

const TripMap: React.FC<TripMapProps> = ({
  tripResults,
  userLocation,
  className = "",
  activeMarkerIndex = 0,
  shouldUpdateBounds = true,
  isProgressiveSearch = false,
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef<Marker[]>([]);
  const previousResultsLength = useRef<number>(0);

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

  // Get landscape icon for the marker (matching card icons exactly)
  const getLandscapeIcon = (landscape?: string) => {
    if (!landscape) return TreePine;

    switch (landscape.toLowerCase()) {
      case "mountain":
        return Mountain;
      case "forest":
        return Trees;
      case "lake":
        return Waves;
      case "beach":
        return Sun;
      case "river":
        return Droplets;
      case "park":
        return Flower2;
      case "wetland":
        return Droplets;
      case "desert":
        return Sun;
      default:
        return TreePine;
    }
  };

  // Convert React icon to SVG string for map marker using correct Lucide paths
  const iconToSvg = (IconComponent: any) => {
    const iconName = IconComponent.name || "TreePine";

    // Use the actual Lucide icon SVG paths
    const iconSvgs: { [key: string]: string } = {
      Mountain: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5v11H3V6l5 5 4-8z"/></svg>`,
      Trees: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10v.2A3 3 0 0 1 8.9 16v0H5v0h0A3 3 0 0 1 5 10.2V10l.005-.217A3 3 0 0 1 8 7.003V7a3 3 0 0 1 6 0v.003a3 3 0 0 1 2.995 2.783L17 10v.2A3 3 0 0 1 15.9 16v0H19v0h0A3 3 0 0 1 19 10.2V10l.005-.217A3 3 0 0 1 22 7.003V7a3 3 0 0 1-6 0v.003a3 3 0 0 1-2.995 2.783L13 10z"/></svg>`,
      Waves: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`,
      Sun: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="m12 2 0 2"/><path d="m12 20 0 2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="m2 12 2 0"/><path d="m20 12 2 0"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
      Droplets: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.19 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2.26 4.89 4.56 6.68a7.58 7.58 0 0 1 2.79 5.83 7.36 7.36 0 0 1-2.11 5.47 7.29 7.29 0 0 1-10.48 0 7.1 7.1 0 0 1-2.11-5.47 7.2 7.2 0 0 1 2.79-5.83 12.51 12.51 0 0 0 3.12-3.1z"/></svg>`,
      Flower2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 3-3"/><path d="M9 11a3 3 0 1 0 3 3 3 3 0 0 0-3-3"/><path d="M15 11a3 3 0 1 0 3 3 3 3 0 0 0-3-3"/><path d="M11 15a3 3 0 1 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 3-3"/><path d="M20 9v6"/><path d="M4 15V9"/><path d="M17 12h3"/><path d="M4 12h3"/></svg>`,
      TreePine: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17z"/><path d="M12 22v-3"/></svg>`,
    };

    return iconSvgs[iconName] || iconSvgs.TreePine;
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
      userEl.style.width = "18px";
      userEl.style.height = "18px";
      userEl.style.borderRadius = "50%";
      userEl.style.background = "#3b82f6"; // Blue color for user location
      userEl.style.cursor = "pointer";
      userEl.style.border = "2px solid white";
      userEl.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";
      userEl.style.zIndex = "3"; // Higher than other markers

      // Add a ripple effect
      userEl.innerHTML = `
        <div style="
          position: absolute;
          top: -3px;
          left: -3px;
          right: -3px;
          bottom: -3px;
          border-radius: 50%;
          border: 2px solid #3b82f680;
          animation: ripple 1.5s infinite;
        "></div>
        <style>
          @keyframes ripple {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.4); opacity: 0; }
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

    // Always set up bounds if we have user location or trip results
    if (tripResults.length > 0 || userLocation) {
      const bounds = new LngLatBounds();

      // If user location exists, extend bounds to include it
      if (userLocation) {
        bounds.extend([userLocation.longitude, userLocation.latitude]);
      }

      tripResults.forEach((trip, index) => {
        // Create a custom HTML element for the marker that matches card styling
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.style.cursor = "pointer";
        el.style.transform =
          index === activeMarkerIndex ? "scale(1.2)" : "scale(1)";
        el.style.zIndex = index === activeMarkerIndex ? "2" : "1";
        el.style.transition = "all 0.3s ease";
        el.style.filter =
          index === activeMarkerIndex
            ? "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
            : "drop-shadow(0 2px 4px rgba(0,0,0,0.2))";

        // Create the exact same styling as the card icons
        const iconContainer = document.createElement("div");
        iconContainer.style.background = "hsl(var(--primary))"; // bg-primary (100% opacity)
        iconContainer.style.padding = "4px"; // p-1
        iconContainer.style.borderRadius = "50%"; // rounded-full
        iconContainer.style.display = "flex";
        iconContainer.style.justifyContent = "center";
        iconContainer.style.alignItems = "center";
        iconContainer.style.width = "28px";
        iconContainer.style.height = "28px";
        iconContainer.style.border = "2px solid white";
        iconContainer.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";

        // Add landscape icon (matching the card icons)
        const LandscapeIcon = getLandscapeIcon(trip.landscape);
        const landscapeIconSvg = iconToSvg(LandscapeIcon);
        iconContainer.innerHTML = landscapeIconSvg;

        el.appendChild(iconContainer);

        // Add popping animation for new markers
        const currentLength = tripResults.length;
        const prevLength = previousResultsLength.current;
        const isNewMarker = index >= prevLength;

        if (isNewMarker && isProgressiveSearch) {
          // Initial state for animation
          el.style.transform = "scale(0)";
          el.style.opacity = "0";

          // Trigger pop animation after a slight delay
          setTimeout(() => {
            el.style.transform =
              index === activeMarkerIndex ? "scale(1.3)" : "scale(1.1)";
            el.style.opacity = "1";

            // Settle to normal size
            setTimeout(() => {
              el.style.transform =
                index === activeMarkerIndex ? "scale(1.2)" : "scale(1)";
            }, 200);
          }, index * 100); // Stagger animations for multiple new markers
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

      // Update bounds when new results are added or when showing just user location
      if (shouldUpdateBounds && !bounds.isEmpty()) {
        const currentLength = tripResults.length;
        const prevLength = previousResultsLength.current;

        // Always update on first results or when search is complete
        // For progressive search, also update when new results are added
        // Also update when we only have user location (no trip results)
        if (
          prevLength === 0 ||
          currentLength > prevLength ||
          !isProgressiveSearch ||
          (tripResults.length === 0 && userLocation)
        ) {
          if (tripResults.length === 0 && userLocation) {
            // When only showing user location, zoom to a reasonable level
            map.current.flyTo({
              center: [userLocation.longitude, userLocation.latitude],
              zoom: 11,
              duration: 1000,
            });
          } else {
            map.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
          }
        }

        // Update the previous results length
        previousResultsLength.current = currentLength;
      }
    }
  }, [
    tripResults,
    mapLoaded,
    userLocation,
    shouldUpdateBounds,
    isProgressiveSearch,
  ]);

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
      el.style.transform =
        actualTripIndex === activeMarkerIndex ? "scale(1.2)" : "scale(1)";
      el.style.zIndex = actualTripIndex === activeMarkerIndex ? "2" : "1";
      el.style.filter =
        actualTripIndex === activeMarkerIndex
          ? "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
          : "drop-shadow(0 2px 4px rgba(0,0,0,0.2))";

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
