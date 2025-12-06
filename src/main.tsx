import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error handlers for unhandled errors
window.onerror = (message, source, lineno, colno, error) => {
  console.error("[GlobalError]", {
    message,
    source,
    lineno,
    colno,
    error: error?.stack || error,
  });
  // Prevent the error from being shown in an alert
  return true;
};

window.onunhandledrejection = (event) => {
  console.error("[UnhandledRejection]", {
    reason: event.reason,
    stack: event.reason?.stack,
  });
};

createRoot(document.getElementById("root")!).render(<App />);