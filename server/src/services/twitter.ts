import axios from 'axios';
import { getCachedData, setCachedData } from './cache';

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

if (!BEARER_TOKEN) {
  console.error('❌ TWITTER_BEARER_TOKEN environment variable is not set. Twitter integration will not work.');
}

export interface Tweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  username?: string;
}

export async function fetchTweets(query: string, maxResults: number = 10): Promise<Tweet[] | { rateLimit: true }> {
  if (!BEARER_TOKEN) return [];
  const cacheKey = `twitter:search:${Buffer.from(query).toString('base64')}`;
  // Check cache first (10 min TTL)
  const cached = await getCachedData(cacheKey);
  if (cached) return cached;
  const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}&tweet.fields=author_id,created_at&expansions=author_id&user.fields=username`;
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` }
    });
    const tweets = response.data.data || [];
    const users = response.data.includes?.users || [];
    // Map author_id to username
    const userMap = Object.fromEntries(users.map((u: any) => [u.id, u.username]));
    const result = tweets.map((tweet: any) => ({
      id: tweet.id,
      text: tweet.text,
      author_id: tweet.author_id,
      created_at: tweet.created_at,
      username: userMap[tweet.author_id] || undefined,
    }));
    await setCachedData(cacheKey, result, 3600); // 1 hour TTL
    return result;
  } catch (error: any) {
    if (error.response?.status === 429) {
      // Rate limit hit, return special object
      return { rateLimit: true };
    }
    console.error('Twitter API error:', error.response?.data || error.message);
    return [];
  }
} 