import { serve } from "bun";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

// --- Type Definitions ---
interface Disaster {
  id?: number;
  title: string;
  location_name?: string;
  location?: string;
  description: string;
  tags?: string[];
  owner_id: string;
  created_at?: string;
  audit_trail?: any[];
}

interface User {
  id: string;
  name: string;
  role: 'admin' | 'contributor';
}

interface SocialPost {
  id: number;
  platform: string;
  username: string;
  content: string;
  timestamp: string;
  priority: boolean;
  location: string;
  verified: boolean;
  disaster_id?: number;
}

interface Resource {
  id?: number;
  disaster_id?: number;
  name: string;
  location_name?: string;
  location?: string;
  type: string;
  created_at?: string;
}

interface OfficialUpdate {
  id: number;
  disaster_id: number;
  title: string;
  content: string;
  source: string;
  timestamp: string;
  priority: boolean;
}

interface RequestBody {
  title?: string;
  location_name?: string;
  description?: string;
  tags?: string[];
  imageUrl?: string;
  lat?: number;
  lon?: number;
  radius?: number;
}

// --- Supabase Client ---
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// --- Mock Users with Roles ---
const users: User[] = [
  { id: "netrunnerX", name: "Netrunner X", role: "admin" },
  { id: "reliefAdmin", name: "Relief Admin", role: "admin" },
  { id: "contributor1", name: "Field Reporter", role: "contributor" },
  { id: "contributor2", name: "Emergency Responder", role: "contributor" }
];

// --- WebSocket Connections ---
const sockets = new Set<any>();

// --- Cache Helper Functions ---
async function getCachedData(key: string): Promise<any | null> {
  const { data } = await supabase
    .from("cache")
    .select("value")
    .eq("key", key)
    .gt("expires_at", new Date().toISOString())
    .single();
  
  return data?.value || null;
}

async function setCachedData(key: string, value: any, ttlHours: number = 1): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  
  await supabase
    .from("cache")
    .upsert({ key, value, expires_at: expiresAt });
}

// --- Helper: Parse JSON body ---
async function parseBody(req: Request): Promise<RequestBody> {
  try {
    const body = await req.json();
    return body as RequestBody;
  } catch {
    return {};
  }
}

// --- Helper: Logging ---
function logAction(action: string, details: Record<string, any>) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), action, ...details }));
}

// --- Helper: Priority Detection ---
function detectPriority(content: string) {
  const priorityKeywords = ["urgent", "SOS", "help needed", "immediate"];
  return priorityKeywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()));
}

// --- Helper: Extract Location (Gemini API) ---
async function extractLocation(description: string): Promise<string> {
  const cacheKey = `gemini:location:${Buffer.from(description).toString('base64')}`;
  
  // Check cache first
  const cached = await getCachedData(cacheKey);
  if (cached) {
    logAction("cache_hit", { type: "location_extraction", description: description.substring(0, 50) });
    return cached;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt = `Extract the primary location mentioned in this disaster description. Return only the location name in plain text: ${description}`;

  try {
    const response = await axios.post(endpoint, {
      contents: [{ parts: [{ text: prompt }] }]
    });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error("No location found by Gemini");
    
    // Cache the result
    await setCachedData(cacheKey, text);
    logAction("location_extracted", { description: description.substring(0, 50), location: text });
    
    return text;
  } catch (error: any) {
    console.error("Gemini API error:", error.response?.data || error.message);
    // Fallback to a simple location extraction
    const locationKeywords = ["in", "at", "near", "around"];
    const words = description.split(" ");
    for (let i = 0; i < words.length - 1; i++) {
      if (locationKeywords.includes(words[i]?.toLowerCase() || "")) {
        return words.slice(i + 1, i + 3).join(" "); // Take next 2 words as location
      }
    }
    return "Unknown Location";
  }
}

// --- Helper: Geocode Location (Nominatim) ---
async function geocodeLocation(locationName: string): Promise<[number, number]> {
  const cacheKey = `geocode:${Buffer.from(locationName).toString('base64')}`;
  
  // Check cache first
  const cached = await getCachedData(cacheKey);
  if (cached) {
    logAction("cache_hit", { type: "geocoding", location: locationName });
    return cached;
  }

  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: locationName,
          format: "json",
          limit: 1
        },
        headers: {
          "User-Agent": "DisasterResponsePlatform/1.0 (https://github.com/your-repo; your-email@example.com)"
        }
      }
    );
    
    if (response.data.length === 0) throw new Error("Location not found");
    const { lon, lat } = response.data[0];
    const coords: [number, number] = [parseFloat(lon), parseFloat(lat)];
    
    // Cache the result
    await setCachedData(cacheKey, coords);
    logAction("location_geocoded", { location: locationName, coords });
    
    return coords;
  } catch (error: any) {
    console.error("Geocoding error:", error.response?.status, error.response?.data);
    
    // If blocked by Nominatim, use fallback coordinates
    if (error.response?.status === 403) {
      logAction("geocoding_blocked", { location: locationName, error: "Nominatim blocked - using fallback" });
      
      // Fallback coordinates for common locations
      const fallbackCoords: Record<string, [number, number]> = {
        "mumbai": [72.8777, 19.0760],
        "delhi": [77.2090, 28.6139],
        "bangalore": [77.5946, 12.9716],
        "chennai": [80.2707, 13.0827],
        "kolkata": [88.3639, 22.5726],
        "hyderabad": [78.4867, 17.3850],
        "pune": [73.8563, 18.5204],
        "ahmedabad": [72.5714, 23.0225],
        "lucknow": [80.9462, 26.8467],
        "jaipur": [75.7873, 26.9124]
      };
      
      const locationLower = locationName.toLowerCase();
      for (const [city, coords] of Object.entries(fallbackCoords)) {
        if (locationLower.includes(city)) {
          await setCachedData(cacheKey, coords);
          return coords;
        }
      }
      
      // Default fallback coordinates (Mumbai)
      const defaultCoords: [number, number] = [72.8777, 19.0760];
      await setCachedData(cacheKey, defaultCoords);
      return defaultCoords;
    }
    
    // For other errors, throw the original error
    throw error;
  }
}

// --- Helper: Image Verification (Gemini API) ---
async function verifyImage(imageUrl: string) {
  const cacheKey = `gemini:verify:${Buffer.from(imageUrl).toString('base64')}`;
  
  // Check cache first
  const cached = await getCachedData(cacheKey);
  if (cached) {
    logAction("cache_hit", { type: "image_verification", imageUrl: imageUrl.substring(0, 50) });
    return cached;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Gemini API key not configured.");
    return { 
      authenticityScore: null, 
      isLikelyAuthentic: false, 
      analysis: "Server configuration error: Gemini API key missing." 
    };
  }
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt = `Analyze this disaster image for authenticity. Check for signs of digital manipulation and whether the content matches typical disaster scenarios. Return ONLY a valid JSON response with the following structure: {"authenticityScore": number, "isLikelyAuthentic": boolean, "analysis": string}.`;

  try {
    // 1. Download the image data from the URL
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBase64 = Buffer.from(imageResponse.data, 'binary').toString('base64');
    const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

    // 2. Send a multimodal request to Gemini
    const response = await axios.post(endpoint, {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64
            }
          }
        ]
      }]
    });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error("No analysis from Gemini");
    
    let result;
    try {
      // Clean the response to ensure it's valid JSON
      const cleanedText = text.replace(/^```json\n/, '').replace(/\n```$/, '');
      result = JSON.parse(cleanedText);
    } catch (e) {
      console.error("Error parsing Gemini JSON response:", e);
      // If not valid JSON, return as analysis string
      result = { authenticityScore: null, isLikelyAuthentic: null, analysis: text };
    }
    
    // Cache the result
    await setCachedData(cacheKey, result);
    logAction("image_verified", { imageUrl: imageUrl.substring(0, 50), authenticityScore: result.authenticityScore });
    
    return result;
  } catch (error: any) {
    console.error("Gemini API error:", error.response?.data || error.message);
    // Fallback response
    const result = { 
      authenticityScore: null, 
      isLikelyAuthentic: false, 
      analysis: "Unable to analyze image due to an API error. The image may be inaccessible or an invalid format." 
    };
    
    // Cache the fallback result
    await setCachedData(cacheKey, result);
    return result;
  }
}

// --- Helper: Get Nearby Resources (Geospatial Query) ---
async function getNearbyResources(lat: number, lon: number, radius: number = 10000): Promise<Resource[]> {
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

// --- Helper: Mock Social Media for Specific Disaster ---
function getMockSocialMediaForDisaster(disasterId: number): SocialPost[] {
  const disasterSocialPosts: SocialPost[] = [
    {
      id: 1,
      platform: "Twitter",
      username: "@mumbai_alert",
      content: "SOS! Heavy flooding in Mumbai's Bandra area. Water level rising rapidly. Need immediate rescue teams! #MumbaiFlood #Emergency",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      priority: detectPriority("SOS! Heavy flooding in Mumbai's Bandra area"),
      location: "Mumbai, India",
      verified: true,
      disaster_id: disasterId
    },
    {
      id: 2,
      platform: "Facebook",
      username: "Mumbai Emergency Response",
      content: "Rescue teams deployed to Bandra area. Evacuation centers set up at local schools. Please follow official instructions.",
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      priority: false,
      location: "Mumbai, India",
      verified: true,
      disaster_id: disasterId
    },
    {
      id: 3,
      platform: "Instagram",
      username: "citizen_reporter",
      content: "Just witnessed the flooding in Bandra. Water level is chest-high in some areas. Stay safe everyone!",
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      priority: false,
      location: "Mumbai, India",
      verified: false,
      disaster_id: disasterId
    }
  ];
  
  return disasterSocialPosts;
}

// --- Helper: Mock Official Updates ---
function getMockOfficialUpdates(disasterId: number): OfficialUpdate[] {
  const officialUpdates: OfficialUpdate[] = [
    {
      id: 1,
      disaster_id: disasterId,
      title: "Emergency Response Activated",
      content: "National Disaster Response Force (NDRF) teams have been deployed to the affected areas. Evacuation orders issued for low-lying regions.",
      source: "NDRF Official",
      timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      priority: true
    },
    {
      id: 2,
      disaster_id: disasterId,
      title: "Weather Update",
      content: "Heavy rainfall expected to continue for next 24 hours. Residents advised to stay indoors and avoid unnecessary travel.",
      source: "India Meteorological Department",
      timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      priority: false
    },
    {
      id: 3,
      disaster_id: disasterId,
      title: "Transportation Update",
      content: "Local trains suspended on Western line. Bus services diverted. Airport operations normal but delays expected.",
      source: "Mumbai Municipal Corporation",
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      priority: false
    }
  ];
  
  return officialUpdates;
}

// --- API Handler ---
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;
  const user = users[0]; // Always Alice for demo

  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  // --- Disaster CRUD ---
  if (path === "/api/disasters" && method === "POST") {
    const body = await parseBody(req);
    const { title, location_name, description, tags } = body;
    if (!title || !description) return Response.json({ error: "Missing fields" }, { status: 400 });

    let location = null;
    if (location_name) location = await geocodeLocation(location_name);

    const { data, error } = await supabase
      .from("disasters")
      .insert([{
        title,
        location_name,
        location: location ? `SRID=4326;POINT(${location[0]} ${location[1]})` : null,
        description,
        tags,
        owner_id: user.id,
        audit_trail: [{ action: "created", by: user.id, at: new Date().toISOString() }]
      }])
      .select();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Broadcast to all sockets
    for (const ws of sockets) ws.send(JSON.stringify({ type: "disaster:new", data: data[0] }));

    logAction("create_disaster", { user: user.id, title });
    return Response.json(data[0]);
  }

  if (path === "/api/disasters" && method === "GET") {
    const tag = url.searchParams.get("tag");
    let query = supabase.from("disasters").select("*");
    if (tag) query = query.contains("tags", [tag]);
    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  if (path.match(/^\/api\/disasters\/\d+$/) && method === "PUT") {
    const idStr = path.split("/").pop();
    if (!idStr) return Response.json({ error: "ID not provided" }, { status: 400 });
    const id = parseInt(idStr, 10);
    logAction("update_attempt", { user: user.id, role: user.role, id });

    // Check if the disaster exists
    const { data: disaster, error: queryError } = await supabase.from("disasters").select("owner_id").eq("id", id).single();
    if (queryError || !disaster) {
      console.error("Error finding disaster for update:", queryError);
      return Response.json({ error: "Disaster not found" }, { status: 404 });
    }

    // Check permissions: user must be an admin OR the owner
    if (user.role !== 'admin' && disaster.owner_id !== user.id) {
      logAction("update_forbidden", { user: user.id, role: user.role, disaster_owner: disaster.owner_id, id });
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await parseBody(req);
    const { title, location_name, description, tags } = body;
    let location = null;
    if (location_name) location = await geocodeLocation(location_name);

    const { data, error } = await supabase
      .from("disasters")
      .update({
        title, location_name,
        location: location ? `SRID=4326;POINT(${location[0]} ${location[1]})` : null,
        description, tags
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    for (const ws of sockets) ws.send(JSON.stringify({ type: "disaster:update", data: data[0] }));
    logAction("update_disaster", { user: user.id, id });
    return Response.json(data[0]);
  }

  if (path.match(/^\/api\/disasters\/\d+$/) && method === "DELETE") {
    const idStr = path.split("/").pop();
    if (!idStr) return Response.json({ error: "ID not provided" }, { status: 400 });

    const id = parseInt(idStr, 10);
    logAction("delete_attempt", { user: user.id, role: user.role, id });

    // First, check if the disaster exists at all
    const { data: disaster, error: queryError } = await supabase.from("disasters").select("owner_id").eq("id", id).single();
    
    if (queryError || !disaster) {
      console.error("Error finding disaster for deletion:", queryError);
      return Response.json({ error: "Disaster not found" }, { status: 404 });
    }

    // Now, check permissions: user must be an admin OR the owner of the disaster
    if (user.role !== 'admin' && disaster.owner_id !== user.id) {
      logAction("delete_forbidden", { user: user.id, role: user.role, disaster_owner: disaster.owner_id, id });
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // If checks pass, delete the disaster
    const { error: deleteError } = await supabase.from("disasters").delete().eq("id", id);
    if (deleteError) {
      console.error("Supabase delete error:", deleteError);
      return Response.json({ error: deleteError.message }, { status: 500 });
    }
    
    for (const ws of sockets) ws.send(JSON.stringify({ type: "disaster:delete", data: id }));
    
    logAction("delete_disaster", { user: user.id, id });
    return Response.json({ success: true });
  }

  // --- General Image Verification Endpoint ---
  if (path === "/api/verify-image" && method === "POST") {
    const body = await parseBody(req);
    const { imageUrl } = body;
    if (!imageUrl) return Response.json({ error: "Image URL required" }, { status: 400 });
    const result = await verifyImage(imageUrl);
    logAction("verify_image_general", { imageUrl: imageUrl.substring(0, 50) });
    return Response.json(result);
  }

  // --- Geocode Endpoint ---
  if (path === "/api/geocode" && method === "POST") {
    const body = await parseBody(req);
    const { description } = body;
    if (!description) return Response.json({ error: "Description required" }, { status: 400 });
    const locationName = await extractLocation(description);
    const coords = await geocodeLocation(locationName);
    return Response.json({ locationName, coords });
  }

  // --- Image Verification ---
  if (path.match(/^\/api\/disasters\/\d+\/verify-image$/) && method === "POST") {
    const body = await parseBody(req);
    const { imageUrl } = body;
    if (!imageUrl) return Response.json({ error: "Image URL required" }, { status: 400 });
    const result = await verifyImage(imageUrl);
    return Response.json(result);
  }

  // --- Social Media for Specific Disaster ---
  if (path.match(/^\/api\/disasters\/\d+\/social-media$/) && method === "GET") {
    const pathParts = path.split("/");
    const disasterId = parseInt(pathParts[3] || "0");
    if (isNaN(disasterId) || disasterId === 0) return Response.json({ error: "Invalid disaster ID" }, { status: 400 });
    
    const socialPosts = getMockSocialMediaForDisaster(disasterId);
    
    // Broadcast social media update
    for (const ws of sockets) {
      ws.send(JSON.stringify({ 
        type: "social_media_updated", 
        disaster_id: disasterId, 
        data: socialPosts 
      }));
    }
    
    logAction("social_media_fetched", { disaster_id: disasterId, count: socialPosts.length });
    return Response.json(socialPosts);
  }

  // --- Resources for Disaster with Geospatial Lookup ---
  if (path.match(/^\/api\/disasters\/\d+\/resources$/) && method === "GET") {
    const pathParts = path.split("/");
    const disasterId = parseInt(pathParts[3] || "0");
    if (isNaN(disasterId) || disasterId === 0) return Response.json({ error: "Invalid disaster ID" }, { status: 400 });
    
    const lat = parseFloat(url.searchParams.get("lat") || "0");
    const lon = parseFloat(url.searchParams.get("lon") || "0");
    const radius = parseFloat(url.searchParams.get("radius") || "10000");
    
    if (lat === 0 && lon === 0) {
      // Return all resources for the disaster if no coordinates provided
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("disaster_id", disasterId);
      
      if (error) return Response.json({ error: error.message }, { status: 500 });
      
      logAction("resources_fetched", { disaster_id: disasterId, count: data?.length || 0 });
      return Response.json(data || []);
    }
    
    // Get nearby resources using geospatial query
    const nearbyResources = await getNearbyResources(lat, lon, radius);
    
    // Filter resources for this specific disaster
    const disasterResources = nearbyResources.filter(resource => 
      resource.disaster_id === disasterId || !resource.disaster_id
    );
    
    // Broadcast resources update
    for (const ws of sockets) {
      ws.send(JSON.stringify({ 
        type: "resources_updated", 
        disaster_id: disasterId, 
        data: disasterResources 
      }));
    }
    
    logAction("resources_mapped", { 
      disaster_id: disasterId, 
      lat, 
      lon, 
      radius, 
      count: disasterResources.length 
    });
    
    return Response.json(disasterResources);
  }

  // --- Official Updates for Disaster ---
  if (path.match(/^\/api\/disasters\/\d+\/official-updates$/) && method === "GET") {
    const pathParts = path.split("/");
    const disasterId = parseInt(pathParts[3] || "0");
    if (isNaN(disasterId) || disasterId === 0) return Response.json({ error: "Invalid disaster ID" }, { status: 400 });
    
    const officialUpdates = getMockOfficialUpdates(disasterId);
    
    logAction("official_updates_fetched", { disaster_id: disasterId, count: officialUpdates.length });
    return Response.json(officialUpdates);
  }

  // --- General Social Media Mock ---
  if (path === "/api/social" && method === "GET") {
    const mockSocialPosts: SocialPost[] = [
      {
        id: 1,
        platform: "Twitter",
        username: "@mumbai_alert",
        content: "SOS! Heavy flooding in Mumbai's Bandra area. Water level rising rapidly. Need immediate rescue teams! #MumbaiFlood #Emergency",
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        priority: detectPriority("SOS! Heavy flooding in Mumbai's Bandra area"),
        location: "Mumbai, India",
        verified: true
      },
      {
        id: 2,
        platform: "Twitter",
        username: "@disaster_response",
        content: "Earthquake reported in Delhi NCR region. Magnitude 4.2. Buildings shaking. Stay safe everyone! #DelhiEarthquake",
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        priority: detectPriority("Earthquake reported in Delhi NCR region"),
        location: "Delhi, India",
        verified: true
      },
      {
        id: 3,
        platform: "Facebook",
        username: "Chennai Weather Updates",
        content: "Cyclone warning issued for Chennai coast. Wind speeds expected to reach 120 km/h. Evacuation orders in place.",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        priority: detectPriority("Cyclone warning issued for Chennai coast"),
        location: "Chennai, India",
        verified: true
      },
      {
        id: 4,
        platform: "Instagram",
        username: "kolkata_news",
        content: "Fire broke out in Kolkata's Park Street area. Multiple fire trucks dispatched. Traffic diverted.",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        priority: detectPriority("Fire broke out in Kolkata's Park Street area"),
        location: "Kolkata, India",
        verified: false
      },
      {
        id: 5,
        platform: "Twitter",
        username: "@bangalore_alert",
        content: "Landslide reported on Bangalore-Mysore highway. Road blocked. Alternative routes suggested.",
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        priority: detectPriority("Landslide reported on Bangalore-Mysore highway"),
        location: "Bangalore, India",
        verified: true
      },
      {
        id: 6,
        platform: "Facebook",
        username: "Hyderabad Emergency",
        content: "Heavy rainfall causing waterlogging in Hyderabad. Several areas affected. Stay indoors if possible.",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        priority: detectPriority("Heavy rainfall causing waterlogging in Hyderabad"),
        location: "Hyderabad, India",
        verified: true
      },
      {
        id: 7,
        platform: "Twitter",
        username: "@pune_weather",
        content: "Hailstorm hits Pune. Damage to vehicles and crops reported. Weather alert issued.",
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        priority: detectPriority("Hailstorm hits Pune"),
        location: "Pune, India",
        verified: false
      },
      {
        id: 8,
        platform: "Instagram",
        username: "ahmedabad_news",
        content: "Gas leak reported in Ahmedabad industrial area. Emergency services on site. Avoid the area.",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        priority: detectPriority("Gas leak reported in Ahmedabad industrial area"),
        location: "Ahmedabad, India",
        verified: true
      },
      {
        id: 9,
        platform: "Twitter",
        username: "@lucknow_alert",
        content: "Building collapse in Lucknow's old city. Rescue operations underway. Multiple casualties feared.",
        timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(), // 7 hours ago
        priority: detectPriority("Building collapse in Lucknow's old city"),
        location: "Lucknow, India",
        verified: true
      },
      {
        id: 10,
        platform: "Facebook",
        username: "Jaipur Disaster Response",
        content: "Dust storm warning for Jaipur. Visibility reduced. Flight delays expected at airport.",
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
        priority: detectPriority("Dust storm warning for Jaipur"),
        location: "Jaipur, India",
        verified: true
      }
    ];

    // Sort by priority (high priority first) and then by timestamp (newest first)
    const sortedPosts = mockSocialPosts.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority ? 1 : -1; // High priority first
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return Response.json(sortedPosts);
  }

  // --- Not Found ---
  return new Response("Not found", { status: 404 });
}

// --- Start Bun Server with WebSocket ---
serve({
  port: Number(process.env.PORT) || 5000,
  async fetch(req, server) {
    const url = new URL(req.url);

    // Handle WebSocket upgrade requests at the /ws endpoint
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req);
      if (upgraded) {
        // Bun automatically handles the connection and calls the open event
        return;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Fallback to the existing HTTP handler for all other API requests
    return handler(req);
  },
  websocket: {
    open(ws) {
      sockets.add(ws);
      ws.send(JSON.stringify({ 
        type: "connected", 
        message: "Connected to Disaster Response Platform WebSocket",
        timestamp: new Date().toISOString()
      }));
      logAction("websocket_connected", { client_count: sockets.size });
    },
    message(ws, message) {
      // Handle custom messages if needed
      try {
        const data = JSON.parse(message as string);
        logAction("websocket_message", { message_type: data.type });
        
        // Echo back with timestamp
        ws.send(JSON.stringify({ 
          type: "echo", 
          original: data,
          timestamp: new Date().toISOString()
        }));
      } catch {
        // If not JSON, echo as string
        ws.send(JSON.stringify({ 
          type: "echo", 
          message: message,
          timestamp: new Date().toISOString()
        }));
      }
    },
    close(ws) {
      sockets.delete(ws);
      logAction("websocket_disconnected", { client_count: sockets.size });
    }
  }
});

console.log(`Bun server running on http://localhost:${process.env.PORT || 5000}`);