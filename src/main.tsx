import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { initAnalytics } from "./lib/analytics";
import { installOutboundTracking } from "./lib/track";
import "./index.css";

// Analytics: PostHog is the source of truth, Cloudflare virtual paths are the
// zero-dependency backup. Both are wrapped in try/catch and cannot break the app.
initAnalytics();
installOutboundTracking();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// Register the service worker for offline + installable (PWA) support.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support unavailable — app still works online */
    });
  });
}
