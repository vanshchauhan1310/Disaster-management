import { serve } from "bun";
import { websocketHandler } from "./src/routes/websocket";
import { disasterRouter } from "./src/routes/disasters";
import { toolsRouter } from "./src/routes/tools";

// --- CORS Helper ---
function withCORS(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*'); // Or set to your frontend URL for more security
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  return new Response(response.body, { ...response, headers });
}

const server = serve({
  port: Number(process.env.PORT) || 5000,
  async fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    console.log(`${method} ${path}`);

    // --- CORS preflight ---
    if (req.method === 'OPTIONS') {
      return withCORS(new Response(null, { status: 204 }));
    }

    // --- WebSocket ---
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req);
      if (upgraded) {
        return; // Bun automatically handles the response
      }
      return withCORS(new Response("WebSocket upgrade failed", { status: 400 }));
    }

    // --- API Routes ---
    let response: Response | null = null;
    
    if (path.startsWith("/api/disasters")) {
      response = await disasterRouter(req, path, method);
    } else if (path.startsWith("/api/")) {
      response = await toolsRouter(req, path, method);
    }

    // Return the response if we have one
    if (response) {
      return withCORS(response);
    }

    // --- Not Found ---
    return withCORS(new Response("API endpoint not found", { status: 404 }));
  },
  websocket: websocketHandler,
});

console.log(`Bun server running on http://localhost:${server.port}`);