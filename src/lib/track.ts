// =============================================================================
// Lightweight funnel tracking.
//
// TWO MEASUREMENTS, ON PURPOSE
// -----------------------------------------------------------------------------
// 1. PostHog (analytics.ts) — the source of truth. Batches events and flushes
//    them on page unload, so it survives a mobile outbound navigation.
// 2. Cloudflare Web Analytics — a zero-dependency backup. It measures SPA page
//    views by hooking history.pushState, so we turn each milestone into a
//    virtual path and it shows up in the Paths report with no extra scripts and
//    no cookies.
//
//   /            → Buy tab (landing)
//   /wallet      → Wallet tab
//   /rewards     → Rewards tab
//   /deals       → Deals tab
//   /e/answer    → user got a real answer (merchant/store detected or amount entered)
//   /e/pick-cards→ card picker opened
//   /e/cards-saved → user saved cards (activation!)
//   /x/<host>    → user clicked out to an external site (affiliate / bank page)
//
// Milestone events (/e/*) and outbound hosts (/x/*) fire at most once per session.
//
// -----------------------------------------------------------------------------
// WHY THE DELAY BELOW MATTERS (fixed 2 Aug 2026)
// -----------------------------------------------------------------------------
// The original trackEvent() called pushState("/e/answer") and then restored the
// real URL with replaceState() on the very next line. Cloudflare's beacon does
// not read the URL synchronously inside the pushState hook — by the time it
// sampled window.location, the URL had already been put back, so every
// milestone was recorded as a duplicate view of the CURRENT path instead.
//
// Evidence (2 Aug 2026, live test on meosansales.com):
//   • Tab switches use pushState with NO restore  → /wallet, /rewards, /deals
//     all appeared in the Paths report. The beacon works.
//   • Two full answer flows (link pasted + amount entered) → zero /e/answer.
//   The only difference between the two is the immediate replaceState.
//
// Restoring after a delay keeps the address bar clean for the user while giving
// the beacon time to sample the milestone path.
//
// KNOWN LIMIT: /x/* only survives when the outbound link opens in a NEW TAB
// (desktop). On mobile the app navigates away with location.assign(), the page
// unloads, and a pushState-based beacon has no guaranteed flush. That is exactly
// why PostHog is also wired up — treat /x/* as a floor, PostHog as the count.
// =============================================================================

import { capture } from "./analytics";

const fired = new Set<string>();

/** How long the virtual path stays in the address bar before being restored. */
const RESTORE_DELAY_MS = 400;

/** PostHog event name for each funnel milestone. */
const MILESTONE_EVENT: Record<string, string> = {
  answer: "answer_shown",
  "pick-cards": "card_picker_opened",
  "cards-saved": "cards_saved",
};

/** Change the URL so the analytics beacon records a page view. */
export function trackView(path: string, tab?: string): void {
  try {
    if (window.location.pathname === path) return;
    // ⚠️ The tab name is now passed in, not inferred from the path.
    // It used to be `path === "/" ? "buy" : path.slice(1)`, which was true only
    // while "/" meant Mua gì. On 15 Aug 2026 "/" became Xem giá and Mua gì
    // moved to /mua-gi, so the inference started labelling the new landing tab
    // as "buy" and Mua gì as "mua-gi" — every tab_viewed number after the
    // restructure would have been quietly wrong, and wrong in the direction
    // that makes the new front door look like the old one.
    capture("tab_viewed", { tab: tab ?? (path === "/" ? "price" : path.slice(1)) });
    window.history.pushState(null, "", path);
  } catch {
    /* never break the app over analytics */
  }
}

/**
 * Fire a product event EVERY time it happens (unlike trackEvent, which is a
 * once-per-session funnel milestone). Use for repeatable UI actions.
 *
 * Added 15 Aug 2026 to make the restructure measurable. Without these there is
 * no way to tell whether splitting the tabs, the Meo help buttons or the basket
 * advice changed anything — the app would have been rebuilt on a hunch.
 */
export function trackAction(name: string, props?: Record<string, unknown>): void {
  capture(name, props);
}

/** Push a virtual path, then put the real URL back after the beacon has read it. */
function trackVirtualPath(path: string): void {
  try {
    const current = window.location.pathname + window.location.search;
    if (current === path) return;
    window.history.pushState(null, "", path);
    window.setTimeout(() => {
      try {
        // Only restore if nothing else has navigated in the meantime.
        if (window.location.pathname === path) {
          window.history.replaceState(null, "", current);
        }
      } catch {
        /* ignore */
      }
    }, RESTORE_DELAY_MS);
  } catch {
    /* ignore */
  }
}

/** Record a funnel milestone once per session, then restore the current URL. */
export function trackEvent(name: "answer" | "pick-cards" | "cards-saved"): void {
  if (fired.has("e:" + name)) return;
  fired.add("e:" + name);
  capture(MILESTONE_EVENT[name] ?? name);
  trackVirtualPath("/e/" + name);
}

/** Turn a hostname into a short, safe path segment: "app.shopback.com" → "shopback". */
function slugHost(host: string): string {
  return host
    .replace(/^www\./, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Record an outbound click to an external host, once per host per session. */
export function trackOutbound(href: string): void {
  try {
    const url = new URL(href, window.location.href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (url.host === window.location.host) return;
    const key = slugHost(url.host);
    if (!key) return;

    // PostHog gets EVERY click — repeats included — because "how many times did
    // people click through" is the question that decides whether affiliate links
    // are worth keeping. The Cloudflare path is deduped to keep path cardinality
    // low, so it only answers "did anyone at all".
    capture("affiliate_click", { host: url.host, path: url.pathname });

    if (fired.has("x:" + key)) return;
    fired.add("x:" + key);
    trackVirtualPath("/x/" + key);
  } catch {
    /* ignore */
  }
}

/**
 * One document-level listener that catches every outbound <a> click in the app —
 * affiliate links, bank apply buttons, deal links — with no changes needed in
 * any component. Capture phase, so it still fires when a component calls
 * preventDefault() and handles the navigation itself.
 */
export function installOutboundTracking(): void {
  try {
    document.addEventListener(
      "click",
      (ev) => {
        try {
          const target = ev.target as Element | null;
          const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
          if (!anchor) return;
          trackOutbound(anchor.href);
        } catch {
          /* ignore */
        }
      },
      true
    );
  } catch {
    /* ignore */
  }
}

/** Map the path back to a tab on load, so a reload at /wallet lands on Wallet. */
export function tabFromPath(): "price" | "buy" | "wallet" | "rewards" | "deals" {
  try {
    const p = window.location.pathname;
    if (p === "/mua-gi") return "buy";
    if (p === "/wallet") return "wallet";
    if (p === "/rewards") return "rewards";
    if (p === "/deals") return "deals";
  } catch {
    /* ignore */
  }
  // "/" is now Xem giá — the app's front door as of 15 Aug 2026. Mua gì moved
  // to /mua-gi. Anyone with "/" bookmarked lands on the simpler screen, which
  // is the intent, and old /wallet /rewards /deals links are untouched.
  return "price";
}
