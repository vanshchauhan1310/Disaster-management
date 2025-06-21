import { createClient } from "@supabase/supabase-js";

// Check if environment variables are set
if (!process.env.SUPABASE_URL) {
  console.error("❌ SUPABASE_URL environment variable is not set");
  console.error("Please create a .env file with your Supabase configuration");
  process.exit(1);
}

if (!process.env.SUPABASE_KEY) {
  console.error("❌ SUPABASE_KEY environment variable is not set");
  console.error("Please create a .env file with your Supabase configuration");
  process.exit(1);
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Test the connection
(async () => {
  try {
    const { error } = await supabase.from("disasters").select("count", { count: "exact", head: true });
    if (error) {
      console.error("❌ Failed to connect to Supabase:", error.message);
      console.error("Please check your Supabase URL and key");
    } else {
      console.log("✅ Successfully connected to Supabase");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Supabase connection test failed:", errorMessage);
  }
})(); 