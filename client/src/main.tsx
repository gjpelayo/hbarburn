import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeWebSocket } from "./lib/websocket";

// Initialize WebSocket connection
initializeWebSocket()
  .then(connected => {
    console.log('WebSocket initialization:', connected ? 'Connected' : 'Failed to connect');
  })
  .catch(error => {
    console.error('WebSocket initialization error:', error);
    // Continue rendering the app even if WebSocket fails
  });

createRoot(document.getElementById("root")!).render(<App />);
