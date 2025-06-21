import { supabase } from "../lib/supabase";

// --- Cache Helper Functions ---
export async function getCachedData(key: string): Promise<any | null> {
  const { data } = await supabase
    .from("cache")
    .select("value")
    .eq("key", key)
    .gt("expires_at", new Date().toISOString())
    .single();
  
  return data?.value || null;
}

export async function setCachedData(key: string, value: any, ttlHours: number = 1): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  
  await supabase
    .from("cache")
    .upsert({ key, value, expires_at: expiresAt });
} 