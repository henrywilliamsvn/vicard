// =============================================================================
// Lightweight funnel tracking via the History API.
//
// Cloudflare Web Analytics (automatic setup) measures SPA page views by
// hooking history.pushState. We piggyback on that: each milestone becomes a
// virtual path, so activation/returns show up in the dashboard's Paths report
// with zero extra scripts and zero cookies.
//
//   /            → Buy tab (landing)
//   /wallet      → Wallet tab
//   /rewards     → Rewards tab
//   /deals       → Deals tab
//   /e/answer    → user got a real answer (merchant/store detected or amount entered)
//   /e/pick-cards→ card picker opened
//   /e/cards-saved → user saved cards (activation!)
//
// Milestone events (/e/*) fire at most once per session.
// =============================================================================

const fired = new Set<string>();

/** Change the URL so the analytics beacon records a page view. */
export function trackView(path: string): void {
  try {
    if (window.location.pathname === path) return;
    window.history.pushState(null, "", path);
  } catch {
    /* never break the app over analytics */
  }
}

/** Record a funnel milestone once per session, then restore the current URL. */
export function trackEvent(name: "answer" | "pick-cards" | "cards-saved"): void {
  if (fired.has(name)) return;
  fired.add(name);
  try {
    const current = window.location.pathname + window.location.search;
    window.history.pushState(null, "", "/e/" + name);
    // Restore so the address bar / reload / share links stay clean.
    window.history.replaceState(null, "", current);
  } catch {
    /* ignore */
  }
}

/** Map the path back to a tab on load, so a reload at /wallet lands on Wallet. */
export function tabFromPath(): "buy" | "wallet" | "rewards" | "deals" {
  try {
    const p = window.location.pathname;
    if (p === "/wallet") return "wallet";
    if (p === "/rewards") return "rewards";
    if (p === "/deals") return "deals";
  } catch {
    /* ignore */
  }
  return "buy";
}
