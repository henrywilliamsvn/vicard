// =============================================================================
// analytics.ts — PostHog wiring.
//
// WHY THIS EXISTS ALONGSIDE track.ts
// -----------------------------------------------------------------------------
// track.ts fakes events by pushing virtual paths (/e/answer, /x/shopee) so
// Cloudflare Web Analytics records them as page views. That works for things
// that happen while the user STAYS on the page, but it cannot reliably measure
// an outbound click: on mobile the app navigates away with location.assign()
// and the page unloads before a pushState-based beacon has flushed. Since most
// of the audience is on mobile, the affiliate-click number from Cloudflare is a
// floor, not a count.
//
// PostHog solves that properly — it batches events and flushes them on page
// unload — so it is the source of truth for "did anyone click through".
// Cloudflare stays as a zero-dependency backup.
//
// PRIVACY
// -----------------------------------------------------------------------------
// The cookie banner (CookieConsent.tsx) stores "all" | "essential". We honour it:
//   • "all"        → normal persistence, so returning visitors are recognised
//   • anything else → persistence: "memory", meaning no cookies and no
//                     localStorage. Events still count, but nothing is stored on
//                     the device and nobody is followed between sessions.
// No card numbers, balances, or amounts are ever sent — only which milestone
// happened and which site was clicked.
// =============================================================================

import posthog from "posthog-js";

const PROJECT_TOKEN = "phc_tkWNxjBiypSLsTiNZ4ZUTNYxsSPTAKo72v3pRF865oQG";
const API_HOST = "https://eu.i.posthog.com";
const CONSENT_KEY = "mss_cookie_consent.v1"; // set by CookieConsent.tsx

let ready = false;

function consentGiven(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "all";
  } catch {
    return false;
  }
}

/** Start PostHog. Safe to call more than once; safe if PostHog is unreachable. */
export function initAnalytics(): void {
  if (ready) return;
  try {
    posthog.init(PROJECT_TOKEN, {
      api_host: API_HOST,
      // The app is a single-page app: tab switches and milestone paths are
      // pushState calls, not full page loads.
      capture_pageview: "history_change",
      persistence: consentGiven() ? "localStorage+cookie" : "memory",
      person_profiles: "identified_only",
      autocapture: true,
    });
    ready = true;
  } catch {
    /* analytics must never break the app */
  }
}

/** Fire an event. Silently does nothing if PostHog failed to load. */
export function capture(event: string, props?: Record<string, unknown>): void {
  try {
    if (!ready) return;
    posthog.capture(event, props);
  } catch {
    /* ignore */
  }
}
