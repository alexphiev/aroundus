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
  starRating?: number;
}

interface TripMapProps {
  tripResults: TripResult[] | null;
  userLocation?: TripLocation | null; // Optional user location to center map initially
  className?: string; // Allow passing custom classes
  activeMarkerIndex?: number; // Index of the active marker to highlight (-1 for none)
  shouldUpdateBounds?: boolean; // Whether to update map bounds when results change
  isProgressiveSearch?: boolean; // Whether this is a progressive search
  onMarkerClick?: (index: number) => void; // Callback when marker is clicked
  onPopupClose?: () => void; // Callback when popup is closed
}

const TripMap: React.FC<TripMapProps> = ({
  tripResults,
  userLocation,
  className = "",
  activeMarkerIndex = -1,
  shouldUpdateBounds = true,
  isProgressiveSearch = false,
  onMarkerClick,
  onPopupClose,
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
        el.style.transform = "scale(1)"; // No auto-scaling on initial load
        el.style.zIndex = "1";
        el.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.2))";

        // Create tree icons based on star rating
        const starRating = trip.starRating || 1; // Default to 1 if no rating
        const numTrees = Math.min(Math.max(starRating, 1), 3); // Ensure between 1-3 trees

        const iconContainer = document.createElement("div");
        iconContainer.style.display = "flex";
        iconContainer.style.alignItems = "center";
        iconContainer.style.justifyContent = "center";
        iconContainer.style.position = "relative";

        // Tree icon SVG in primary color with accent border - crisp rendering
        const treeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="hsl(var(--primary))" stroke="hsl(var(--accent))" stroke-width="1.5" style="shape-rendering: crispEdges; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;"><path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17z"/><path d="M12 22v-3"/></svg>`;

        // Add the appropriate number of tree icons with overlapping positioning
        for (let i = 0; i < numTrees; i++) {
          const treeIcon = document.createElement("div");
          treeIcon.innerHTML = treeIconSvg;
          treeIcon.style.display = "flex";
          treeIcon.style.alignItems = "center";
          treeIcon.style.justifyContent = "center";
          treeIcon.style.position = "absolute";
          treeIcon.style.left = `${i * 8.5}px`; // Overlap by positioning each tree 8.5px apart
          treeIcon.style.zIndex = `${numTrees - i}`; // Stack them properly
          // Ensure crisp rendering
          treeIcon.style.imageRendering = "crisp-edges";
          treeIcon.style.imageRendering = "-webkit-optimize-contrast";
          treeIcon.style.transform = "translateZ(0)"; // Force hardware acceleration
          iconContainer.appendChild(treeIcon);
        }

        // Set container width to accommodate overlapping trees
        iconContainer.style.width = `${36 + (numTrees - 1) * 12}px`;
        iconContainer.style.height = "36px";

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

        // Add click handler to marker
        el.addEventListener("click", () => {
          if (onMarkerClick) {
            onMarkerClick(index);
          }
        });

        const popup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          offset: [0, -10],
          className: "custom-popup",
        }).setHTML(
          `<div class="p-2 pr-4">
            <h6 class="font-bold text-sm">${trip.name}</h6>
           </div>`
        );

        // Add close event listener to popup
        popup.on('close', () => {
          if (onPopupClose) {
            onPopupClose();
          }
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([trip.long, trip.lat])
          .setPopup(popup)
          .addTo(map.current!);

        // Don't auto-show popup for active marker on initial load

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
      const isActive =
        actualTripIndex === activeMarkerIndex && activeMarkerIndex >= 0;
      el.style.transform = isActive ? "scale(1.2)" : "scale(1)";
      el.style.zIndex = isActive ? "2" : "1";
      el.style.filter = isActive
        ? "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
        : "drop-shadow(0 2px 4px rgba(0,0,0,0.2))";

      // Hide all popups first
      marker.getPopup().remove();

      // Show popup and pan only for active marker (when user clicks)
      if (isActive) {
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
    <>
      <style>{`
        .custom-popup {
          z-index: 1000 !important;
        }
        .custom-popup .maplibregl-popup-content {
          padding: 0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000 !important;
        }
        .custom-popup .maplibregl-popup-close-button {
          right: 2px;
          top: 2px;
          font-size: 16px;
          width: 24px;
          height: 28px;
          z-index: 1001 !important;
        }
        .custom-popup .maplibregl-popup-tip {
          border-top-color: white;
          z-index: 1000 !important;
        }
      `}</style>
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
    </>
  );
};

export default TripMap;
