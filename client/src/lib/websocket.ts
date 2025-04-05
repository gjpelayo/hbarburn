/**
 * WebSocket client for Hedera token redemption app
 */

// Store the WebSocket instance
let socket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds

// Event listeners
type MessageHandler = (data: any) => void;
const messageListeners: MessageHandler[] = [];

/**
 * Initialize the WebSocket connection
 */
export function initializeWebSocket(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        resolve(true);
        return;
      }
      
      // Close any existing socket
      if (socket) {
        socket.close();
      }
      
      // Determine the correct protocol and build WebSocket URL
      // This is critical for compatibility with Replit's environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      socket = new WebSocket(wsUrl);
      
      // Set up event handlers
      socket.onopen = () => {
        console.log('WebSocket connection established');
        reconnectAttempts = 0;
        resolve(true);
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          // Notify all listeners
          messageListeners.forEach(listener => listener(data));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      socket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        
        // Attempt to reconnect if not a deliberate close
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          setTimeout(() => {
            initializeWebSocket()
              .then(() => console.log('WebSocket reconnected successfully'))
              .catch(err => console.error('WebSocket reconnection failed:', err));
          }, RECONNECT_DELAY);
        }
        
        if (reconnectAttempts === 0) {
          // First disconnect, resolve with false
          resolve(false);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (reconnectAttempts === 0) {
          // First error, reject
          reject(error);
        }
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      reject(error);
    }
  });
}

/**
 * Send a message to the server
 */
export function sendMessage(message: any): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('Cannot send message: WebSocket is not connected');
    return false;
  }
  
  try {
    const messageStr = typeof message === 'string' 
      ? message 
      : JSON.stringify(message);
    
    socket.send(messageStr);
    return true;
  } catch (error) {
    console.error('Error sending WebSocket message:', error);
    return false;
  }
}

/**
 * Add a message listener
 */
export function addMessageListener(callback: MessageHandler): void {
  messageListeners.push(callback);
}

/**
 * Remove a message listener
 */
export function removeMessageListener(callback: MessageHandler): void {
  const index = messageListeners.indexOf(callback);
  if (index !== -1) {
    messageListeners.splice(index, 1);
  }
}

/**
 * Close the WebSocket connection
 */
export function closeWebSocket(): void {
  if (socket) {
    // Prevent reconnection attempts by setting reconnectAttempts to max
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
    socket.close();
    socket = null;
  }
}

/**
 * Check if the WebSocket is connected
 */
export function isConnected(): boolean {
  return !!socket && socket.readyState === WebSocket.OPEN;
}

/**
 * Get the current WebSocket connection state
 */
export function getConnectionState(): string {
  if (!socket) return 'CLOSED';
  
  switch (socket.readyState) {
    case WebSocket.CONNECTING:
      return 'CONNECTING';
    case WebSocket.OPEN:
      return 'OPEN';
    case WebSocket.CLOSING:
      return 'CLOSING';
    case WebSocket.CLOSED:
      return 'CLOSED';
    default:
      return 'UNKNOWN';
  }
}