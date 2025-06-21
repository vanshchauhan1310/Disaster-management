import { logAction } from "../services/helpers";

export const sockets = new Set<any>();

export const websocketHandler = {
  open(ws: any) {
    sockets.add(ws);
    ws.send(JSON.stringify({ 
      type: "connected", 
      message: "Connected to Disaster Response Platform WebSocket",
      timestamp: new Date().toISOString()
    }));
    logAction("websocket_connected", { client_count: sockets.size });
  },
  message(ws: any, message: string | Buffer) {
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
  close(ws: any) {
    sockets.delete(ws);
    logAction("websocket_disconnected", { client_count: sockets.size });
  }
}; 