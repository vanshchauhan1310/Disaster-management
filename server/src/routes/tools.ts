import { extractLocation, verifyImage } from '../services/ai';
import { geocodeLocation } from '../services/geo';
import { parseBody, logAction } from '../services/helpers';
import type { SocialPost } from '../../../types';
import { detectPriority } from '../services/helpers';
import { fetchTweets } from '../services/twitter';

async function handleGeocode(req: Request) {
  try {
    const body = await parseBody(req);
    const { location } = body;
    
    if (!location) {
      return Response.json({ error: "Location is required" }, { status: 400 });
    }
    
    // Use Gemini to extract the place name from the user input
    const extractedLocation = await extractLocation(location);
    logAction("location_extracted", { description: location, extracted: extractedLocation });
    
    const coords = await geocodeLocation(extractedLocation);
    logAction("location_geocoded", { original: location, extracted: extractedLocation, coords });
    
    return Response.json({ 
      success: true, 
      location: extractedLocation, // return the extracted location
      coordinates: coords,
      message: `Successfully geocoded \"${extractedLocation}\" to coordinates [${coords[0]}, ${coords[1]}]`
    });
  } catch (error: any) {
    console.error("Geocoding route error:", error.message);
    
    // Provide specific error messages based on the error type
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.message.includes("API key not configured")) {
      statusCode = 503; // Service unavailable
      errorMessage = "Geocoding service is not configured. Please contact administrator.";
    } else if (error.message.includes("access denied")) {
      statusCode = 503;
      errorMessage = "Geocoding service is temporarily unavailable. Please try again later.";
    } else if (error.message.includes("quota exceeded")) {
      statusCode = 429; // Too many requests
      errorMessage = "Geocoding service quota exceeded. Please try again later.";
    } else if (error.message.includes("Location not found")) {
      statusCode = 404;
      errorMessage = error.message;
    }
    
    logAction("geocoding_error", { error: errorMessage });
    return Response.json({ 
      error: errorMessage,
      success: false 
    }, { status: statusCode });
  }
}

async function handleVerifyImage(req: Request) {
  const body = await parseBody(req);
  const { imageUrl } = body;
  if (!imageUrl) return Response.json({ error: "Image URL required" }, { status: 400 });
  const result = await verifyImage(imageUrl);
  logAction("verify_image_general", { imageUrl: imageUrl.substring(0, 50) });
  return Response.json(result);
}

async function handleSocial(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get('q') || '(flood OR earthquake OR cyclone OR hurricane OR landslide OR wildfire OR tsunami OR tornado OR typhoon OR avalanche OR eruption OR "natural disaster") -is:retweet lang:en';
  const maxResults = Math.max(10, Math.min(100, parseInt(url.searchParams.get('limit') || '10', 10)));
  let tweets: any[] | { rateLimit: true } = [];
  try {
    tweets = await fetchTweets(query, maxResults);
  } catch (e) {
    tweets = { rateLimit: true };
  }

  // If rate limited, error, or no tweets, return mock data
  if ((tweets as any).rateLimit || !Array.isArray(tweets) || tweets.length === 0) {
    const mockSocialPosts = [
      {
        id: 1,
        username: 'citizen1',
        content: 'Heavy flooding in downtown area #floodrelief',
        platform: 'twitter',
        timestamp: new Date().toISOString(),
        priority: false,
        location: 'Downtown',
        verified: false
      },
      {
        id: 2,
        username: 'emergency_responder',
        content: 'Emergency services deployed to affected areas',
        platform: 'twitter',
        timestamp: new Date().toISOString(),
        priority: true,
        location: 'City Center',
        verified: false
      },
      {
        id: 3,
        username: 'local_news',
        content: 'Roads closed due to flooding. Stay safe everyone!',
        platform: 'twitter',
        timestamp: new Date().toISOString(),
        priority: false,
        location: 'Main Street',
        verified: false
      }
    ];
    return Response.json(mockSocialPosts, { status: 200 });
  }

  // Otherwise, return real tweets
  const socialPosts = (tweets as any[]).map(tweet => ({
    id: tweet.id,
    username: tweet.username || tweet.author_id || 'unknown',
    content: tweet.text,
    platform: 'twitter',
    timestamp: tweet.created_at || new Date().toISOString(),
    priority: false,
    location: '',
    verified: false
  }));
  return Response.json(socialPosts, { status: 200 });
}

export async function toolsRouter(req: Request, path: string, method: string): Promise<Response | null> {
  if (path === "/api/geocode" && method === "POST") {
    return handleGeocode(req);
  }

  if (path === "/api/verify-image" && method === "POST") {
    return handleVerifyImage(req);
  }

  if (path === "/api/social" && method === "GET") {
    return handleSocial(req);
  }

  return null;
} 