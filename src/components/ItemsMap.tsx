import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  collection,
  getDocs,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/app/firebase/config";

// API Keys - In production, move these to environment variables
const MAP_TILER_API_KEY = "JsHqOp9SqKGMUgYiibdt";
const OPEN_CAGE_API_KEY = "60e64bf3f33b40158223b9ea8354791b";

// Types
interface ItemLocation {
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
}

interface Owner {
  fullname: string;
  id: string;
}

interface Item {
  id: string;
  createdAt: Timestamp;
  enableAI: boolean;
  images: string[];
  itemCategory: string;
  itemCondition: string;
  itemDesc: string;
  itemLocation: ItemLocation;
  itemMinRentDuration: number;
  itemName: string;
  itemPrice: number;
  itemStatus: string;
  owner: Owner;
  rentedAt?: Timestamp;
  rentedTo?: string;
  updatedAt: Timestamp;
}

interface OpenCageResponse {
  results: Array<{
    formatted: string;
    components: {
      city?: string;
      state?: string;
      country?: string;
      postcode?: string;
    };
  }>;
  status: {
    code: number;
    message: string;
  };
}

// Extend window type for global function
declare global {
  interface Window {
    selectItem?: (itemId: string) => void;
  }
}

const ItemsMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reverseGeocodingCache, setReverseGeocodingCache] = useState<
    Map<string, string>
  >(new Map());

  // Reverse geocoding function using OpenCage
  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;

      // Check cache first
      if (reverseGeocodingCache.has(cacheKey)) {
        return reverseGeocodingCache.get(cacheKey)!;
      }

      try {
        const response = await fetch(
          `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPEN_CAGE_API_KEY}&limit=1&no_annotations=1`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: OpenCageResponse = await response.json();

        if (data.status.code === 200 && data.results.length > 0) {
          const address = data.results[0].formatted;
          setReverseGeocodingCache(
            (prev) => new Map(prev.set(cacheKey, address))
          );
          return address;
        } else {
          return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
      } catch (error) {
        console.log("Reverse geocoding failed:", error);
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    },
    [reverseGeocodingCache]
  );

  // Fetch items from Firestore
  useEffect(() => {
    const fetchItems = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const itemsCollection = collection(db, "items");
        const itemsSnapshot = await getDocs(itemsCollection);
        const itemsData: Item[] = itemsSnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Item)
        );

        // Filter items that have valid location data
        const validItems = itemsData.filter(
          (item: Item) =>
            item.itemLocation &&
            typeof item.itemLocation.latitude === "number" &&
            typeof item.itemLocation.longitude === "number" &&
            !isNaN(item.itemLocation.latitude) &&
            !isNaN(item.itemLocation.longitude)
        );

        // Enhance items with reverse geocoded addresses if not present
        const enhancedItems = await Promise.all(
          validItems.map(async (item) => {
            if (
              !item.itemLocation.address ||
              item.itemLocation.address.trim() === ""
            ) {
              try {
                const address = await reverseGeocode(
                  item.itemLocation.latitude,
                  item.itemLocation.longitude
                );
                return {
                  ...item,
                  itemLocation: {
                    ...item.itemLocation,
                    address,
                  },
                };
              } catch (error) {
                console.log(
                  `Failed to reverse geocode for item ${item.id}:`,
                  error
                );
                return item;
              }
            }
            return item;
          })
        );

        setItems(enhancedItems);
      } catch (err) {
        console.log("Error fetching items:", err);
        setError("Failed to fetch items from database");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [reverseGeocode]);

  // Initialize map with MapTiler
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAP_TILER_API_KEY}`,
        center: [123.8854, 10.3157], // Cebu City coordinates
        zoom: 12,
      });

      // Add navigation controls
      map.current.addControl(new maplibregl.NavigationControl(), "top-right");

      // Add scale control
      map.current.addControl(
        new maplibregl.ScaleControl({
          maxWidth: 100,
          unit: "metric",
        }),
        "bottom-left"
      );

      // Add attribution for MapTiler and OpenCage
      map.current.on("load", () => {
        if (map.current) {
          const attributionControl = map.current._controls.find(
            (control: any) => control instanceof maplibregl.AttributionControl
          );
          if (attributionControl) {
            attributionControl._innerContainer.innerHTML +=
              ' | <a href="https://www.maptiler.com/" target="_blank">© MapTiler</a> | <a href="https://opencagedata.com/" target="_blank">© OpenCage</a>';
          }
        }
      });
    } catch (err) {
      console.log("Error initializing map:", err);
      setError("Failed to initialize map");
    }

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add markers when items are loaded
  useEffect(() => {
    if (!map.current || items.length === 0) return;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll(".custom-marker");
    existingMarkers.forEach((marker) => marker.remove());

    const bounds = new maplibregl.LngLatBounds();
    const markers: maplibregl.Marker[] = [];

    items.forEach((item: Item, index: number) => {
      const { latitude, longitude } = item.itemLocation;

      // Validate coordinates
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        return;
      }

      // Create custom marker element
      const markerElement = document.createElement("div");
      markerElement.className = "custom-marker";
      markerElement.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        z-index: 1000;
        transition: all 0.2s ease;
      `;
      markerElement.textContent = (index + 1).toString();

      // Add hover effects
      markerElement.addEventListener("mouseenter", () => {
        markerElement.style.transform = "scale(1.1)";
        markerElement.style.boxShadow = "0 6px 20px rgba(59, 130, 246, 0.4)";
      });

      markerElement.addEventListener("mouseleave", () => {
        markerElement.style.transform = "scale(1)";
        markerElement.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
      });

      // Create enhanced popup content
      const popupContent = `
        <div style="max-width: 250px; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="display: flex; align-items: start; gap: 8px; margin-bottom: 8px;">
            ${
              item.images && item.images.length > 0
                ? `<img src="${item.images[0]}" alt="${item.itemName}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; flex-shrink: 0;" onerror="this.style.display='none'">`
                : ""
            }
            <div style="flex: 1; min-width: 0;">
              <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1f2937; line-height: 1.2;">${
                item.itemName || "Unnamed Item"
              }</h3>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; line-height: 1.3;">${
                item.itemCategory || "N/A"
              } • ${item.itemCondition || "N/A"}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 16px; font-weight: 700; color: #059669;">$${
                item.itemPrice || 0
              }</span>
              <span style="font-size: 11px; padding: 2px 6px; border-radius: 12px; ${
                item.itemStatus === "available"
                  ? "background: #d1fae5; color: #065f46;"
                  : "background: #fee2e2; color: #991b1b;"
              }">${item.itemStatus || "Unknown"}</span>
            </div>
            <p style="margin: 0; font-size: 11px; color: #6b7280; line-height: 1.3;">📍 ${
              item.itemLocation?.address || "Location not specified"
            }</p>
          </div>
          
          <button 
            onclick="window.selectItem && window.selectItem('${item.id}')" 
            style="
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              color: white; 
              border: none; 
              padding: 8px 16px; 
              border-radius: 6px; 
              font-size: 12px; 
              font-weight: 500;
              cursor: pointer; 
              width: 100%;
              transition: all 0.2s ease;
            "
            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)';"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"
          >
            View Details
          </button>
        </div>
      `;

      const popup = new maplibregl.Popup({
        offset: 35,
        closeButton: true,
        className: "custom-popup",
        maxWidth: "300px",
      }).setHTML(popupContent);

      // Add marker to map
      const marker = new maplibregl.Marker(markerElement)
        .setLngLat([longitude, latitude])
        .setPopup(popup);

      if (map.current) {
        marker.addTo(map.current);
        markers.push(marker);
      }

      bounds.extend([longitude, latitude]);
    });

    // Fit map to show all markers
    if (items.length > 0 && map.current) {
      map.current.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 16,
      });
    }

    // Global function to select item from popup
    window.selectItem = (itemId: string): void => {
      const item = items.find((i: Item) => i.id === itemId);
      if (item) {
        setSelectedItem(item);

        // Close any open popups
        if (map.current) {
          const popups = document.querySelectorAll(".maplibregl-popup");
          popups.forEach((popup) => popup.remove());
        }
      }
    };

    return () => {
      markers.forEach((marker) => marker.remove());
      delete window.selectItem;
    };
  }, [items]);

  const formatTimestamp = (timestamp: Timestamp | undefined): string => {
    if (!timestamp || !timestamp.seconds) return "N/A";
    try {
      return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement>
  ): void => {
    const target = e.target as HTMLImageElement;
    target.src =
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiByeD0iNCIgZmlsbD0iI0Y5RkFGQiIvPgo8cGF0aCBkPSJNMjQgMzJMMzIgMjRMMzYgMjhMNDggMTZMNTYgMjRWNDhIMjRWMzJaIiBmaWxsPSIjRTVFN0VCIi8+CjxjaXJjbGUgY3g9IjMzIiBjeT0iMzEiIHI9IjMiIGZpbGw9IiNEMUQ1REIiLz4KPHRleHQgeD0iNDAiIHk9IjY1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUI5QkEwIiBmb250LXNpemU9IjEwIj5JbWFnZTwvdGV4dD4KPC9zdmc+";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading items...</p>
          <p className="text-gray-500 text-sm mt-1">Fetching location data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center">
          <div className="text-red-600 mb-2 text-2xl">⚠️</div>
          <p className="text-red-700 font-medium">Error loading map</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="flex flex-col xl:flex-row h-full gap-4">
        {/* Map Container */}
        <div className="flex-1 relative">
          <div
            ref={mapContainer}
            className="w-full h-96 xl:h-full rounded-lg shadow-md bg-gray-100"
            style={{ minHeight: "500px" }}
          />
          {items.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-gray-400 mb-2 text-4xl">📍</div>
                <p className="text-gray-600 font-medium">No items found</p>
                <p className="text-gray-500 text-sm mt-1">
                  No items with valid location data
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Item Details Sidebar */}
        {selectedItem && (
          <div className="xl:w-80 bg-white rounded-lg shadow-lg p-6 max-h-96 xl:max-h-full overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-800">Item Details</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors"
                type="button"
                title="Close details"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Main item info */}
              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-1">
                  {selectedItem.itemName || "Unnamed Item"}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {selectedItem.itemDesc || "No description available"}
                </p>
              </div>

              {/* Price and status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-2xl font-bold text-green-600">
                    ${selectedItem.itemPrice || 0}
                  </span>
                  <span className="text-gray-500 text-sm ml-1">
                    / {selectedItem.itemMinRentDuration || 0} days min
                  </span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedItem.itemStatus === "available"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {selectedItem.itemStatus || "Unknown"}
                </span>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 block mb-1">
                    Category
                  </span>
                  <p className="text-gray-600">
                    {selectedItem.itemCategory || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 block mb-1">
                    Condition
                  </span>
                  <p className="text-gray-600">
                    {selectedItem.itemCondition || "N/A"}
                  </p>
                </div>
              </div>

              {/* Owner info */}
              <div>
                <span className="font-medium text-gray-700 block mb-1">
                  Owner
                </span>
                <p className="text-gray-600">
                  {selectedItem.owner?.fullname || "Unknown"}
                </p>
              </div>

              {/* Location */}
              <div>
                <span className="font-medium text-gray-700 block mb-1">
                  Location
                </span>
                <p className="text-gray-600 text-sm leading-relaxed">
                  📍{" "}
                  {selectedItem.itemLocation?.address || "No address provided"}
                </p>
                {selectedItem.itemLocation?.radius && (
                  <p className="text-gray-500 text-xs mt-1">
                    Radius: {selectedItem.itemLocation.radius}km
                  </p>
                )}
              </div>

              {/* Timestamps */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>Created: {formatTimestamp(selectedItem.createdAt)}</p>
                <p>Updated: {formatTimestamp(selectedItem.updatedAt)}</p>
              </div>

              {/* Images */}
              {selectedItem.images && selectedItem.images.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700 block mb-2">
                    Images
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.images
                      .slice(0, 4)
                      .map((imageUrl: string, index: number) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`${selectedItem.itemName} ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg border hover:opacity-90 transition-opacity cursor-pointer"
                          onError={handleImageError}
                          onClick={() => window.open(imageUrl, "_blank")}
                          title="Click to view full image"
                        />
                      ))}
                  </div>
                  {selectedItem.images.length > 4 && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      +{selectedItem.images.length - 4} more images
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Items Summary */}
      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-800">
              <span className="font-semibold">{items.length}</span>{" "}
              {items.length === 1 ? "item" : "items"} displayed on map
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Powered by MapTiler & OpenCage geocoding
            </p>
          </div>
          <div className="text-2xl">🗺️</div>
        </div>
      </div>
    </div>
  );
};

export default ItemsMap;
