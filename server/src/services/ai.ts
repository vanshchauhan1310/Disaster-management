import axios from "axios";
import { getCachedData, setCachedData } from "./cache";
import { logAction } from "./helpers";

// --- Helper: Extract Location (Gemini API) ---
export async function extractLocation(description: string): Promise<string> {
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

// --- Helper: Image Verification (Gemini API) ---
export async function verifyImage(imageUrl: string) {
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