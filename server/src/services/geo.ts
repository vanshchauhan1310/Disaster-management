import axios from "axios";
import { getCachedData, setCachedData } from "./cache";
import { logAction } from "./helpers";
import { supabase } from "../lib/supabase";
import type { Resource } from "../../../types";

// Check if Google Maps API key is configured
if (!process.env.GOOGLE_MAPS_API_KEY) {
  console.error("❌ GOOGLE_MAPS_API_KEY environment variable is not set");
  console.error("Please add your Google Maps API key to the .env file");
  console.error("Example: GOOGLE_MAPS_API_KEY=your_api_key_here");
}

// --- Helper: Geocode Location (Nominatim API) ---
export async function geocodeLocation(locationName: string): Promise<[number, number]> {
  const cacheKey = `geocode:${Buffer.from(locationName).toString('base64')}`;
  
  // Check cache first
  const cached = await getCachedData(cacheKey);
  if (cached) {
    logAction("cache_hit", { type: "geocoding", location: locationName });
    return cached;
  }

  try {
    console.log("Geocoding location (Nominatim):", locationName);
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: locationName,
          format: "json",
          addressdetails: 1,
          limit: 1,
        },
        headers: {
          'User-Agent': 'Disaster-Management-App/1.0 (your@email.com)',
        },
      }
    );
    if (!response.data || response.data.length === 0) {
      throw new Error(`Location not found: ${locationName}`);
    }
    const { lon, lat } = response.data[0];
    const coords: [number, number] = [parseFloat(lon), parseFloat(lat)];
    console.log("Successfully geocoded (Nominatim):", locationName, "to", coords);
    
    // Cache the result
    await setCachedData(cacheKey, coords);
    logAction("location_geocoded", { location: locationName, coords });
    
    return coords;
  } catch (error: any) {
    console.error("Nominatim geocoding error:", error.response?.status, error.response?.data);
    throw new Error(`Geocoding failed: ${error.message}`);
  }
}

// --- Helper: Reverse Geocode (Google Maps API) ---
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = `reverse_geocode:${lat},${lng}`;
  
  // Check cache first
  const cached = await getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps API key not configured");
  }

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          latlng: `${lat},${lng}`,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    );
    
    if (response.data.status !== "OK" || response.data.results.length === 0) {
      throw new Error(`Reverse geocoding failed: ${response.data.status}`);
    }
    
    const address = response.data.results[0].formatted_address;
    
    // Cache the result
    await setCachedData(cacheKey, address);
    logAction("location_reverse_geocoded", { coords: [lng, lat], address });
    
    return address;
  } catch (error: any) {
    console.error("Google Maps reverse geocoding error:", error.response?.status, error.response?.data);
    throw new Error(`Reverse geocoding failed: ${error.message}`);
  }
}

// --- Helper: Get Nearby Resources (Geospatial Query) ---
export async function getNearbyResources(lat: number, lon: number, radius: number = 10000): Promise<Resource[]> {
  try {
    const { data, error } = await supabase.rpc('nearby_resources', {
      lat, lng: lon, radius
    });
    
    if (error) {
      console.error("Geospatial query error:", error);
      
      // Fallback: Get all resources if function doesn't exist
      const { data: allResources, error: fallbackError } = await supabase
        .from("resources")
        .select("*")
        .limit(10);
      
      if (fallbackError) {
        console.error("Fallback query error:", fallbackError);
        return [];
      }
      
      logAction("resources_fallback", { lat, lon, radius, count: allResources?.length || 0 });
      return allResources || [];
    }
    
    logAction("resources_mapped", { lat, lon, radius, count: data?.length || 0 });
    return data || [];
  } catch (error) {
    console.error("Geospatial query exception:", error);
    
    // Fallback: Get all resources
    const { data: allResources, error: fallbackError } = await supabase
      .from("resources")
      .select("*")
      .limit(10);
    
    if (fallbackError) {
      console.error("Fallback query error:", fallbackError);
      return [];
    }
    
    logAction("resources_fallback", { lat, lon, radius, count: allResources?.length || 0 });
    return allResources || [];
  }
} 