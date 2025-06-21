import { serve } from "bun";
import { websocketHandler } from "./src/routes/websocket";
import { disasterRouter } from "./src/routes/disasters";
import { toolsRouter } from "./src/routes/tools";

const server = serve({
  port: Number(process.env.PORT) || 5000,
  async fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    console.log(`${method} ${path}`);

    // --- WebSocket ---
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req);
      if (upgraded) {
        return; // Bun automatically handles the response
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
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
      return response;
    }

    // --- Not Found ---
    return new Response("API endpoint not found", { status: 404 });
  },
  websocket: websocketHandler,
});

console.log(`Bun server running on http://localhost:${server.port}`);