import type { RequestBody } from "../../../types";

// --- Helper: Parse JSON body ---
export async function parseBody(req: Request): Promise<RequestBody> {
  try {
    const body = await req.json();
    return body as RequestBody;
  } catch {
    return {};
  }
}

// --- Helper: Logging ---
export function logAction(action: string, details: Record<string, any>) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), action, ...details }));
}

// --- Helper: Priority Detection ---
export function detectPriority(content: string) {
  const priorityKeywords = ["urgent", "SOS", "help needed", "immediate"];
  return priorityKeywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()));
} 