import { useState, useEffect, useCallback, useRef } from 'react';
import type { Disaster } from '../../../types';

export function useWebSocket(
  onNewDisaster: (disaster: Disaster) => void,
  onUpdateDisaster: (disaster: Disaster) => void,
  onDeleteDisaster: (id: number) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Start with 1 second
  const isConnectingRef = useRef(false);

  // Use refs to store the latest callback functions
  const onNewDisasterRef = useRef(onNewDisaster);
  const onUpdateDisasterRef = useRef(onUpdateDisaster);
  const onDeleteDisasterRef = useRef(onDeleteDisaster);

  // Update refs when callbacks change
  useEffect(() => {
    onNewDisasterRef.current = onNewDisaster;
    onUpdateDisasterRef.current = onUpdateDisaster;
    onDeleteDisasterRef.current = onDeleteDisaster;
  }, [onNewDisaster, onUpdateDisaster, onDeleteDisaster]);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Add a small delay to prevent rapid connection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      isConnectingRef.current = true;
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Use environment variable or default to Render deployment in production
      const wsUrl = import.meta.env.VITE_WS_URL || 'wss://disaster-management-tj4f.onrender.com/ws';
      // For local development, fallback to window.location.host if on localhost
      const localWsUrl = `${wsProtocol}//${window.location.host}/ws`;
      const finalWsUrl = window.location.hostname === 'localhost' ? localWsUrl : wsUrl;
      
      try {
        const ws = new WebSocket(finalWsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          isConnectingRef.current = false;
          reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message:', data);

            switch (data.type) {
              case 'disaster:new':
                onNewDisasterRef.current(data.data);
                break;
              case 'disaster:update':
                onUpdateDisasterRef.current(data.data);
                break;
              case 'disaster:delete':
                onDeleteDisasterRef.current(data.data);
                break;
              default:
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('WebSocket disconnected', event.code, event.reason);
          setIsConnected(false);
          isConnectingRef.current = false;
          
          // Attempt to reconnect if not a normal closure and we haven't exceeded max attempts
          if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current); // Exponential backoff
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect();
            }, delay);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
          isConnectingRef.current = false;
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setIsConnected(false);
        isConnectingRef.current = false;
      }
    }, 100); // 100ms debounce
  }, []);

  // Initialize connection only once when component mounts
  useEffect(() => {
    connect();

    return () => {
      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Close the WebSocket connection
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
      
      isConnectingRef.current = false;
    };
  }, []); // Empty dependency array - only run once

  const reconnect = useCallback(() => {
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset reconnect attempts
    reconnectAttemptsRef.current = 0;
    
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual reconnect');
      wsRef.current = null;
    }
    
    // Start new connection
    connect();
  }, [connect]);

  return { isConnected, reconnect };
} 